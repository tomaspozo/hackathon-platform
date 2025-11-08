import { useHackathonSwitcher } from '@/hooks/use-hackathon-switcher'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

export const getStatusBadgeVariant = (status: string | null) => {
  switch (status) {
    case 'DRAFT':
      return 'outline' // gray
    case 'OPEN':
      return 'outline' // blue - we'll use custom className
    case 'STARTED':
      return 'outline' // green - we'll use custom className
    case 'FINISHED':
      return 'destructive' // red
    case 'CANCELED':
      return 'outline' // slate - we'll use custom className
    default:
      return 'outline'
  }
}

export const getStatusBadgeClassName = (status: string | null) => {
  switch (status) {
    case 'OPEN':
      return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700'
    case 'STARTED':
      return 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-200 dark:border-green-700'
    case 'CANCELED':
      return 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600'
    default:
      return ''
  }
}

export function HackathonSwitcher() {
  const { selectedHackathon, myHackathons, loading, setSelectedHackathon } =
    useHackathonSwitcher()

  if (loading) {
    return <Spinner className="h-4 w-4" />
  }

  if (myHackathons.length === 0) {
    return null
  }

  return (
    <div className="flex items-center gap-2">
      <Select
        value={selectedHackathon?.id || ''}
        onValueChange={(value) => {
          const hackathon = myHackathons.find((h) => h.id === value)
          setSelectedHackathon(hackathon || null)
        }}
      >
        <SelectTrigger className="min-w-[200px]">
          <SelectValue placeholder="Select hackathon" />
        </SelectTrigger>
        <SelectContent>
          {myHackathons.map((hackathon) => (
            <SelectItem key={hackathon.id} value={hackathon.id}>
              <div className="flex items-center gap-2">
                <span className="truncate">{hackathon.name}</span>
                <Badge
                  variant={getStatusBadgeVariant(hackathon.status)}
                  className={cn(getStatusBadgeClassName(hackathon.status))}
                >
                  {hackathon.status || 'DRAFT'}
                </Badge>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
