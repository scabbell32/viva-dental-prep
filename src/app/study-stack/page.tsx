export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { StudyStackClient } from '@/components/study-stack/study-stack-client'

export default async function StudyStackPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const adminDb = createAdminClient()
  const { data: profile } = await adminDb.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'candidate') redirect('/admin')

  const { data: items } = await supabase
    .from('study_stack_items')
    .select('id, question_id, status, teaching_script, created_at')
    .eq('candidate_id', user.id)
    .order('created_at', { ascending: false })

  // Fetch the full question data for each item
  const questionIds = (items ?? []).map(i => i.question_id)
  const { data: questions } = questionIds.length
    ? await adminDb
        .from('questions')
        .select('id, question_text, question_text_es, option_a, option_b, option_c, option_d, option_a_es, option_b_es, option_c_es, option_d_es, correct_option, explanation, explanation_es')
        .in('id', questionIds)
    : { data: [] }

  const questionMap = Object.fromEntries((questions ?? []).map(q => [q.id, q]))

  const stackItems = (items ?? []).map(item => ({
    ...item,
    question: questionMap[item.question_id] ?? null,
  }))

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0b0f19', color: '#f8fafc', fontFamily: 'var(--font-sans), sans-serif' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1rem', background: 'linear-gradient(135deg, #fff 0%, #a5b4fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Viva Dental Prep
        </span>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <a href="/dashboard" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 500 }}>← Dashboard</a>
          <a href="/quiz" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 500 }}>Quiz</a>
        </div>
      </div>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '2.5rem 1rem' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 800, background: 'linear-gradient(135deg, #fff 0%, #fbbf24 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.35rem', letterSpacing: '-0.02em' }}>
            📚 Study Stack
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '1rem' }}>
            {stackItems.length === 0
              ? 'Aún no tienes preguntas guardadas — marca preguntas durante el quiz.'
              : `${stackItems.length} pregunta${stackItems.length !== 1 ? 's' : ''} guardada${stackItems.length !== 1 ? 's' : ''} para repasar`}
          </p>
        </div>

        {stackItems.length === 0 ? (
          <div style={{ background: 'rgba(20,30,54,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: '3rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📖</div>
            <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: 1.6 }}>
              Después del quiz en español, marca las preguntas que quieres repasar con el botón "Agregar a Study Stack". Las verás aquí con una explicación de audio.
            </p>
            <a href="/quiz" style={{ display: 'inline-flex', marginTop: '1.5rem', padding: '0.875rem 1.75rem', borderRadius: 12, fontFamily: 'var(--font-heading)', fontSize: '0.9rem', fontWeight: 700, textDecoration: 'none', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: '#fff', boxShadow: '0 4px 15px rgba(99,102,241,0.35)' }}>
              Ir al Quiz →
            </a>
          </div>
        ) : (
          <StudyStackClient items={stackItems} />
        )}
      </main>
    </div>
  )
}
