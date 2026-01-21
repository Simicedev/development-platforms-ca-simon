import supabase from "../utils/supabase"
import type { User } from "@supabase/supabase-js"

export type AuthState = {
  isAuthenticated: boolean
  user: User | null
}

export async function checkAuth(): Promise<AuthState> {
  const { data, error } = await supabase.auth.getSession()
  if (error) {
    return { isAuthenticated: false, user: null }
  }
  const user = data.session?.user ?? null
  return { isAuthenticated: !!user, user }
}

export async function logout(): Promise<void> {
  await supabase.auth.signOut()
}

export async function login(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password })
}

export async function register(email: string, password: string) {
  const redirectTo = (import.meta as any)?.env?.VITE_EMAIL_REDIRECT_TO || window.location.origin
  return supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: redirectTo }
  })
}
