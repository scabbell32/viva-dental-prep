'use server'

import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

export async function forgotPasswordAction(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const email = formData.get('email') as string
  if (!email) {
    return { error: 'Por favor, ingrese un correo válido. / Please enter a valid email.' }
  }

  const supabase = await createClient()
  const headerList = await headers()
  const host = headerList.get('host')
  const protocol = host?.includes('localhost') ? 'http' : 'https'
  const origin = `${protocol}://${host}`
  const redirectTo = `${origin}/api/auth/callback?next=/login/reset-password`

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  })

  if (error) {
    console.error('Password reset error:', error)
    return { error: 'Error: ' + error.message }
  }

  return { success: true }
}
