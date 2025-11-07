import { supabase } from './client'
import type { TablesInsert } from './types'

export type CreateTeamInput = Pick<TablesInsert<'teams'>, 'hackathon_id' | 'created_by' | 'name' | 'slug' | 'description'>
export type UpdateTeamInput = Partial<Pick<CreateTeamInput, 'name' | 'slug' | 'description'>>
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

export const listTeamMembers = async (teamId: string) =>
  supabase
    .from('team_members')
    .select('*')
    .eq('team_id', teamId)
    .order('joined_at', { ascending: true })

