'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

export async function createCandidate(_prevState: string | null, formData: FormData): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'admin') return 'No autorizado.'

  const fullName = formData.get('full_name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const country = formData.get('country') as string
  const englishLevel = formData.get('english_level') as string
  const phone = formData.get('phone') as string

  const adminClient = createAdminClient()

  // Create auth user
  const { data: newUser, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role: 'candidate' },
  })

  if (authError || !newUser.user) return authError?.message ?? 'Error al crear el usuario.'

  // Update profile with country and english_level (trigger creates the base profile)
  await adminClient
    .from('profiles')
    .update({ country: country || null, english_level: englishLevel || null, phone: phone || null })
    .eq('id', newUser.user.id)

  redirect('/admin')
}
