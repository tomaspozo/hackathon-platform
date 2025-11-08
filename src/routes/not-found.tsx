import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <section className="container flex flex-col items-center justify-center space-y-4 py-24 text-center">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          404
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
        <p className="max-w-md text-muted-foreground">
          The page you were looking for doesn&apos;t exist. Return home to continue exploring the
          hackathon platform.
        </p>
      </div>
      <Button asChild>
        <Link to="/">Back to home</Link>
      </Button>
    </section>
  )
}


