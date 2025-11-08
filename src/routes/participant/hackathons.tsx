import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { getOpenHackathons, registerForHackathon, getMyHackathons, checkIfRegistered } from '@/lib/supabase/participants'
import { listHackathonCategories } from '@/lib/supabase/hackathons'
import { useHackathonSwitcher } from '@/hooks/use-hackathon-switcher'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Separator } from '@/components/ui/separator'
import type { Tables } from '@/lib/supabase/types'

type Hackathon = Tables<'hackathons'>
type HackathonWithCategories = Hackathon & { categories?: Array<{ id: string; name: string }> }

export function ParticipantHackathonsPage() {
  const navigate = useNavigate()
  const { refreshHackathons } = useHackathonSwitcher()
  const [openHackathons, setOpenHackathons] = useState<HackathonWithCategories[]>([])
  const [myHackathons, setMyHackathons] = useState<Hackathon[]>([])
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [openResponse, myResponse] = await Promise.all([
      getOpenHackathons(),
      getMyHackathons(),
    ])

    if (openResponse.error) {
      toast.error('Failed to load open hackathons', { description: openResponse.error.message })
      setLoading(false)
      return
    }

    // Load categories for each hackathon
    const hackathonsWithCategories = await Promise.all(
      (openResponse.data || []).map(async (hackathon) => {
        const { data: categories } = await listHackathonCategories(hackathon.id)
        return { ...hackathon, categories: categories || [] }
      })
    )

    setOpenHackathons(hackathonsWithCategories)

    if (myResponse.error) {
      toast.error('Failed to load your hackathons', { description: myResponse.error.message })
    } else {
      const hackathons = (myResponse.data || [])
        .map((participant: any) => participant.hackathons)
        .filter((h: Hackathon | null): h is Hackathon => h !== null)
      setMyHackathons(hackathons)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const handleRegister = async (hackathonId: string) => {
    setRegistering(hackathonId)
    const { error } = await registerForHackathon(hackathonId)
    if (error) {
      toast.error('Failed to register', { description: error.message })
      setRegistering(null)
      return
    }

    toast.success('Successfully registered!')
    await refreshHackathons()
    await loadData()
    setRegistering(null)
    navigate('/team')
  }

  const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    DRAFT: 'outline',
    OPEN: 'secondary',
    STARTED: 'default',
    FINISHED: 'outline',
    CANCELED: 'destructive',
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

  return (
    <section className="container space-y-8 py-10">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Hackathons</h1>
        <p className="text-muted-foreground">
          Browse hackathons you can join and view the ones you've already registered for.
        </p>
      </header>

      {openHackathons.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Available to Join</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {openHackathons.map((hackathon) => (
              <HackathonCard
                key={hackathon.id}
                hackathon={hackathon}
                onRegister={handleRegister}
                registering={registering === hackathon.id}
              />
            ))}
          </div>
        </div>
      )}

      {myHackathons.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">My Hackathons</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {myHackathons.map((hackathon) => (
              <Card key={hackathon.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle>{hackathon.name}</CardTitle>
                      <CardDescription>{hackathon.description}</CardDescription>
                    </div>
                    <Badge variant={statusColors[hackathon.status] || 'outline'}>
                      {hackathon.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Start:</span>{' '}
                      {format(new Date(hackathon.start_at), 'PPp')}
                    </div>
                    <div>
                      <span className="font-medium">End:</span>{' '}
                      {format(new Date(hackathon.end_at), 'PPp')}
                    </div>
                  </div>
                  <Separator />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => navigate('/team')}>
                      View Team
                    </Button>
                    {hackathon.status === 'STARTED' && (
                      <Button onClick={() => navigate('/submission')}>Submit Project</Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {openHackathons.length === 0 && myHackathons.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <p>No hackathons available at the moment.</p>
            <p className="mt-2 text-sm">Check back later for new opportunities!</p>
          </CardContent>
        </Card>
      )}
    </section>
  )
}

function HackathonCard({
  hackathon,
  onRegister,
  registering,
}: {
  hackathon: HackathonWithCategories
  onRegister: (id: string) => void
  registering: boolean
}) {
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null)

  useEffect(() => {
    checkIfRegistered(hackathon.id).then(({ data }) => setIsRegistered(data))
  }, [hackathon.id])

  const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    DRAFT: 'outline',
    OPEN: 'secondary',
    STARTED: 'default',
    FINISHED: 'outline',
    CANCELED: 'destructive',
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle>{hackathon.name}</CardTitle>
            <CardDescription>{hackathon.description}</CardDescription>
          </div>
          <Badge variant={statusColors[hackathon.status] || 'outline'}>
            {hackathon.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm">
          <div>
            <span className="font-medium">Start:</span> {format(new Date(hackathon.start_at), 'PPp')}
          </div>
          <div>
            <span className="font-medium">End:</span> {format(new Date(hackathon.end_at), 'PPp')}
          </div>
          {hackathon.registration_open_at && (
            <div>
              <span className="font-medium">Registration Opens:</span>{' '}
              {format(new Date(hackathon.registration_open_at), 'PPp')}
            </div>
          )}
          {hackathon.registration_close_at && (
            <div>
              <span className="font-medium">Registration Closes:</span>{' '}
              {format(new Date(hackathon.registration_close_at), 'PPp')}
            </div>
          )}
        </div>

        {hackathon.categories && hackathon.categories.length > 0 && (
          <div>
            <div className="mb-2 text-sm font-medium">Categories:</div>
            <div className="flex flex-wrap gap-2">
              {hackathon.categories.map((cat) => (
                <Badge key={cat.id} variant="outline">
                  {cat.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <Separator />

        <div className="flex justify-end">
          {isRegistered === null ? (
            <Spinner className="h-4 w-4" />
          ) : isRegistered ? (
            <Button variant="outline" disabled>
              Already Registered
            </Button>
          ) : (
            <Button onClick={() => onRegister(hackathon.id)} disabled={registering}>
              {registering ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Registering...
                </>
              ) : (
                'Register'
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
