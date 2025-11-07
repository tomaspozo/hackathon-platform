import { supabase } from './client'

export const getActiveHackathon = async () =>
  supabase
    .from('hackathons')
    .select('*')
    .eq('is_active', true)
    .maybeSingle()

export const listHackathonCategories = async (hackathonId: string) =>
  supabase
    .from('hackathon_categories')
    .select('*')
    .eq('hackathon_id', hackathonId)
    .order('display_order', { ascending: true })

export const listJudgingCriteria = async (hackathonId: string) =>
  supabase
    .from('judging_criteria')
    .select('*')
    .eq('hackathon_id', hackathonId)
    .order('display_order', { ascending: true })

