import { ThemeProvider } from './theme-provider'
import { SupabaseProvider } from './supabase-provider'
import { ProfileProvider } from './profile-provider'
import { HackathonSwitcherProvider } from '@/hooks/use-hackathon-switcher'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <SupabaseProvider>
        <ProfileProvider>
          <HackathonSwitcherProvider>{children}</HackathonSwitcherProvider>
        </ProfileProvider>
      </SupabaseProvider>
    </ThemeProvider>
  )
}
