import { supabase } from './client'
import type { Tables, TablesInsert } from './types'

type HackathonParticipant = Tables<'hackathon_participants'>
type HackathonParticipantInsert = TablesInsert<'hackathon_participants'>

export const registerForHackathon = async (hackathonId: string) => {
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) {
    return { data: null, error: { message: 'User not authenticated', code: 'UNAUTHENTICATED' } }
  }

  return supabase
    .from('hackathon_participants')
    .insert({
      hackathon_id: hackathonId,
      user_id: user.user.id,
    })
    .select('*')
    .single<HackathonParticipant>()
}

export const getMyHackathons = async () => {
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) {
    return { data: [], error: null }
  }

  return supabase
    .from('hackathon_participants')
    .select(
      `
      *,
      hackathons (
        id,
        name,
        slug,
        description,
        status,
        start_at,
        end_at,
        registration_open_at,
        registration_close_at,
        created_at,
        updated_at
      )
    `
    )
    .eq('user_id', user.user.id)
    .order('registered_at', { ascending: false })
}

export const leaveHackathon = async (hackathonId: string) => {
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) {
    return { data: null, error: { message: 'User not authenticated', code: 'UNAUTHENTICATED' } }
  }

  return supabase
    .from('hackathon_participants')
    .delete()
    .eq('hackathon_id', hackathonId)
    .eq('user_id', user.user.id)
}

export const getOpenHackathons = async () => {
  return supabase
    .from('hackathons')
    .select('*')
    .in('status', ['OPEN', 'STARTED'])
    .order('start_at', { ascending: true })
}

export const checkIfRegistered = async (hackathonId: string) => {
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) {
    return { data: false, error: null }
  }

  const { data, error } = await supabase
    .from('hackathon_participants')
    .select('id')
    .eq('hackathon_id', hackathonId)
    .eq('user_id', user.user.id)
    .maybeSingle()

  return { data: !!data, error }
}

