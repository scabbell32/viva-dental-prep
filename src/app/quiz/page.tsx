export const dynamic = 'force-dynamic'

import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { QuizClient } from '@/components/quiz/quiz-client'
import { getCurrentWeekNumber } from '@/lib/program-week'
import { selectQuizQuestions } from '@/lib/quiz-selection'
import type { Track } from '@/types/database'

const SAFE_COLUMNS = 'id, track, week_number, chapter_tag, question_text, option_a, option_b, option_c, option_d, option_e, option_f, difficulty, question_text_es, option_a_es, option_b_es, option_c_es, option_d_es, option_e_es, option_f_es, image_url, image_urls, case_set_id, question_type, sequence_order, lock_option_order, is_legacy, case_set:case_sets(*, images:case_images(*))'

function parseCaseSets(questions: any[]): Record<string, unknown>[] {
  return questions.map(q => {
    const rawCaseSet = q.case_set
    const caseSet = Array.isArray(rawCaseSet) ? rawCaseSet[0] : rawCaseSet
    if (caseSet && Array.isArray(caseSet.images)) {
      caseSet.images = [...caseSet.images].sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0))
    }
    return {
      ...q,
      case_set: caseSet || null
    }
  })
}

async function fetchQuestions(track: Track, week: number): Promise<Record<string, unknown>[]> {
  const adminDb = createAdminClient()

  // Use the admin-curated daily quiz if one is published for today
  const today = new Date().toISOString().slice(0, 10)
  const { data: daily } = await adminDb
    .from('daily_quizzes')
    .select('question_ids')
    .eq('date', today)
    .eq('status', 'published')
    .maybeSingle()

  if (daily?.question_ids?.length) {
    const { data: dailyQs } = await adminDb
      .from('questions')
      .select(SAFE_COLUMNS)
      .in('id', daily.question_ids)
      .eq('is_active', true)
    // Return in the admin's curated order
    const ordered = (daily.question_ids as string[])
      .map((id: string) => dailyQs?.find(q => q.id === id))
      .filter(Boolean)
    return parseCaseSets(ordered) as Record<string, unknown>[]
  }

  // Fallback: random selection
  const { data } = await adminDb
    .from('questions')
    .select(SAFE_COLUMNS)
    .eq('track', track)
    .eq('is_active', true)
    .eq('is_legacy', false) // only new + reviewed-and-cleared questions reach candidates
    .lte('week_number', week)
    .order('week_number', { ascending: false })
    .limit(50)
  const selected = selectQuizQuestions((data ?? []) as { case_set_id?: string | null; sequence_order?: number | null }[], 15)
  return parseCaseSets(selected) as Record<string, unknown>[]
}

export default async function QuizPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const adminDb = createAdminClient()
  const { data: profile } = await adminDb
    .from('profiles')
    .select('role, english_level, full_name, spanish_mode')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'candidate') redirect('/admin')

  const weekNumber = getCurrentWeekNumber()

  // Check if candidate already completed today's quiz for each track
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { data: todayAttempts } = await supabase
    .from('quiz_attempts')
    .select('track')
    .eq('candidate_id', user.id)
    .gte('completed_at', today.toISOString())

  const completedTracks = new Set(todayAttempts?.map(a => a.track) ?? [])

  const nbdheQuestions = await fetchQuestions('nbdhe', weekNumber)

  // Show NBDHE if available and not done today. Otherwise show completed screen.
  const dailyDone = completedTracks.has('nbdhe')
  const activeQuestions = nbdheQuestions
  const noQuestions = activeQuestions.length === 0

  const darkPage: React.CSSProperties = {
    minHeight: '100vh',
    backgroundColor: '#0b0f19',
    backgroundImage: 'radial-gradient(at 0% 0%, rgba(99,102,241,0.12) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(168,85,247,0.12) 0px, transparent 50%)',
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
        <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1rem', background: 'linear-gradient(135deg, #fff 0%, #a5b4fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Viva Dental Prep
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <a href="/dashboard" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 500 }}>← Dashboard</a>
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            NBDHE · Semana {weekNumber}
          </span>
        </div>
      </div>

      <main style={{ maxWidth: 680, margin: '0 auto', padding: '2rem 1rem' }}>
        <header style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 800, lineHeight: 1.25, background: 'linear-gradient(135deg, #fff 0%, #a5b4fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
            Quiz de Hoy
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '1rem', lineHeight: 1.5 }}>
            Preparación NBDHE — Semana {weekNumber}
          </p>
        </header>

        {dailyDone ? (
          <div style={{ ...card, textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 700, color: '#10b981', marginBottom: '0.75rem' }}>
              ¡Examen de hoy completado!
            </h2>
            <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>
              Regresa mañana para tu próxima sesión programada.
            </p>
            <a
              href="/quiz/practice"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.875rem 1.75rem', borderRadius: 12, fontFamily: 'var(--font-heading)', fontSize: '0.95rem', fontWeight: 700, textDecoration: 'none', background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)' }}
            >
              Seguir practicando →
            </a>
          </div>
        ) : noQuestions ? (
          <div style={{ ...card, textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📚</div>
            <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>No hay preguntas programadas para esta semana todavía.</p>
            <a
              href="/quiz/practice"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.875rem 1.75rem', borderRadius: 12, fontFamily: 'var(--font-heading)', fontSize: '0.95rem', fontWeight: 700, textDecoration: 'none', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: '#fff', boxShadow: '0 4px 15px rgba(99,102,241,0.35)' }}
            >
              Ir a Práctica Libre →
            </a>
          </div>
        ) : (
          <QuizClient
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            questions={activeQuestions as any}
            track="nbdhe"
            weekNumber={weekNumber}
            englishLevel={profile.english_level ?? 'intermediate'}
            spanishMode={profile.spanish_mode ?? false}
          />
        )}
      </main>
    </div>
  )
}
