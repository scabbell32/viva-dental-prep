export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { QuizClient } from '@/components/quiz/quiz-client'
import { buildReviewDeck } from '@/lib/review-deck'
import { getCurrentWeekNumber } from '@/lib/program-week'

export default async function RepasoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const adminDb = createAdminClient()
  const { data: profile } = await adminDb
    .from('profiles')
    .select('role, english_level, spanish_mode')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'candidate') redirect('/admin')

  const weekNumber = getCurrentWeekNumber()
  const { questions, eligibleCount, isMixed } = await buildReviewDeck(user.id, 'nbdhe')

  const darkPage: React.CSSProperties = {
    minHeight: '100vh',
    backgroundColor: '#0b0f19',
    backgroundImage: 'radial-gradient(at 0% 0%, rgba(244,63,94,0.08) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(168,85,247,0.1) 0px, transparent 50%)',
    color: '#f8fafc',
    fontFamily: 'var(--font-sans), sans-serif',
  }

  const card: React.CSSProperties = {
    background: 'rgba(20,30,54,0.8)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 24,
    padding: '2.5rem',
  }

  return (
    <div style={darkPage}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1rem', background: 'linear-gradient(135deg, #fff 0%, #fda4af 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Viva Dental Prep
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <a href="/dashboard" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 500 }}>← Dashboard</a>
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Repaso de Errores
          </span>
        </div>
      </div>

      <main style={{ maxWidth: 680, margin: '0 auto', padding: '2rem 1rem' }}>
        <header style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.25)', borderRadius: 99, padding: '0.3rem 0.9rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f43f5e', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {isMixed ? 'Repaso Mixto' : 'Repaso de Errores'}
            </span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 800, lineHeight: 1.25, background: 'linear-gradient(135deg, #fff 0%, #fda4af 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
            Repaso de Errores
          </h1>
          {eligibleCount > 0 && (
            <p style={{ color: '#94a3b8', fontSize: '1rem', lineHeight: 1.5 }}>
              {eligibleCount > 10 ? `Tienes más de 10 preguntas para repasar` : `Tienes ${eligibleCount} pregunta${eligibleCount !== 1 ? 's' : ''} para repasar`}
              {isMixed && ' — completadas con preguntas de práctica'}
            </p>
          )}
        </header>

        {questions.length === 0 ? (
          <div style={{ ...card, textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✨</div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem' }}>
              Aún no tienes errores para repasar
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '2rem' }}>
              Completa tu quiz semanal primero y las preguntas que falles aparecerán aquí.
            </p>
            <a
              href="/quiz"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.875rem 1.75rem', borderRadius: 12, fontFamily: 'var(--font-heading)', fontSize: '0.95rem', fontWeight: 700, textDecoration: 'none', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: '#fff', boxShadow: '0 4px 15px rgba(99,102,241,0.35)' }}
            >
              Ir al Quiz Semanal →
            </a>
          </div>
        ) : (
          <QuizClient
            questions={questions}
            track="nbdhe"
            weekNumber={weekNumber}
            englishLevel={profile.english_level ?? 'intermediate'}
            spanishMode={profile.spanish_mode ?? false}
            mode="review"
          />
        )}
      </main>
    </div>
  )
}
