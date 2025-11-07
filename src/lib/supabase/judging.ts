import { supabase } from './client'
import type { TablesInsert } from './types'

export const listJudgeAssignments = async (hackathonId: string) =>
  supabase
    .from('judge_assignments')
    .select('*')
    .eq('hackathon_id', hackathonId)

export const assignJudgeToTeam = async (input: TablesInsert<'judge_assignments'>) =>
  supabase
    .from('judge_assignments')
    .insert(input)
    .select('*')
    .single()

export const removeJudgeAssignment = async (assignmentId: string) =>
  supabase.from('judge_assignments').delete().eq('id', assignmentId)

export type SubmitScoreInput = Pick<
  TablesInsert<'judging_scores'>,
  'hackathon_id' | 'team_id' | 'judge_id' | 'criterion_id' | 'score' | 'notes'
>

export const upsertJudgingScore = async (input: SubmitScoreInput) =>
  supabase
    .from('judging_scores')
    .upsert(input, { onConflict: 'hackathon_id,team_id,judge_id,criterion_id' })
    .select('*')
    .single()

export const deleteJudgingScore = async (scoreId: string) =>
  supabase.from('judging_scores').delete().eq('id', scoreId)

export const listTeamScores = async (hackathonId: string) =>
  supabase
    .from('team_scores')
    .select('*')
    .eq('hackathon_id', hackathonId)
    .order('total_score', { ascending: false })
