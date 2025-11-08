import { useEffect, useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { format, formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { useHackathonSwitcher } from '@/hooks/use-hackathon-switcher'
import { getMyTeam } from '@/lib/supabase/teams'
import {
  getTeamSubmission,
  createSubmission,
  updateSubmission,
  submitProject,
} from '@/lib/supabase/submissions'
import { listHackathonCategories } from '@/lib/supabase/hackathons'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Tables } from '@/lib/supabase/types'

type Submission = Tables<'project_submissions'>
type Category = Tables<'hackathon_categories'>

type SubmissionFormValues = {
  name: string
  repo_url: string
  demo_url: string
  summary: string
  category_id: string
}

export function ParticipantSubmissionPage() {
  const { selectedHackathon } = useHackathonSwitcher()
  const [team, setTeam] = useState<{ id: string } | null>(null)
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<SubmissionFormValues>({
    defaultValues: {
      name: '',
      repo_url: '',
      demo_url: '',
      summary: '',
      category_id: '',
    },
  })

  const loadData = useCallback(async () => {
    if (!selectedHackathon) {
      setLoading(false)
      return
    }

    setLoading(true)

    // Check if hackathon is STARTED
    if (selectedHackathon.status !== 'STARTED') {
      setLoading(false)
      return
    }

    // Check if within timeframe
    const now = new Date()
    const startAt = new Date(selectedHackathon.start_at)
    const endAt = new Date(selectedHackathon.end_at)

    if (now < startAt || now > endAt) {
      setLoading(false)
      return
    }

    // Load team
    const { data: teamData, error: teamError } = await getMyTeam(selectedHackathon.id)
    if (teamError || !teamData?.teams) {
      toast.error('You must be part of a team to submit', {
        description: 'Please create or join a team first.',
      })
      setLoading(false)
      return
    }

    const teamInfo = teamData.teams as { id: string }
    setTeam(teamInfo)

    // Load categories
    const { data: categoriesData, error: categoriesError } = await listHackathonCategories(
      selectedHackathon.id
    )
    if (categoriesError) {
      toast.error('Failed to load categories', { description: categoriesError.message })
    } else {
      setCategories(categoriesData || [])
    }

    // Load existing submission
    const { data: submissionData, error: submissionError } = await getTeamSubmission(teamInfo.id)
    if (submissionError && submissionError.code !== 'PGRST116') {
      toast.error('Failed to load submission', { description: submissionError.message })
    } else if (submissionData) {
      setSubmission(submissionData)
      form.reset({
        name: submissionData.name,
        repo_url: submissionData.repo_url,
        demo_url: submissionData.demo_url || '',
        summary: submissionData.summary || '',
        category_id: submissionData.category_id,
      })
    }

    setLoading(false)
  }, [selectedHackathon, form])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const canSubmit =
    selectedHackathon?.status === 'STARTED' &&
    selectedHackathon &&
    (() => {
      const now = new Date()
      const startAt = new Date(selectedHackathon.start_at)
      const endAt = new Date(selectedHackathon.end_at)
      return now >= startAt && now <= endAt
    })()

  const handleSave = form.handleSubmit(async (values) => {
    if (!selectedHackathon || !team) return

    setSubmitting(true)

    const submissionData = {
      team_id: team.id,
      hackathon_id: selectedHackathon.id,
      category_id: values.category_id,
      name: values.name,
      repo_url: values.repo_url,
      demo_url: values.demo_url || null,
      summary: values.summary || null,
      status: submission?.status || ('draft' as const),
    }

    const { data, error } = submission
      ? await updateSubmission(submission.id, submissionData)
      : await createSubmission(submissionData)

    if (error) {
      toast.error('Failed to save submission', { description: error.message })
      setSubmitting(false)
      return
    }

    toast.success('Submission saved as draft')
    if (data) {
      setSubmission(data)
    }
    setSubmitting(false)
  })

  const handleSubmit = form.handleSubmit(async (values) => {
    if (!selectedHackathon || !team) return

    if (!window.confirm('Are you sure you want to submit? You can still make changes until the deadline.')) {
      return
    }

    setSubmitting(true)

    const submissionData = {
      team_id: team.id,
      hackathon_id: selectedHackathon.id,
      category_id: values.category_id,
      name: values.name,
      repo_url: values.repo_url,
      demo_url: values.demo_url || null,
      summary: values.summary || null,
      status: 'submitted' as const,
    }

    let result
    if (submission) {
      result = await updateSubmission(submission.id, {
        ...submissionData,
        last_submitted_at: new Date().toISOString(),
      })
    } else {
      result = await createSubmission({
        ...submissionData,
        last_submitted_at: new Date().toISOString(),
      })
    }

    if (result.error) {
      toast.error('Failed to submit', { description: result.error.message })
      setSubmitting(false)
      return
    }

    toast.success('Project submitted successfully!')
    if (result.data) {
      setSubmission(result.data)
    }
    setSubmitting(false)
  })

  if (!selectedHackathon) {
    return (
      <section className="container space-y-4 py-10">
        <Alert>
          <AlertDescription>Please select a hackathon from the switcher above.</AlertDescription>
        </Alert>
      </section>
    )
  }

  if (loading) {
    return (
      <section className="container space-y-4 py-10">
        <div className="flex min-h-[400px] items-center justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      </section>
    )
  }

  if (selectedHackathon.status !== 'STARTED') {
    return (
      <section className="container space-y-4 py-10">
        <Alert>
          <AlertDescription>
            Project submissions are only available for hackathons with status STARTED.
            Current status: <strong>{selectedHackathon.status}</strong>
          </AlertDescription>
        </Alert>
      </section>
    )
  }

  const now = new Date()
  const startAt = new Date(selectedHackathon.start_at)
  const endAt = new Date(selectedHackathon.end_at)
  const isWithinTimeframe = now >= startAt && now <= endAt

  if (!isWithinTimeframe) {
    return (
      <section className="container space-y-4 py-10">
        <Alert>
          <AlertDescription>
            {now < startAt
              ? `Submissions will open on ${format(startAt, 'PPp')}`
              : `Submissions closed on ${format(endAt, 'PPp')}`}
          </AlertDescription>
        </Alert>
      </section>
    )
  }

  if (!team) {
    return (
      <section className="container space-y-4 py-10">
        <Alert>
          <AlertDescription>
            You must be part of a team to submit a project. Please create or join a team first.
          </AlertDescription>
        </Alert>
      </section>
    )
  }

  const timeRemaining = formatDistanceToNow(endAt, { addSuffix: false })

  return (
    <section className="container space-y-8 py-10">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Project Submission</h1>
        <p className="text-muted-foreground">
          Share your project details, repository links, and category selections for{' '}
          <strong>{selectedHackathon.name}</strong>.
        </p>
      </header>

      <Alert>
        <AlertDescription>
          <div className="flex items-center justify-between">
            <span>
              Submission deadline: <strong>{format(endAt, 'PPp')}</strong>
            </span>
            <Badge variant="secondary">Time remaining: {timeRemaining}</Badge>
          </div>
        </AlertDescription>
      </Alert>

      {submission && submission.status === 'submitted' && (
        <Alert>
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>
                <strong>Submitted</strong> on {submission.last_submitted_at && format(new Date(submission.last_submitted_at), 'PPp')}
              </span>
              <Badge variant="default">Submitted</Badge>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
          <CardDescription>
            Fill in your project information. You can save as draft and submit later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
              <FormField
                control={form.control}
                name="name"
                rules={{ required: 'Project name is required' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name</FormLabel>
                    <FormControl>
                      <Input placeholder="My Awesome Project" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category_id"
                rules={{ required: 'Category is required' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="repo_url"
                rules={{
                  required: 'Repository URL is required',
                  pattern: {
                    value: /^https?:\/\/.+/,
                    message: 'Please enter a valid URL',
                  },
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Repository URL</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://github.com/username/repo"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="demo_url"
                rules={{
                  pattern: {
                    value: /^https?:\/\/.+/,
                    message: 'Please enter a valid URL',
                  },
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Demo URL (optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://your-demo.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="summary"
                rules={{ required: 'Project summary is required' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Summary</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={6}
                        placeholder="Describe your project, what problem it solves, and how it works..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSave}
                  disabled={submitting || !canSubmit}
                >
                  {submitting ? <Spinner className="mr-2 h-4 w-4" /> : null}
                  Save Draft
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting || !canSubmit}
                >
                  {submitting ? <Spinner className="mr-2 h-4 w-4" /> : null}
                  {submission?.status === 'submitted' ? 'Update Submission' : 'Submit Project'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </section>
  )
}
