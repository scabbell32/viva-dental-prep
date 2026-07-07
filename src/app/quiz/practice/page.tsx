export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import type { SafeQuestion } from '@/types/database'
import { QuizClient } from '@/components/quiz/quiz-client'
import { getCurrentWeekNumber } from '@/lib/program-week'

const SAFE_COLUMNS = 'id, track, week_number, chapter_tag, question_text, option_a, option_b, option_c, option_d, option_e, option_f, difficulty, question_text_es, option_a_es, option_b_es, option_c_es, option_d_es, option_e_es, option_f_es, image_url, image_urls, case_set_id, question_type, sequence_order, lock_option_order, is_legacy, case_set:case_sets(*, images:case_images(*))'

function parseCaseSets(questions: any[]): any[] {
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

async function fetchPracticeQuestions() {
  const adminDb = createAdminClient()
  const { data } = await adminDb
    .from('questions')
    .select(SAFE_COLUMNS)
    .eq('is_active', true)
    .limit(100)
  const shuffled = (data ?? []).sort(() => Math.random() - 0.5).slice(0, 15)
  return parseCaseSets(shuffled)
}

const darkPage = {
  minHeight: '100vh',
  backgroundColor: '#0b0f19',
  backgroundImage: 'radial-gradient(at 0% 0%, rgba(99,102,241,0.12) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(168,85,247,0.12) 0px, transparent 50%)',
  color: '#f8fafc',
  fontFamily: 'var(--font-sans), sans-serif',
} as const

const card = {
  background: 'rgba(20,30,54,0.8)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 24,
  padding: '2.5rem',
} as const

export default async function PracticeQuizPage() {
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
  const questions = await fetchPracticeQuestions() as SafeQuestion[]

  return (
    <div style={darkPage}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1rem', background: 'linear-gradient(135deg, #fff 0%, #a5b4fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Viva Dental Prep
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <a href="/dashboard" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 500 }}>← Dashboard</a>
          <a href="/quiz" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 500 }}>Quiz de Hoy</a>
        </div>
      </div>

      <main style={{ maxWidth: 680, margin: '0 auto', padding: '2rem 1rem' }}>
        <header style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 800, lineHeight: 1.25, background: 'linear-gradient(135deg, #fff 0%, #a5b4fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
            Práctica Libre
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '1rem', lineHeight: 1.5 }}>
            Preguntas aleatorias de todos tus temas
          </p>
        </header>

        {questions.length === 0 ? (
          <div style={{ ...card, textAlign: 'center' }}>
            <p style={{ color: '#94a3b8' }}>No hay preguntas disponibles todavía.</p>
          </div>
        ) : (
          <QuizClient
            questions={questions}
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
