import { supabase } from './client'
import type { TablesInsert } from './types'

export type CreateTeamInput = Pick<TablesInsert<'teams'>, 'hackathon_id' | 'created_by' | 'name'> & {
  slug?: string | null
  description?: string | null
}
export type UpdateTeamInput = Partial<Pick<TablesInsert<'teams'>, 'name' | 'slug' | 'description'>>
export type UpdateTeamMemberInput = Partial<Pick<TablesInsert<'team_members'>, 'is_owner'>>

export const createTeam = async (input: CreateTeamInput) =>
  supabase
    .from('teams')
    .insert(input)
    .select('*')
    .single()

export const updateTeam = async (teamId: string, updates: UpdateTeamInput) =>
  supabase
    .from('teams')
    .update(updates)
    .eq('id', teamId)
    .select('*')
    .single()

export const removeTeam = async (teamId: string) =>
  supabase.from('teams').delete().eq('id', teamId)

export const addTeamMember = async (teamId: string, userId: string, isOwner = false) =>
  supabase
    .from('team_members')
    .insert({ team_id: teamId, user_id: userId, is_owner: isOwner })
    .select('*')
    .single()

export const updateTeamMember = async (
  teamId: string,
  userId: string,
  updates: UpdateTeamMemberInput
) =>
  supabase
    .from('team_members')
    .update(updates)
    .match({ team_id: teamId, user_id: userId })
    .select('*')
    .single()

export const removeTeamMember = async (teamId: string, userId: string) =>
  supabase.from('team_members').delete().match({ team_id: teamId, user_id: userId })

export type UpsertSubmissionInput = Pick<
  TablesInsert<'project_submissions'>,
  'team_id' | 'hackathon_id' | 'category_id' | 'name' | 'repo_url' | 'demo_url' | 'summary' | 'status' | 'last_submitted_at'
>

export const upsertSubmission = async (input: UpsertSubmissionInput) =>
  supabase
    .from('project_submissions')
    .upsert(input, { onConflict: 'team_id' })
    .select('*')
    .single()

export const getTeamSubmission = async (teamId: string) =>
  supabase
    .from('project_submissions')
    .select('*')
    .eq('team_id', teamId)
    .maybeSingle()

export const listTeamMembers = async (teamId: string) => {
  // Get team members
  const { data: members, error } = await supabase
    .from('team_members')
    .select('*')
    .eq('team_id', teamId)
    .order('joined_at', { ascending: true })

  if (error) {
    return { data: null, error }
  }

  if (!members || members.length === 0) {
    return { data: [], error: null }
  }

  // Get profiles for each member
  const userIds = members.map((m) => m.user_id)
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('user_id, first_name, last_name, avatar_url')
    .in('user_id', userIds)

  if (profilesError) {
    return { data: members, error: null } // Return members without profile info
  }

  // Merge members with profiles
  const membersWithProfiles = members.map((member) => {
    const profile = profiles?.find((p) => p.user_id === member.user_id)
    return {
      ...member,
      profiles: profile
        ? {
            user_id: profile.user_id,
            full_name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown',
            avatar_url: profile.avatar_url,
          }
        : null,
    }
  })

  return { data: membersWithProfiles, error: null }
}

export const getMyTeam = async (hackathonId: string) => {
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) {
    return { data: null, error: { message: 'User not authenticated', code: 'UNAUTHENTICATED' } }
  }

  return supabase
    .from('team_members')
    .select(
      `
      team_id,
      teams:team_id (
        id,
        hackathon_id,
        name,
        slug,
        description,
        created_at,
        updated_at
      )
    `
    )
    .eq('user_id', user.user.id)
    .eq('teams.hackathon_id', hackathonId)
    .maybeSingle()
}

export const getTeamById = async (teamId: string) =>
  supabase
    .from('teams')
    .select('*')
    .eq('id', teamId)
    .maybeSingle()

export const leaveTeam = async (teamId: string) => {
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) {
    return { data: null, error: { message: 'User not authenticated', code: 'UNAUTHENTICATED' } }
  }

  return supabase.from('team_members').delete().match({ team_id: teamId, user_id: user.user.id })
}

// Team invite functions
export const inviteTeamMember = async (teamId: string, email: string) => {
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) {
    return { data: null, error: { message: 'User not authenticated', code: 'UNAUTHENTICATED' } }
  }

  // Check if user exists
  const { data: existingUser } = await supabase
    .from('profiles')
    .select('id, user_id')
    .eq('email', email)
    .maybeSingle()

  return supabase
    .from('team_invites')
    .insert({
      team_id: teamId,
      inviter_id: user.user.id,
      invitee_email: email,
      invitee_user_id: existingUser?.user_id || null,
    })
    .select('*')
    .single()
}

export const getTeamInvites = async (teamId: string) =>
  supabase
    .from('team_invites')
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })

export const getMyInvites = async () => {
  const { data: user } = await supabase.auth.getUser()
  if (!user.user?.email) {
    return { data: [], error: null }
  }

  return supabase
    .from('team_invites')
    .select(
      `
      *,
      teams:team_id (
        id,
        name,
        hackathon_id,
        hackathons:hackathon_id (
          id,
          name,
          status
        )
      )
    `
    )
    .or(`invitee_email.eq.${user.user.email},invitee_user_id.eq.${user.user.id}`)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
}

export const respondToInvite = async (inviteId: string, accept: boolean) => {
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) {
    return { data: null, error: { message: 'User not authenticated', code: 'UNAUTHENTICATED' } }
  }

  // Get the invite
  const { data: invite, error: inviteError } = await supabase
    .from('team_invites')
    .select('*, teams:team_id(*)')
    .eq('id', inviteId)
    .maybeSingle()

  if (inviteError || !invite) {
    return { data: null, error: inviteError || { message: 'Invite not found' } }
  }

  // Update invite status
  const status = accept ? 'accepted' : 'rejected'
  const { error: updateError } = await supabase
    .from('team_invites')
    .update({ status, invitee_user_id: user.user.id })
    .eq('id', inviteId)

  if (updateError) {
    return { data: null, error: updateError }
  }

  // If accepted, add user to team
  if (accept) {
    const { error: addError } = await addTeamMember(invite.team_id, user.user.id, false)
    if (addError) {
      return { data: null, error: addError }
    }
  }

  return { data: { success: true }, error: null }
}

export const getInviteByToken = async (token: string) =>
  supabase
    .from('team_invites')
    .select(
      `
      *,
      teams:team_id (
        id,
        name,
        hackathon_id,
        hackathons:hackathon_id (
          id,
          name,
          status
        )
      )
    `
    )
    .eq('token', token)
    .maybeSingle()

