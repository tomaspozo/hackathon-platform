import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { Spinner } from '@/components/ui/spinner'
import type { Profile } from '@/hooks/use-profile'
import { useProfile } from '@/hooks/use-profile'
import { useSupabase } from '@/hooks/use-supabase'

type RequireRoleProps = {
  allowedRoles: Profile['role'][]
  children: ReactNode
}

export function RequireRole({ allowedRoles, children }: RequireRoleProps) {
  const { user, loading: authLoading } = useSupabase()
  const { profile, loading: profileLoading } = useProfile()

  if (authLoading || profileLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/" replace />
  }

  const role = profile?.role ?? 'participant'

  if (!allowedRoles.includes(role)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}


