'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function loginAction(_prevState: string | null, formData: FormData): Promise<string | null> {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error) return 'Correo o contraseña incorrectos.'

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 'Error al iniciar sesión.'

  const role = user.user_metadata?.role
  redirect(role === 'admin' ? '/admin' : '/dashboard')
}
