import type React from "react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Spinner } from "@/components/ui/spinner"
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog"
import { LogIn } from "lucide-react"
import { supabase } from "@/lib/supabase"

type LoginFormProps = {
  onAuthSuccess?: () => void
}

export function LoginForm({ onAuthSuccess }: LoginFormProps) {
  const [usePassword, setUsePassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  
  const navigate = useNavigate()

  const handleOAuthLogin = async (provider: "github") => {
    try {
      setLoading(true)
      setError(null)
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      })
      
      if (error) throw error
    } catch (err) {
      console.error(`Error logging in with ${provider}:`, err)
      setError(err instanceof Error ? err.message : `Failed to login with ${provider}`)
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email) {
      setError("Please enter your email")
      return
    }
    
    if (usePassword && !password) {
      setError("Please enter your password")
      return
    }

    try {
      setLoading(true)
      setError(null)
      setSuccess(null)

      if (usePassword) {
        // Login with password
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        
        if (error) throw error
        
        // Close dialog and call success callback
        setOpen(false)
        onAuthSuccess?.()
        navigate("/")
      } else {
        // Send magic link (OTP)
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        })
        
        if (error) throw error
        
        setSuccess("Check your email for the access code!")
        setEmail("")
      }
    } catch (err) {
      console.error("Error during authentication:", err)
      setError(err instanceof Error ? err.message : "Authentication failed")
    } finally {
      setLoading(false)
    }
  }

  const toggleMode = () => {
    setUsePassword(!usePassword)
    setError(null)
    setSuccess(null)
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      // Reset form when dialog closes
      setEmail("")
      setPassword("")
      setError(null)
      setSuccess(null)
      setUsePassword(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="default">
          <LogIn className="mr-2 h-4 w-4" />
          Sign In
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <div className="flex flex-col gap-6">
          <Card className="border-0 shadow-none">
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Welcome back</CardTitle>
              <CardDescription>Login with your Apple or Google account</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordLogin}>
                <FieldGroup>
                  <Field>
                    <Button 
                      variant="outline" 
                      type="button"
                      onClick={() => handleOAuthLogin("github")}
                      disabled={loading}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="h-4 w-4 mr-2"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M12 2C6.477 2 2 6.484 2 12.021c0 4.428 2.865 8.185 6.839 9.504.5.092.682-.217.682-.482 0-.237-.009-.868-.014-1.703-2.782.605-3.369-1.342-3.369-1.342-.454-1.153-1.11-1.461-1.11-1.461-.908-.62.069-.608.069-.608 1.004.07 1.532 1.032 1.532 1.032.892 1.53 2.341 1.088 2.91.833.092-.647.35-1.089.636-1.34-2.22-.253-4.555-1.113-4.555-4.954 0-1.094.39-1.988 1.029-2.688-.104-.254-.446-1.273.098-2.652 0 0 .84-.27 2.75 1.026A9.56 9.56 0 0 1 12 6.844a9.56 9.56 0 0 1 2.504.336c1.909-1.297 2.748-1.026 2.748-1.026.546 1.379.204 2.398.1 2.652.64.7 1.028 1.594 1.028 2.688 0 3.849-2.338 4.698-4.566 4.947.359.31.679.919.679 1.853 0 1.336-.012 2.418-.012 2.747 0 .267.18.577.688.48C19.136 20.203 22 16.447 22 12.021 22 6.484 17.523 2 12 2Z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Login with Github
                    </Button>
                  </Field>
                  
                  <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                    Or continue with
                  </FieldSeparator>

                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {success && (
                    <Alert>
                      <AlertDescription>{success}</AlertDescription>
                    </Alert>
                  )}

                  <Field>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="m@example.com" 
                      required 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                    />
                  </Field>

                  {usePassword && (
                    <Field>
                      <div className="flex items-center">
                        <FieldLabel htmlFor="password">Password</FieldLabel>
                        <a 
                          href="#" 
                          className="ml-auto text-sm underline-offset-4 hover:underline"
                          onClick={(e) => {
                            e.preventDefault()
                            // TODO: Implement forgot password flow
                            alert("Password reset functionality coming soon!")
                          }}
                        >
                          Forgot your password?
                        </a>
                      </div>
                      <Input 
                        id="password" 
                        type="password" 
                        required 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                      />
                    </Field>
                  )}

                  <Field>
                    <Button type="submit" disabled={loading} className="w-full">
                      {loading && <Spinner className="mr-2" />}
                      {usePassword ? "Login with password" : "Send access code"}
                    </Button>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      className="mt-2 w-full" 
                      onClick={toggleMode}
                      disabled={loading}
                    >
                      {usePassword ? "Send access code" : "Use password"}
                    </Button>
                    <FieldDescription className="text-center">
                      Don&apos;t have an account?{" "}
                      <a 
                        href="#" 
                        className="underline-offset-4 hover:underline"
                        onClick={(e) => {
                          e.preventDefault()
                          // TODO: Implement sign up flow
                          alert("Sign up functionality coming soon! For now, use 'Send access code' to create an account.")
                        }}
                      >
                        Sign up
                      </a>
                    </FieldDescription>
                  </Field>
                </FieldGroup>
              </form>
            </CardContent>
          </Card>
          
          <FieldDescription className="px-6 text-center text-xs text-muted-foreground">
            By clicking continue, you agree to our{" "}
            <a href="#" className="underline-offset-4 hover:underline">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="#" className="underline-offset-4 hover:underline">
              Privacy Policy
            </a>
            .
          </FieldDescription>
        </div>
      </DialogContent>
    </Dialog>
  )
}

