import { supabase } from './client'
import type { Tables, TablesInsert, TablesUpdate } from './types'

type Hackathon = Tables<'hackathons'>
type HackathonInsert = TablesInsert<'hackathons'>
type HackathonUpdate = TablesUpdate<'hackathons'>
type Category = Tables<'hackathon_categories'>
type CategoryInsert = TablesInsert<'hackathon_categories'>
type CategoryUpdate = TablesUpdate<'hackathon_categories'>
type Criterion = Tables<'judging_criteria'>
type CriterionInsert = TablesInsert<'judging_criteria'>
type CriterionUpdate = TablesUpdate<'judging_criteria'>

export const listHackathons = async () => supabase.from('hackathons').select('*').order('created_at', { ascending: false })

export const getHackathonById = async (id: string) =>
  supabase.from('hackathons').select('*').eq('id', id).maybeSingle()

export const getActiveHackathon = async () =>
  supabase
    .from('hackathons')
    .select('*')
    .eq('is_active', true)
    .maybeSingle<Hackathon>()

export const createHackathon = async (input: HackathonInsert) =>
  supabase
    .from('hackathons')
    .insert(input)
    .select('*')
    .single<Hackathon>()

export const updateHackathon = async (id: string, input: HackathonUpdate) =>
  supabase
    .from('hackathons')
    .update(input)
    .eq('id', id)
    .select('*')
    .single<Hackathon>()

export const deleteHackathon = async (id: string) => supabase.from('hackathons').delete().eq('id', id)

export const setActiveHackathon = async (id: string) => {
  const reset = await supabase
    .from('hackathons')
    .update({ is_active: false })
    .neq('id', id)

  if (reset.error) return reset

  return supabase
    .from('hackathons')
    .update({ is_active: true })
    .eq('id', id)
    .select('*')
    .single<Hackathon>()
}

export const listHackathonCategories = async (hackathonId: string) =>
  supabase
    .from('hackathon_categories')
    .select('*')
    .eq('hackathon_id', hackathonId)
    .order('display_order', { ascending: true })

export const createHackathonCategory = async (input: CategoryInsert) =>
  supabase
    .from('hackathon_categories')
    .insert(input)
    .select('*')
    .single<Category>()

export const updateHackathonCategory = async (id: string, input: CategoryUpdate) =>
  supabase
    .from('hackathon_categories')
    .update(input)
    .eq('id', id)
    .select('*')
    .single<Category>()

export const deleteHackathonCategory = async (id: string) =>
  supabase.from('hackathon_categories').delete().eq('id', id)

export const listJudgingCriteria = async (hackathonId: string) =>
  supabase
    .from('judging_criteria')
    .select('*')
    .eq('hackathon_id', hackathonId)
    .order('display_order', { ascending: true })

export const createJudgingCriterion = async (input: CriterionInsert) =>
  supabase
    .from('judging_criteria')
    .insert(input)
    .select('*')
    .single<Criterion>()

export const updateJudgingCriterion = async (id: string, input: CriterionUpdate) =>
  supabase
    .from('judging_criteria')
    .update(input)
    .eq('id', id)
    .select('*')
    .single<Criterion>()

export const deleteJudgingCriterion = async (id: string) =>
  supabase.from('judging_criteria').delete().eq('id', id)

