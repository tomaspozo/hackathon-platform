import { useMemo } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { CurrentUserAvatar } from '@/components/auth/current-user-avatar'
import { LoginForm } from '@/components/auth/login-form'
import { HackathonSwitcher } from '@/components/hackathon-switcher'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useProfile } from '@/hooks/use-profile'
import { useSupabase } from '@/hooks/use-supabase'
import { cn } from '@/lib/utils'

type NavigationItem = {
  to: string
  label: string
}

export function RootLayout() {
  const { user, loading: authLoading } = useSupabase()
  const { profile, loading: profileLoading } = useProfile()

  const role = profile?.role ?? 'participant'
  const isLoading = authLoading || profileLoading

  const navigation = useMemo<NavigationItem[]>(() => {
    const items: NavigationItem[] = [{ to: '/', label: 'Home' }]

    if (!user) {
      return items
    }

    if (role === 'admin') {
      items.push(
        { to: '/admin/hackathons', label: 'Manage Hackathons' },
        { to: '/admin/teams', label: 'Manage Teams' },
        { to: '/admin/judges', label: 'Manage Judges' }
      )
    }

    if (role === 'participant') {
      items.push(
        { to: '/hackathons', label: 'Hackathons' },
        { to: '/team', label: 'Team Setup' },
        { to: '/submission', label: 'Submission' }
      )
    }

    if (role === 'judge') {
      items.push({ to: '/judging', label: 'Judging' })
    }

    return items
  }, [role, user])

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky flex justify-center top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="container flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link to="/" className="text-lg font-semibold tracking-tight">
              Hackathon Platform
            </Link>
            {navigation.length > 0 && (
              <nav className="hidden items-center gap-1 sm:flex">
                {navigation.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        'rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors',
                        isActive && 'bg-muted text-foreground shadow-sm'
                      )
                    }
                    end={item.to === '/'}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            )}
          </div>

          <div className="flex items-center gap-3">
            {isLoading ? (
              <Skeleton className="h-9 w-32" />
            ) : user ? (
              <>
                {role === 'participant' && <HackathonSwitcher />}
                <CurrentUserAvatar />
              </>
            ) : (
              <LoginForm />
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 flex justify-center">
        <Outlet />
      </main>
    </div>
  )
}
