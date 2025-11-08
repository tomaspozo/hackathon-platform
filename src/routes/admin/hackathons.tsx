import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { toast } from 'sonner'
import {
  createHackathon,
  deleteHackathon,
  listHackathonCategories,
  listHackathons,
  setActiveHackathon,
} from '@/lib/supabase/hackathons'
import type { Tables } from '@/lib/supabase/types'
import { generateSlug } from '@/lib/utils'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import {
  getStatusBadgeClassName,
  getStatusBadgeVariant,
} from '@/components/hackathon-switcher'

type Hackathon = Tables<'hackathons'>
type Category = Tables<'hackathon_categories'>

type HackathonWithCategories = Hackathon & {
  categories?: Category[]
}

type CreateHackathonFormValues = {
  name: string
  slug: string
}

export function AdminHackathonsPage() {
  const navigate = useNavigate()
  const [hackathons, setHackathons] = useState<HackathonWithCategories[]>([])
  const [loading, setLoading] = useState(true)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [hackathonToDelete, setHackathonToDelete] = useState<Hackathon | null>(
    null
  )
  const [deleteSlugInput, setDeleteSlugInput] = useState('')

  const createForm = useForm<CreateHackathonFormValues>({
    defaultValues: {
      name: '',
      slug: '',
    },
  })

  const watchedName = createForm.watch('name')

  // Auto-generate slug when name changes
  useEffect(() => {
    if (watchedName && createModalOpen) {
      const generatedSlug = generateSlug(watchedName)
      createForm.setValue('slug', generatedSlug)
    }
  }, [watchedName, createModalOpen, createForm])

  const loadHackathons = useCallback(async () => {
    setLoading(true)
    const { data, error } = await listHackathons()
    if (error) {
      toast.error('Failed to load hackathons', { description: error.message })
      setLoading(false)
      return
    }

    // Load categories for each hackathon
    const hackathonsWithCategories = await Promise.all(
      (data || []).map(async (hackathon) => {
        const { data: categories } = await listHackathonCategories(hackathon.id)
        return { ...hackathon, categories: categories || [] }
      })
    )

    setHackathons(hackathonsWithCategories)
    setLoading(false)
  }, [])

  useEffect(() => {
    void loadHackathons()
  }, [loadHackathons])

  const handleCreateSubmit = createForm.handleSubmit(async (values) => {
    if (!values.name || !values.slug) {
      toast.error('Name and slug are required')
      return
    }

    // Set default dates: start now, end 24 hours later (to satisfy start_at < end_at constraint)
    const startDate = new Date()
    const endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000) // 24 hours later

    const { data, error } = await createHackathon({
      name: values.name,
      slug: values.slug,
      status: 'DRAFT',
      start_at: startDate.toISOString(),
      end_at: endDate.toISOString(),
    })

    if (error) {
      toast.error('Failed to create hackathon', { description: error.message })
      return
    }

    toast.success('Hackathon created successfully')
    setCreateModalOpen(false)
    createForm.reset()
    await loadHackathons()
    if (data?.id) {
      navigate(`/admin/hackathons/${data.id}`)
    }
  })

  const handleGenerateSlug = () => {
    const name = createForm.getValues('name')
    if (name) {
      const generatedSlug = generateSlug(name)
      createForm.setValue('slug', generatedSlug)
    }
  }

  const handleDeleteClick = (hackathon: Hackathon) => {
    setHackathonToDelete(hackathon)
    setDeleteSlugInput('')
    setDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!hackathonToDelete) return

    if (deleteSlugInput !== hackathonToDelete.slug) {
      toast.error(
        'Slug does not match. Please type the hackathon slug to confirm deletion.'
      )
      return
    }

    const { error } = await deleteHackathon(hackathonToDelete.id)
    if (error) {
      toast.error('Failed to delete hackathon', { description: error.message })
      return
    }

    toast.success('Hackathon deleted')
    setDeleteModalOpen(false)
    setHackathonToDelete(null)
    setDeleteSlugInput('')
    await loadHackathons()
  }

  const handleActivateHackathon = async (hackathon: Hackathon) => {
    const { error } = await setActiveHackathon(hackathon.id)
    if (error) {
      toast.error('Failed to activate hackathon', {
        description: error.message,
      })
      return
    }
    toast.success(`"${hackathon.name}" is now active`)
    await loadHackathons()
  }

  return (
    <section className="container space-y-8 py-10">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Manage Hackathons
          </h1>
          <p className="text-muted-foreground">
            Create events, configure categories and judging criteria, and
            activate the hackathon participants will see.
          </p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)} variant="secondary">
          New Hackathon
        </Button>
      </header>

      {loading ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      ) : hackathons.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            <p className="text-center text-sm text-muted-foreground">
              No hackathons yet. Create one to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {hackathons.map((hackathon) => (
            <Card key={hackathon.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-lg">{hackathon.name}</CardTitle>
                    <CardDescription className="text-xs">
                      {hackathon.slug}
                    </CardDescription>
                  </div>
                  <Badge
                    variant={getStatusBadgeVariant(hackathon.status)}
                    className={cn(getStatusBadgeClassName(hackathon.status))}
                  >
                    {hackathon.status || 'DRAFT'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(hackathon.start_at), 'PP')} &ndash;{' '}
                    {format(new Date(hackathon.end_at), 'PP')}
                  </p>
                  {hackathon.description && (
                    <p className="text-sm line-clamp-2">
                      {hackathon.description}
                    </p>
                  )}
                </div>

                {hackathon.categories && hackathon.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {hackathon.categories.map((category) => (
                      <Badge
                        key={category.id}
                        variant="outline"
                        className="text-xs"
                      >
                        {category.name}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      navigate(`/admin/hackathons/${hackathon.id}`)
                    }
                    className="flex-1"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleActivateHackathon(hackathon)}
                    disabled={hackathon.is_active}
                    className="flex-1"
                  >
                    Activate
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive flex-1"
                    onClick={() => handleDeleteClick(hackathon)}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Hackathon</DialogTitle>
            <DialogDescription>
              Enter a name and slug for the new hackathon. You can continue
              editing details after creation.
            </DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <FormField
                control={createForm.control}
                name="name"
                rules={{ required: 'Name is required' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Hackathon name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="slug"
                rules={{ required: 'Slug is required' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input placeholder="unique-slug" {...field} />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleGenerateSlug}
                        disabled={createForm.getFieldState('name').invalid}
                      >
                        Generate
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Create</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <AlertDialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Hackathon</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              hackathon <strong>&quot;{hackathonToDelete?.name}&quot;</strong>{' '}
              and all associated data.
              <br />
              <br />
              Please type the hackathon slug{' '}
              <strong>&quot;{hackathonToDelete?.slug}&quot;</strong> to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              placeholder="Enter hackathon slug"
              value={deleteSlugInput}
              onChange={(e) => setDeleteSlugInput(e.target.value)}
              className="w-full"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteSlugInput('')}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteSlugInput !== hackathonToDelete?.slug}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
