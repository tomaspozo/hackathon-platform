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
import { format } from 'date-fns'

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  DRAFT: 'outline',
  OPEN: 'secondary',
  STARTED: 'default',
  FINISHED: 'outline',
  CANCELED: 'destructive',
}

export function HackathonSwitcher() {
  const { selectedHackathon, myHackathons, loading, setSelectedHackathon } = useHackathonSwitcher()

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
                <Badge variant={statusColors[hackathon.status] || 'outline'} className="text-xs">
                  {hackathon.status}
                </Badge>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

