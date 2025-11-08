import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'
import {
  createHackathonCategory,
  createJudgingCriterion,
  deleteHackathonCategory,
  deleteJudgingCriterion,
  getHackathonById,
  listHackathonCategories,
  listJudgingCriteria,
  updateHackathon,
  updateHackathonCategory,
  updateJudgingCriterion,
} from '@/lib/supabase/hackathons'
import type { Tables } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

const DATE_INPUT_FORMAT = "yyyy-MM-dd'T'HH:mm"

type Hackathon = Tables<'hackathons'>
type Category = Tables<'hackathon_categories'>
type Criterion = Tables<'judging_criteria'>

type HackathonFormValues = {
  name: string
  slug: string
  description: string
  start_at: string
  end_at: string
  registration_open_at: string
  registration_close_at: string
  status: 'DRAFT' | 'OPEN' | 'STARTED' | 'FINISHED' | 'CANCELED'
}

type CategoryFormValues = {
  id: string | null
  name: string
  description: string
  display_order: number
}

type CriterionFormValues = {
  id: string | null
  name: string
  description: string
  display_order: number
  weight: number
}

const emptyCategoryForm: CategoryFormValues = {
  id: null,
  name: '',
  description: '',
  display_order: 0,
}

const emptyCriterionForm: CriterionFormValues = {
  id: null,
  name: '',
  description: '',
  display_order: 0,
  weight: 10,
}

const toDateInputValue = (value: string | null) => {
  if (!value) return ''
  try {
    const parsed = typeof value === 'string' ? parseISO(value) : new Date(value)
    return format(parsed, DATE_INPUT_FORMAT)
  } catch (error) {
    console.warn('Failed to parse date', error)
    return ''
  }
}

const toRequiredIsoString = (value: string) => new Date(value).toISOString()

const toOptionalIsoString = (value: string) => (value ? new Date(value).toISOString() : null)

