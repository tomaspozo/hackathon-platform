import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import type { Tables } from '@/lib/supabase/types'
import {
  getActiveHackathon,
  listHackathonCategories,
  listJudgingCriteria,
} from '@/lib/supabase/hackathons'
import { useSupabase } from '@/hooks/use-supabase'
import { useProfile } from '@/hooks/use-profile'
import {
  getStatusBadgeClassName,
  getStatusBadgeVariant,
} from '@/components/hackathon-switcher'
import { cn } from '@/lib/utils'

type Hackathon = Tables<'hackathons'>
type HackathonCategory = Tables<'hackathon_categories'>
type JudgingCriterion = Tables<'judging_criteria'>

type Cta = {
  to: string
  label: string
  variant?: 'default' | 'outline' | 'secondary'
}

export function LandingPage() {
  const { user } = useSupabase()
  const { profile } = useProfile()
  const role = profile?.role ?? 'participant'

  const [hackathon, setHackathon] = useState<Hackathon | null>(null)
  const [categories, setCategories] = useState<HackathonCategory[]>([])
  const [criteria, setCriteria] = useState<JudgingCriterion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const fetchHackathon = async () => {
      setLoading(true)
      setError(null)

      try {
        const { data: activeHackathon, error: activeError } =
          await getActiveHackathon()

        if (activeError) {
          throw activeError
        }

        if (!activeHackathon) {
          if (isMounted) {
            setHackathon(null)
            setCategories([])
            setCriteria([])
          }
          return
        }

        const [categoriesResponse, criteriaResponse] = await Promise.all([
          listHackathonCategories(activeHackathon.id),
          listJudgingCriteria(activeHackathon.id),
        ])

        if (categoriesResponse.error) throw categoriesResponse.error
        if (criteriaResponse.error) throw criteriaResponse.error

        if (!isMounted) return

        setHackathon(activeHackathon)
        setCategories(categoriesResponse.data ?? [])
        setCriteria(criteriaResponse.data ?? [])
      } catch (err) {
        if (!isMounted) return
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load hackathon information.'
        )
        setHackathon(null)
        setCategories([])
        setCriteria([])
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    void fetchHackathon()

    return () => {
      isMounted = false
    }
  }, [])

  const callsToAction = useMemo<Cta[]>(() => {
    if (!user || !hackathon) {
      return []
    }

    if (role === 'admin') {
      return [
        { to: '/admin/hackathons', label: 'Manage Hackathon' },
        { to: '/admin/teams', label: 'Review Teams', variant: 'outline' },
        { to: '/admin/judges', label: 'Review Judges', variant: 'outline' },
      ]
    }

    if (role === 'participant') {
      return [
        { to: '/hackathons', label: 'Join Hackathon' },
        { to: '/team', label: 'Set Up Team', variant: 'outline' },
        { to: '/submission', label: 'Manage Submission', variant: 'outline' },
      ]
    }

    if (role === 'judge') {
      return [{ to: '/judging', label: 'Open Judging Dashboard' }]
    }

    return []
  }, [hackathon, role, user])

  const renderDate = (value: string | null | undefined) => {
    if (!value) return 'TBA'
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) {
      return 'TBA'
    }
    return format(parsed, 'PPpp')
  }

  return (
    <section className="container space-y-8 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Welcome to the Hackathon Platform
        </h1>
        <p className="text-muted-foreground">
          Track the current event, manage your teams, and stay on top of
          judging.
        </p>
      </header>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Spinner className="h-6 w-6" />
        </div>
      ) : error ? (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive">
              Something went wrong
            </CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="outline" onClick={() => location.reload()}>
              Try again
            </Button>
          </CardFooter>
        </Card>
      ) : hackathon ? (
        <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
          <Card>
            <CardHeader className="gap-3">
              <div className="flex items-center gap-2">
                <Badge
                  variant={getStatusBadgeVariant(hackathon.status)}
                  className={cn(getStatusBadgeClassName(hackathon.status))}
                >
                  {hackathon.status || 'DRAFT'}
                </Badge>
              </div>
              <CardTitle className="text-2xl">{hackathon.name}</CardTitle>
              {hackathon.description && (
                <CardDescription>{hackathon.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Registration window
                  </h3>
                  <p className="text-sm">
                    {renderDate(hackathon.registration_open_at)} &mdash;{' '}
                    {renderDate(hackathon.registration_close_at)}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Hackathon window
                  </h3>
                  <p className="text-sm">
                    {renderDate(hackathon.start_at)} &mdash;{' '}
                    {renderDate(hackathon.end_at)}
                  </p>
                </div>
              </div>

              {categories.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Categories
                  </h3>
                  <ul className="space-y-2">
                    {categories.map((category) => (
                      <li
                        key={category.id}
                        className="rounded-lg border border-border/60 bg-muted/30 p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{category.name}</span>
                          <Badge variant="outline">
                            #{category.display_order + 1}
                          </Badge>
                        </div>
                        {category.description && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {category.description}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
            {callsToAction.length > 0 && (
              <>
                <Separator />
                <CardFooter className="flex flex-wrap gap-2">
                  {callsToAction.map((action) => (
                    <Button
                      key={action.to}
                      asChild
                      variant={action.variant ?? 'default'}
                      className="gap-2"
                    >
                      <Link to={action.to}>{action.label}</Link>
                    </Button>
                  ))}
                </CardFooter>
              </>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Judging Criteria</CardTitle>
              <CardDescription>
                Judges score each team using the weighted criteria below.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {criteria.length > 0 ? (
                <ul className="space-y-3">
                  {criteria.map((criterion) => (
                    <li
                      key={criterion.id}
                      className="rounded-lg border border-border/60 bg-muted/30 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium">{criterion.name}</span>
                        <Badge variant="secondary">{criterion.weight}%</Badge>
                      </div>
                      {criterion.description && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {criterion.description}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Judging criteria will be announced soon. Stay tuned!
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>No active hackathon right now</CardTitle>
            <CardDescription>
              Check back later or, if you&apos;re an admin, launch the next
              event to get things started.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            {role === 'admin' ? (
              <Button asChild>
                <Link to="/admin/hackathons">Create a new hackathon</Link>
              </Button>
            ) : (
              <Button asChild variant="outline">
                <Link to="/">Refresh</Link>
              </Button>
            )}
          </CardFooter>
        </Card>
      )}
    </section>
  )
}
