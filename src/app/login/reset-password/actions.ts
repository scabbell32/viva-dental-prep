'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function resetPasswordAction(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!password || password.length < 6) {
    return { error: 'La contraseña debe tener al menos 6 caracteres. / Password must be at least 6 characters.' }
  }

  if (password !== confirmPassword) {
    return { error: 'Las contraseñas no coinciden. / Passwords do not match.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({
    password,
  })

  if (error) {
    console.error('Error updating password:', error)
    return { error: 'Error: ' + error.message }
  }

  // User is successfully authenticated via the callback route, so redirect directly to dashboard
  redirect('/dashboard')
}
