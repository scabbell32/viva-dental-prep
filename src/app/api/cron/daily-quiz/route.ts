import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const FROM_EMAIL = 'Viva Dental Prep <hola@vivadentalprep.com>'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://vivadentalprep.com'

export async function GET(request: NextRequest) {
  // Protect: only allow Vercel cron or a secret header
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    return NextResponse.json({ error: 'Missing RESEND_API_KEY environment variable' }, { status: 500 })
  }
  const resend = new Resend(resendApiKey)

  const adminDb = createAdminClient()

  // Get all candidate profiles
  const { data: profiles, error } = await adminDb
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'candidate')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!profiles?.length) return NextResponse.json({ sent: 0 })

  // Get emails from auth.users for these candidate IDs
  const profileIds = profiles.map(p => p.id)
  const { data: { users: authUsers } } = await adminDb.auth.admin.listUsers({ perPage: 1000 })
  const emailMap = Object.fromEntries(
    (authUsers ?? [])
      .filter(u => profileIds.includes(u.id))
      .map(u => [u.id, u.email])
  )

  const today = new Date()
  const dayName = today.toLocaleDateString('es-ES', { weekday: 'long', timeZone: 'America/Indiana/Indianapolis' })
  const dateStr = today.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', timeZone: 'America/Indiana/Indianapolis' })

  const candidates = profiles
    .map(p => ({ ...p, email: emailMap[p.id] }))
    .filter(c => c.email)

  const results = await Promise.allSettled(
    candidates.map(candidate =>
      resend.emails.send({
        from: FROM_EMAIL,
        to: candidate.email!,
        subject: `📚 Tu práctica de hoy — ${dateStr}`,
        html: buildEmailHtml(candidate.full_name ?? 'Estudiante', dayName, dateStr),
      })
    )
  )

  const sent = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length

  return NextResponse.json({ sent, failed, total: candidates.length })
}

function buildEmailHtml(name: string, dayName: string, dateStr: string) {
  const quizUrl = `${SITE_URL}/quiz`

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tu práctica diaria – Viva Dental Prep</title>
</head>
<body style="margin:0;padding:0;background:#0b0f19;font-family:'Helvetica Neue',Arial,sans-serif;color:#f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#0b0f19;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="100%" style="max-width:560px;background:rgba(20,30,54,0.9);border:1px solid rgba(255,255,255,0.08);border-radius:24px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="padding:36px 40px 0;text-align:center;">
              <div style="font-size:3rem;margin-bottom:12px;">🦷</div>
              <div style="font-size:0.8rem;text-transform:uppercase;letter-spacing:0.1em;color:#6366f1;font-weight:700;margin-bottom:8px;">
                Viva Dental Prep
              </div>
              <h1 style="margin:0 0 8px;font-size:1.8rem;font-weight:800;background:linear-gradient(135deg,#fff 0%,#a5b4fc 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;line-height:1.25;">
                ¡Buenos días, ${name}!
              </h1>
              <p style="margin:0;color:#94a3b8;font-size:1rem;line-height:1.5;">
                ${dayName.charAt(0).toUpperCase() + dayName.slice(1)}, ${dateStr} · Tu sesión de hoy está lista
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:28px 40px;">
              <div style="background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.2);border-radius:16px;padding:20px 24px;margin-bottom:24px;">
                <p style="margin:0 0 8px;font-size:1rem;font-weight:600;color:#c7d2fe;">
                  📋 Cuestionario de hoy
                </p>
                <p style="margin:0;color:#94a3b8;font-size:0.9rem;line-height:1.5;">
                  10–15 preguntas de práctica para el NBDHE seleccionadas de tu plan de estudio.
                  Incluye explicaciones clínicas en español y audio de enseñanza para cada respuesta incorrecta.
                </p>
              </div>

              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td align="center" style="padding:8px 0 24px;">
                    <a href="${quizUrl}" style="display:inline-block;padding:16px 40px;background:linear-gradient(135deg,#6366f1 0%,#4f46e5 100%);color:#fff;text-decoration:none;border-radius:14px;font-weight:700;font-size:1rem;letter-spacing:0.01em;box-shadow:0 4px 15px rgba(99,102,241,0.4);">
                      Comenzar mi práctica →
                    </a>
                  </td>
                </tr>
              </table>

              <div style="border-top:1px solid rgba(255,255,255,0.05);padding-top:20px;">
                <p style="margin:0 0 12px;font-size:0.85rem;font-weight:600;color:#f8fafc;">¿Qué incluye tu sesión?</p>
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                  ${['✅  Preguntas tipo examen NBDHE', '🔊  Audio de enseñanza en español para errores', '📖  Explicaciones clínicas detalladas', '📊  Seguimiento de tu progreso'].map(item => `
                  <tr>
                    <td style="padding:4px 0;font-size:0.875rem;color:#94a3b8;">${item}</td>
                  </tr>`).join('')}
                </table>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 32px;text-align:center;border-top:1px solid rgba(255,255,255,0.05);">
              <p style="margin:0;font-size:0.75rem;color:#475569;line-height:1.5;">
                Recibiste este mensaje porque estás inscrito en Viva Dental Prep.<br>
                <a href="${SITE_URL}" style="color:#6366f1;text-decoration:none;">vivadentalprep.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
