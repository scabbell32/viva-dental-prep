import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // PKCE exchange succeeded. Redirect to the target path (e.g. reset-password)
      return NextResponse.redirect(`${origin}${next}`)
    }
    console.error('Error exchanging PKCE code for session:', error)
  }

  // If code exchange fails or is missing, redirect to login page with an error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
