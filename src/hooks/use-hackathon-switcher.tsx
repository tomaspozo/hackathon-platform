import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { getMyHackathons } from '@/lib/supabase/participants'
import { getActiveHackathon } from '@/lib/supabase/hackathons'
import type { Tables } from '@/lib/supabase/types'
import { toast } from 'sonner'

type Hackathon = Tables<'hackathons'>

type HackathonSwitcherContextType = {
  selectedHackathon: Hackathon | null
  myHackathons: Hackathon[]
  loading: boolean
  setSelectedHackathon: (hackathon: Hackathon | null) => void
  refreshHackathons: () => Promise<void>
}

const HackathonSwitcherContext = createContext<HackathonSwitcherContextType | undefined>(undefined)

export function HackathonSwitcherProvider({ children }: { children: ReactNode }) {
  const [selectedHackathon, setSelectedHackathon] = useState<Hackathon | null>(null)
  const [myHackathons, setMyHackathons] = useState<Hackathon[]>([])
  const [loading, setLoading] = useState(true)

  const refreshHackathons = useCallback(async () => {
    setLoading(true)
    const { data, error } = await getMyHackathons()
    if (error) {
      toast.error('Failed to load hackathons', { description: error.message })
      setLoading(false)
      return
    }

    // Extract hackathons from the nested structure
    const hackathons = (data || [])
      .map((participant: any) => participant.hackathons)
      .filter((h: Hackathon | null): h is Hackathon => h !== null)

    setMyHackathons(hackathons)

    // Set default selected hackathon
    if (!selectedHackathon) {
      // Try to find active/current hackathon first
      const activeHackathon = hackathons.find((h) => h.status === 'STARTED' || h.status === 'OPEN')
      if (activeHackathon) {
        setSelectedHackathon(activeHackathon)
      } else if (hackathons.length > 0) {
        // Otherwise use the first one
        setSelectedHackathon(hackathons[0])
      } else {
        // Try to get the active hackathon from all hackathons
        const { data: activeData } = await getActiveHackathon()
        if (activeData) {
          setSelectedHackathon(activeData)
        }
      }
    } else {
      // Update selected hackathon if it exists in the list
      const updated = hackathons.find((h) => h.id === selectedHackathon.id)
      if (updated) {
        setSelectedHackathon(updated)
      }
    }

    setLoading(false)
  }, [selectedHackathon])

  useEffect(() => {
    void refreshHackathons()
  }, []) // Only run on mount

  return (
    <HackathonSwitcherContext.Provider
      value={{
        selectedHackathon,
        myHackathons,
        loading,
        setSelectedHackathon,
        refreshHackathons,
      }}
    >
      {children}
    </HackathonSwitcherContext.Provider>
  )
}

export function useHackathonSwitcher() {
  const context = useContext(HackathonSwitcherContext)
  if (context === undefined) {
    throw new Error('useHackathonSwitcher must be used within a HackathonSwitcherProvider')
  }
  return context
}

