import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { template, candidateIds } = await req.json().catch(() => ({})) as {
    template?: string
    candidateIds?: string[]
  }

  if (!template || !candidateIds || candidateIds.length === 0) {
    return NextResponse.json({ error: 'Falta la plantilla o la lista de candidatos' }, { status: 400 })
  }

  // Load Twilio credentials
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = process.env.TWILIO_FROM_NUMBER || process.env.TWILIO_PHONE_NUMBER

  if (!accountSid || !authToken || !fromNumber) {
    return NextResponse.json(
      {
        error: 'Las credenciales de Twilio no están configuradas en .env.local. Por favor agregue TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN y TWILIO_FROM_NUMBER.',
      },
      { status: 501 }
    )
  }

  const adminDb = createAdminClient()
  const { data: profiles } = await adminDb
    .from('profiles')
    .select('id, full_name, phone')
    .in('id', candidateIds)

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ error: 'No se encontraron candidatos seleccionados' }, { status: 404 })
  }

  const host = req.headers.get('host')
  const protocol = host?.includes('localhost') ? 'http' : 'https'
  const siteUrl = `${protocol}://${host}`

  const results: { name: string; phone: string; status: 'success' | 'failed'; error?: string }[] = []

  for (const p of profiles) {
    if (!p.phone) {
      results.push({ name: p.full_name, phone: '', status: 'failed', error: 'Sin teléfono almacenado' })
      continue
    }

    let cleanPhone = p.phone.trim().replace(/[\s\-()]/g, '')
    if (!cleanPhone.startsWith('+')) {
      cleanPhone = `+${cleanPhone}`
    }

    // Replace template tags
    const bodyText = template
      .replace(/{nombre}/g, p.full_name)
      .replace(/{name}/g, p.full_name)
      .replace(/{link}/g, `${siteUrl}/quiz`)

    const isWhatsApp = fromNumber.startsWith('whatsapp:')
    const toField = isWhatsApp ? `whatsapp:${cleanPhone}` : cleanPhone
    const fromField = fromNumber

    try {
      const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64')
      const twilioParams = new URLSearchParams()
      twilioParams.append('From', fromField)
      twilioParams.append('To', toField)
      twilioParams.append('Body', bodyText)

      const twilioRes = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${auth}`,
          },
          body: twilioParams.toString(),
        }
      )

      const responseData = await twilioRes.json()
      if (twilioRes.ok) {
        results.push({ name: p.full_name, phone: cleanPhone, status: 'success' })
      } else {
        console.error('Twilio message failed:', responseData)
        results.push({
          name: p.full_name,
          phone: cleanPhone,
          status: 'failed',
          error: responseData.message || `Twilio HTTP ${twilioRes.status}`,
        })
      }
    } catch (err: any) {
      console.error('Network error calling Twilio:', err)
      results.push({
        name: p.full_name,
        phone: cleanPhone,
        status: 'failed',
        error: err.message || 'Error de red',
      })
    }
  }

  return NextResponse.json({ results })
}
