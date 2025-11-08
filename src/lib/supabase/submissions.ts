import { supabase } from './client'
import type { Tables, TablesInsert, TablesUpdate } from './types'

type Submission = Tables<'project_submissions'>
type SubmissionInsert = TablesInsert<'project_submissions'>
type SubmissionUpdate = TablesUpdate<'project_submissions'>

export const getTeamSubmission = async (teamId: string) =>
  supabase
    .from('project_submissions')
    .select(
      `
      *,
      categories:category_id (
        id,
        name,
        description
      ),
      teams:team_id (
        id,
        name
      )
    `
    )
    .eq('team_id', teamId)
    .maybeSingle<Submission>()

export const createSubmission = async (input: SubmissionInsert) =>
  supabase
    .from('project_submissions')
    .insert(input)
    .select('*')
    .single<Submission>()

export const updateSubmission = async (submissionId: string, updates: SubmissionUpdate) =>
  supabase
    .from('project_submissions')
    .update(updates)
    .eq('id', submissionId)
    .select('*')
    .single<Submission>()

export const submitProject = async (submissionId: string) =>
  supabase
    .from('project_submissions')
    .update({
      status: 'submitted',
      last_submitted_at: new Date().toISOString(),
    })
    .eq('id', submissionId)
    .select('*')
    .single<Submission>()

export const getSubmissionById = async (submissionId: string) =>
  supabase
    .from('project_submissions')
    .select(
      `
      *,
      categories:category_id (
        id,
        name,
        description
      ),
      teams:team_id (
        id,
        name,
        hackathon_id
      ),
      hackathons:hackathon_id (
        id,
        name,
        status,
        start_at,
        end_at
      )
    `
    )
    .eq('id', submissionId)
    .maybeSingle<Submission>()