export function AdminHackathonsEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [hackathon, setHackathon] = useState<Hackathon | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [criteria, setCriteria] = useState<Criterion[]>([])
  const [loading, setLoading] = useState(true)
  const [section, setSection] = useState<'categories' | 'criteria'>('categories')

  const hackathonForm = useForm<HackathonFormValues>({
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      start_at: '',
      end_at: '',
      registration_open_at: '',
      registration_close_at: '',
      status: 'DRAFT',
    },
  })

  const categoryForm = useForm<CategoryFormValues>({ defaultValues: emptyCategoryForm })
  const criterionForm = useForm<CriterionFormValues>({ defaultValues: emptyCriterionForm })

  const loadHackathon = useCallback(async () => {
    if (!id) return

    setLoading(true)
    const { data, error } = await getHackathonById(id)
    if (error) {
      toast.error('Failed to load hackathon', { description: error.message })
      setLoading(false)
      navigate('/admin/hackathons')
      return
    }
    if (!data) {
      toast.error('Hackathon not found')
      setLoading(false)
      navigate('/admin/hackathons')
      return
    }

    setHackathon(data)
    hackathonForm.reset({
      name: data.name,
      slug: data.slug,
      description: data.description ?? '',
      start_at: toDateInputValue(data.start_at),
      end_at: toDateInputValue(data.end_at),
      registration_open_at: toDateInputValue(data.registration_open_at),
      registration_close_at: toDateInputValue(data.registration_close_at),
      status: (data.status as HackathonFormValues['status']) || 'DRAFT',
    })
    setLoading(false)
  }, [id, navigate, hackathonForm])

  const loadHackathonDetails = useCallback(
    async (hackathonId: string) => {
      const [categoriesResponse, criteriaResponse] = await Promise.all([
        listHackathonCategories(hackathonId),
        listJudgingCriteria(hackathonId),
      ])

      if (categoriesResponse.error) {
        toast.error('Failed to load categories', { description: categoriesResponse.error.message })
      }
      if (criteriaResponse.error) {
        toast.error('Failed to load judging criteria', {
          description: criteriaResponse.error.message,
        })
      }

      setCategories(categoriesResponse.data ?? [])
      setCriteria(criteriaResponse.data ?? [])
    },
    []
  )

  useEffect(() => {
    void loadHackathon()
  }, [loadHackathon])

  useEffect(() => {
    if (!id) return
    void loadHackathonDetails(id)
  }, [id, loadHackathonDetails])

  const handleHackathonSubmit = hackathonForm.handleSubmit(async (values) => {
    if (!id || !hackathon) return

    if (!values.start_at || !values.end_at) {
      toast.error('Start and end dates are required')
      return
    }

    const payload = {
      name: values.name,
      slug: values.slug,
      description: values.description || null,
      start_at: toRequiredIsoString(values.start_at),
      end_at: toRequiredIsoString(values.end_at),
      registration_open_at: toOptionalIsoString(values.registration_open_at),
      registration_close_at: toOptionalIsoString(values.registration_close_at),
      status: values.status,
    }

    const { data, error } = await updateHackathon(id, payload)
    if (error) {
      toast.error('Failed to update hackathon', { description: error.message })
      return
    }

    toast.success('Hackathon updated successfully')
    if (data) {
      setHackathon(data)
    }
  })

  const handleCategorySubmit = categoryForm.handleSubmit(async (values) => {
    if (!id) return

    const payload = {
      hackathon_id: id,
      name: values.name,
      description: values.description || null,
      display_order: Number(values.display_order ?? 0),
    }

    const isEditing = Boolean(values.id)
    const action = isEditing
      ? updateHackathonCategory(values.id!, payload)
      : createHackathonCategory(payload)

    const { error } = await action
    if (error) {
      toast.error('Failed to save category', { description: error.message })
      return
    }

    toast.success(`Category ${isEditing ? 'updated' : 'added'} successfully`)
    categoryForm.reset(emptyCategoryForm)
    await loadHackathonDetails(id)
  })

  const handleEditCategory = (category: Category) => {
    categoryForm.reset({
      id: category.id,
      name: category.name,
      description: category.description ?? '',
      display_order: category.display_order ?? 0,
    })
  }

  const handleDeleteCategory = async (category: Category) => {
    if (!id) return
    if (!window.confirm(`Delete category "${category.name}"?`)) return

    const { error } = await deleteHackathonCategory(category.id)
    if (error) {
      toast.error('Failed to delete category', { description: error.message })
      return
    }

    toast.success('Category deleted')
    await loadHackathonDetails(id)
  }

  const handleCriterionSubmit = criterionForm.handleSubmit(async (values) => {
    if (!id) return

    const payload = {
      hackathon_id: id,
      name: values.name,
      description: values.description || null,
      display_order: Number(values.display_order ?? 0),
      weight: Number(values.weight ?? 0),
    }

    const isEditing = Boolean(values.id)
    const action = isEditing
      ? updateJudgingCriterion(values.id!, payload)
      : createJudgingCriterion(payload)

    const { error } = await action
    if (error) {
      toast.error('Failed to save judging criterion', { description: error.message })
      return
    }

    toast.success(`Judging criterion ${isEditing ? 'updated' : 'added'} successfully`)
    criterionForm.reset(emptyCriterionForm)
    await loadHackathonDetails(id)
  })

  const handleEditCriterion = (criterion: Criterion) => {
    criterionForm.reset({
      id: criterion.id,
      name: criterion.name,
      description: criterion.description ?? '',
      display_order: criterion.display_order ?? 0,
      weight: Number(criterion.weight ?? 0),
    })
  }

  const handleDeleteCriterion = async (criterion: Criterion) => {
    if (!id) return
    if (!window.confirm(`Delete judging criterion "${criterion.name}"?`)) return

    const { error } = await deleteJudgingCriterion(criterion.id)
    if (error) {
      toast.error('Failed to delete judging criterion', { description: error.message })
      return
    }

    toast.success('Judging criterion deleted')
    await loadHackathonDetails(id)
  }

  if (loading) {
    return (
      <section className="container space-y-8 py-10">
        <div className="flex min-h-[400px] items-center justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      </section>
    )
  }

  if (!hackathon) {
    return null
  }

  return (
    <section className="container space-y-8 py-10">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin/hackathons">Admin</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin/hackathons">Hackathons</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{hackathon.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Edit Hackathon</h1>
          <p className="text-muted-foreground">
            Update schedule and metadata for this hackathon.
          </p>
        </div>
        <Button onClick={() => navigate('/admin/hackathons')} variant="outline">
          Back to List
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Hackathon Details</CardTitle>
          <CardDescription>Update schedule and metadata for the hackathon.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...hackathonForm}>
            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleHackathonSubmit}>
              <FormField
                control={hackathonForm.control}
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
                control={hackathonForm.control}
                name="slug"
                rules={{ required: 'Slug is required' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl>
                      <Input placeholder="unique-slug" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={hackathonForm.control}
                name="start_at"
                rules={{ required: 'Start date is required' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={hackathonForm.control}
                name="end_at"
                rules={{ required: 'End date is required' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={hackathonForm.control}
                name="registration_open_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Registration Opens</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={hackathonForm.control}
                name="registration_close_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Registration Closes</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={hackathonForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea rows={3} placeholder="Overview, goals, or logistics" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={hackathonForm.control}
                name="status"
                rules={{ required: 'Status is required' }}
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="DRAFT">DRAFT</SelectItem>
                        <SelectItem value="OPEN">OPEN</SelectItem>
                        <SelectItem value="STARTED">STARTED</SelectItem>
                        <SelectItem value="FINISHED">FINISHED</SelectItem>
                        <SelectItem value="CANCELED">CANCELED</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="md:col-span-2 flex justify-end gap-2">
                <Button type="submit">Update Hackathon</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-2">
          <CardTitle>Hackathon Configuration</CardTitle>
          <CardDescription>
            Manage categories and judging criteria for this hackathon.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={section} onValueChange={(value) => setSection(value as typeof section)}>
            <TabsList>
              <TabsTrigger value="categories">Categories</TabsTrigger>
              <TabsTrigger value="criteria">Judging Criteria</TabsTrigger>
            </TabsList>
            <TabsContent value="categories" className="space-y-6 pt-4">
              <Form {...categoryForm}>
                <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCategorySubmit}>
                  <FormField
                    control={categoryForm.control}
                    name="name"
                    rules={{ required: 'Category name is required' }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="AI & Machine Learning" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={categoryForm.control}
                    name="display_order"
                    rules={{ required: true, min: { value: 0, message: 'Order must be >= 0' } }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display order</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            {...field}
                            onChange={(event) => field.onChange(Number(event.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={categoryForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea rows={2} placeholder="Optional description" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="md:col-span-2 flex justify-end gap-2">
                    {categoryForm.watch('id') && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => categoryForm.reset(emptyCategoryForm)}
                      >
                        Cancel edit
                      </Button>
                    )}
                    <Button type="submit">
                      {categoryForm.watch('id') ? 'Update category' : 'Add category'}
                    </Button>
                  </div>
                </form>
              </Form>

              <Separator />

              {categories.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No categories yet. Add a category to help participants choose how to compete.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell className="font-medium">{category.name}</TableCell>
                        <TableCell>{category.display_order}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-sm truncate">
                          {category.description ?? '—'}
                        </TableCell>
                        <TableCell className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEditCategory(category)}>
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteCategory(category)}
                          >
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
            <TabsContent value="criteria" className="space-y-6 pt-4">
              <Form {...criterionForm}>
                <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCriterionSubmit}>
                  <FormField
                    control={criterionForm.control}
                    name="name"
                    rules={{ required: 'Criterion name is required' }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Innovation" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={criterionForm.control}
                    name="weight"
                    rules={{
                      required: true,
                      min: { value: 1, message: 'Weight must be >= 1%' },
                      max: { value: 100, message: 'Weight must be <= 100%' },
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Weight (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={100}
                            {...field}
                            onChange={(event) => field.onChange(Number(event.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={criterionForm.control}
                    name="display_order"
                    rules={{ required: true, min: { value: 0, message: 'Order must be >= 0' } }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display order</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            {...field}
                            onChange={(event) => field.onChange(Number(event.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={criterionForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea rows={2} placeholder="Optional judging guidance" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="md:col-span-2 flex justify-end gap-2">
                    {criterionForm.watch('id') && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => criterionForm.reset(emptyCriterionForm)}
                      >
                        Cancel edit
                      </Button>
                    )}
                    <Button type="submit">
                      {criterionForm.watch('id') ? 'Update criterion' : 'Add criterion'}
                    </Button>
                  </div>
                </form>
              </Form>

              <Separator />

              {criteria.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No judging criteria yet. Define how judges should evaluate the projects.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Weight</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {criteria.map((criterion) => (
                      <TableRow key={criterion.id}>
                        <TableCell className="font-medium">{criterion.name}</TableCell>
                        <TableCell>{criterion.weight}%</TableCell>
                        <TableCell>{criterion.display_order}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-sm truncate">
                          {criterion.description ?? '—'}
                        </TableCell>
                        <TableCell className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEditCriterion(criterion)}>
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteCriterion(criterion)}
                          >
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </section>
  )
}

