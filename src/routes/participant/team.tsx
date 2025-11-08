import { useEffect, useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { useHackathonSwitcher } from '@/hooks/use-hackathon-switcher'
import {
  getMyTeam,
  createTeam,
  updateTeam,
  leaveTeam,
  removeTeam,
  listTeamMembers,
  inviteTeamMember,
  getTeamInvites,
  respondToInvite,
  getMyInvites,
} from '@/lib/supabase/teams'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { Tables } from '@/lib/supabase/types'

type Team = Tables<'teams'>
type TeamMember = Tables<'team_members'> & {
  profiles?: { full_name: string | null; avatar_url: string | null }
}
type TeamInvite = Tables<'team_invites'>

type TeamFormValues = {
  name: string
}

export function ParticipantTeamPage() {
  const { selectedHackathon } = useHackathonSwitcher()
  const [team, setTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [invites, setInvites] = useState<TeamInvite[]>([])
  const [myInvites, setMyInvites] = useState<TeamInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [isOwner, setIsOwner] = useState(false)

  const form = useForm<TeamFormValues>({
    defaultValues: {
      name: '',
    },
  })

  const loadTeamData = useCallback(async () => {
    if (!selectedHackathon) {
      setLoading(false)
      return
    }

    setLoading(true)
    const { data: teamData, error: teamError } = await getMyTeam(
      selectedHackathon.id
    )

    if (teamError && teamError.code !== 'PGRST116') {
      toast.error('Failed to load team', { description: teamError.message })
      setLoading(false)
      return
    }

    if (teamData?.teams) {
      const teamInfo = teamData.teams as Team
      setTeam(teamInfo)

      // Load members
      const { data: membersData, error: membersError } = await listTeamMembers(
        teamInfo.id
      )
      if (membersError) {
        toast.error('Failed to load team members', {
          description: membersError.message,
        })
      } else {
        setMembers(membersData || [])
        // Check if current user is owner
        const { data: user } = await supabase.auth.getUser()
        const owner = membersData?.find(
          (m) => m.is_owner && m.user_id === user.user?.id
        )
        const userIsOwner = !!owner
        setIsOwner(userIsOwner)

        // Load invites if owner
        if (userIsOwner) {
          const { data: invitesData, error: invitesError } =
            await getTeamInvites(teamInfo.id)
          if (invitesError) {
            toast.error('Failed to load invites', {
              description: invitesError.message,
            })
          } else {
            setInvites(invitesData || [])
          }
        }
      }
    } else {
      setTeam(null)
      setMembers([])
      setIsOwner(false)
    }

    // Load my invites
    const { data: myInvitesData, error: myInvitesError } = await getMyInvites()
    if (myInvitesError) {
      toast.error('Failed to load your invites', {
        description: myInvitesError.message,
      })
    } else {
      setMyInvites(myInvitesData || [])
    }

    setLoading(false)
  }, [selectedHackathon, isOwner])

  useEffect(() => {
    void loadTeamData()
  }, [loadTeamData])

  const canManageTeam =
    selectedHackathon?.status === 'OPEN' ||
    selectedHackathon?.status === 'STARTED'

  const handleCreateTeam = form.handleSubmit(async (values) => {
    if (!selectedHackathon) {
      toast.error('Please select a hackathon first')
      return
    }

    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      toast.error('You must be logged in')
      return
    }

    // Generate slug from name
    const slug = values.name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')

    const { data, error } = await createTeam({
      hackathon_id: selectedHackathon.id,
      created_by: user.user.id,
      name: values.name,
      slug,
      description: null,
    })

    if (error) {
      toast.error('Failed to create team', { description: error.message })
      return
    }

    // Add creator as owner
    if (data) {
      const { error: addError } = await supabase
        .from('team_members')
        .insert({ team_id: data.id, user_id: user.user.id, is_owner: true })

      if (addError) {
        toast.error('Failed to add yourself to team', {
          description: addError.message,
        })
        return
      }
    }

    toast.success('Team created successfully!')
    form.reset()
    await loadTeamData()
  })

  const handleUpdateTeam = form.handleSubmit(async (values) => {
    if (!team) return

    const slug = values.name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')

    const { error } = await updateTeam(team.id, {
      name: values.name,
      slug,
      description: null,
    })

    if (error) {
      toast.error('Failed to update team', { description: error.message })
      return
    }

    toast.success('Team updated successfully!')
    await loadTeamData()
  })

  const handleLeaveTeam = async () => {
    if (!team) return

    if (!window.confirm('Are you sure you want to leave this team?')) {
      return
    }

    const { error } = await leaveTeam(team.id)
    if (error) {
      toast.error('Failed to leave team', { description: error.message })
      return
    }

    toast.success('Left team successfully')
    await loadTeamData()
  }

  const handleDeleteTeam = async () => {
    if (!team) return

    if (
      !window.confirm(
        'Are you sure you want to delete this team? This action cannot be undone.'
      )
    ) {
      return
    }

    const { error } = await removeTeam(team.id)
    if (error) {
      toast.error('Failed to delete team', { description: error.message })
      return
    }

    toast.success('Team deleted successfully')
    await loadTeamData()
  }

  const handleInvite = async (email: string) => {
    if (!team) return

    const { error } = await inviteTeamMember(team.id, email)
    if (error) {
      toast.error('Failed to send invite', { description: error.message })
      return
    }

    toast.success('Invite sent!')
    await loadTeamData()
  }

  const handleRespondToInvite = async (inviteId: string, accept: boolean) => {
    const { error } = await respondToInvite(inviteId, accept)
    if (error) {
      toast.error(`Failed to ${accept ? 'accept' : 'reject'} invite`, {
        description: error.message,
      })
      return
    }

    toast.success(`Invite ${accept ? 'accepted' : 'rejected'}`)
    await loadTeamData()
  }

  if (!selectedHackathon) {
    return (
      <section className="container space-y-4 py-10">
        <Alert>
          <AlertDescription>
            Please select a hackathon from the switcher above.
          </AlertDescription>
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

  return (
    <section className="container space-y-8 py-10">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Team Setup</h1>
        <p className="text-muted-foreground">
          Form your team, invite collaborators, and manage your roster for{' '}
          <strong>{selectedHackathon.name}</strong>.
        </p>
      </header>

      {!canManageTeam && (
        <Alert>
          <AlertDescription>
            Team management is only available for hackathons with status OPEN or
            STARTED. Current status: <strong>{selectedHackathon.status}</strong>
          </AlertDescription>
        </Alert>
      )}

      {/* My Invites */}
      {myInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invites</CardTitle>
            <CardDescription>
              You have been invited to join these teams
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team</TableHead>
                  <TableHead>Hackathon</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myInvites.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell className="font-medium">
                      {(invite as any).teams?.name || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      {(invite as any).teams?.hackathons?.name || 'Unknown'}
                    </TableCell>
                    <TableCell className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRespondToInvite(invite.id, false)}
                      >
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleRespondToInvite(invite.id, true)}
                      >
                        Accept
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {team ? (
        <>
          {/* Team Info */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{team.name}</CardTitle>
                  <CardDescription>{team.description}</CardDescription>
                </div>
                {isOwner && canManageTeam && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      form.reset({
                        name: team.name,
                      })
                    }}
                  >
                    Edit Team
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isOwner && canManageTeam && form.watch('name') && (
                <Form {...form}>
                  <form onSubmit={handleUpdateTeam} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      rules={{ required: 'Team name is required' }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Team Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => form.reset({ name: '' })}
                      >
                        Cancel
                      </Button>
                      <Button type="submit">Update Team</Button>
                    </div>
                  </form>
                </Form>
              )}

              <Separator />

              {/* Team Members */}
              <div>
                <h3 className="mb-4 text-lg font-semibold">Team Members</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((member) => (
                      <TableRow key={`${member.team_id}-${member.user_id}`}>
                        <TableCell className="font-medium">
                          {member.profiles?.full_name || 'Unknown'}
                        </TableCell>
                        <TableCell>
                          {member.is_owner ? (
                            <Badge variant="default">Owner</Badge>
                          ) : (
                            <Badge variant="outline">Member</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(member.joined_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Invite Members */}
              {isOwner && canManageTeam && <InviteForm onInvite={handleInvite} />}

              {/* Pending Invites */}
              {isOwner && invites.length > 0 && (
                <div>
                  <h3 className="mb-4 text-lg font-semibold">
                    Pending Invites
                  </h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Sent</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invites.map((invite) => (
                        <TableRow key={invite.id}>
                          <TableCell>{invite.invitee_email}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                invite.status === 'pending'
                                  ? 'secondary'
                                  : 'outline'
                              }
                            >
                              {invite.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(invite.created_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <Separator />

              <div className="flex flex-col items-end gap-2">
                {members.length === 1 && isOwner ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      You are the only member. Delete the team or invite others.
                    </p>
                    <Button variant="destructive" onClick={handleDeleteTeam}>
                      Delete Team
                    </Button>
                  </>
                ) : (
                  <Button variant="destructive" onClick={handleLeaveTeam}>
                    Leave Team
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Create a Team</CardTitle>
            <CardDescription>
              Start by creating a team for this hackathon. You can invite others
              later.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {canManageTeam ? (
              <Form {...form}>
                <form onSubmit={handleCreateTeam} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    rules={{ required: 'Team name is required' }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Team Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Awesome Team" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end">
                    <Button type="submit">Create Team</Button>
                  </div>
                </form>
              </Form>
            ) : (
              <Alert>
                <AlertDescription>
                  You cannot create a team for a hackathon with status{' '}
                  <strong>{selectedHackathon.status}</strong>. Teams can only be
                  created when the hackathon is OPEN or STARTED.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </section>
  )
}

function InviteForm({ onInvite }: { onInvite: (email: string) => void }) {
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setSending(true)
    await onInvite(email)
    setEmail('')
    setSending(false)
  }

  return (
    <div>
      <h3 className="mb-4 text-lg font-semibold">Invite Team Members</h3>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="email"
          placeholder="email@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={sending}
          className="flex-1"
        />
        <Button type="submit" disabled={sending || !email}>
          {sending ? <Spinner className="h-4 w-4" /> : 'Send Invite'}
        </Button>
      </form>
    </div>
  )
}
