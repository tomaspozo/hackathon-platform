import { ProfileForm } from '@/components/profile/profile-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function ProfilePage() {
  return (
    <section className="container max-w-4xl space-y-8 py-10">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Profile Settings</h1>
        <p className="text-muted-foreground">
          Manage your account information and preferences.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>
            Update your profile details and avatar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm />
        </CardContent>
      </Card>
    </section>
  )
}

