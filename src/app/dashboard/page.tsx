export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentWeekNumber } from '@/lib/program-week'
import { getReadinessLabel, READINESS_LABELS } from '@/types/database'
import { SpanishModeToggle } from '@/components/SpanishModeToggle'
import { ExamDateForm } from '@/components/ExamDateForm'

const CHAPTER_LABELS: Record<string, string> = {
  Histology: 'Histología',
  ch2:  'Cap. 2 – Histología y Embriología',
  ch3:  'Cap. 3 – Anatomía y Fisiología',
  ch4:  'Cap. 4 – Anatomía de Cabeza y Cuello',
  ch5:  'Cap. 5 – Anatomía Dental',
  ch6:  'Cap. 6 – Radiología',
  ch7:  'Cap. 7 – Patología General',
  ch8:  'Cap. 8 – Patología Oral',
  ch9:  'Cap. 9 – Microbiología e Inmunología',
  ch11: 'Cap. 11 – Farmacología',
  ch12: 'Cap. 12 – Bioquímica y Nutrición',
  ch13: 'Cap. 13 – Biomateriales',
  ch14: 'Cap. 14 – Periodoncia',
  ch15: 'Cap. 15 – Cuidado de Higiene Dental',
  ch16: 'Cap. 16 – Prevención de Enfermedades',
  ch17: 'Cap. 17 – Instrumentación y Evaluación',
  ch18: 'Cap. 18 – Dolor y Ansiedad',
  ch19: 'Cap. 19 – Necesidades Especiales',
  ch20: 'Cap. 20 – Salud Comunitaria',
  ch21: 'Cap. 21 – Emergencias',
  ch22: 'Cap. 22 – Ética y Aspectos Legales',
}

function chapterLabel(tag: string): string {
  return CHAPTER_LABELS[tag] ?? tag
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const adminDb = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const role = user.user_metadata?.role
  if (role !== 'candidate') redirect('/admin')

  const [
    { data: profile },
    { data: scores },
    { data: attempts },
    { data: notes },
    { data: lastRepasoAttempt },
    { data: currentWeekRow },
    { data: activityCompletions },
    { data: studyStackItems },
  ] = await Promise.all([
    adminDb.from('profiles').select('full_name, english_level, spanish_mode, exam_date').eq('id', user.id).single(),
    supabase.from('readiness_scores').select('*').eq('candidate_id', user.id),
    supabase.from('quiz_attempts')
      .select('id, track, score, total_questions, completed_at, week_number, translation_reveals, mode')
      .eq('candidate_id', user.id)
      .order('completed_at', { ascending: false })
      .limit(14),
    supabase.from('admin_notes')
      .select('note_text, created_at')
      .eq('candidate_id', user.id)
      .order('created_at', { ascending: false })
      .limit(3),
    supabase.from('quiz_attempts')
      .select('completed_at')
      .eq('candidate_id', user.id)
      .eq('mode', 'review')
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from('program_weeks')
      .select('week_number, title, phase')
      .lte('start_date', new Date().toISOString().slice(0, 10))
      .order('start_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from('activity_completions')
      .select('activity_type, week_number')
      .eq('candidate_id', user.id),
    supabase.from('study_stack_items')
      .select('id, status')
      .eq('candidate_id', user.id),
  ])

  // Unique questions seen — aggregate all answer arrays
  let uniqueQuestionsSeen = 0
  {
    const { data: allAttempts } = await supabase
      .from('quiz_attempts')
      .select('answers')
      .eq('candidate_id', user.id)

    const seen = new Set<string>()
    for (const a of allAttempts ?? []) {
      for (const ans of (a.answers as Array<{ question_id: string }>) ?? []) {
        seen.add(ans.question_id)
      }
    }
    uniqueQuestionsSeen = seen.size
  }

  // Weak topic analysis — separate pass to avoid bloating the main query
  type WeakTopic = { tag: string; label: string; pct: number; correct: number; total: number }
  let weakTopics: WeakTopic[] = []
  {
    const { data: recentAttempts } = await supabase
      .from('quiz_attempts')
      .select('answers')
      .eq('candidate_id', user.id)
      .eq('track', 'nbdhe')
      .order('completed_at', { ascending: false })
      .limit(30)

    const allAnswers = (recentAttempts ?? []).flatMap(
      (a) => (a.answers as Array<{ question_id: string; is_correct: boolean }>) ?? []
    )

    if (allAnswers.length > 0) {
      const uniqueIds = [...new Set(allAnswers.map((a) => a.question_id))]
      const { data: tagRows } = await adminDb
        .from('questions')
        .select('id, chapter_tag')
        .in('id', uniqueIds)

      const tagMap = new Map<string, string | null>(
        (tagRows ?? []).map((q) => [q.id, q.chapter_tag])
      )

      const stats: Record<string, { correct: number; total: number }> = {}
      for (const ans of allAnswers) {
        const tag = tagMap.get(ans.question_id)
        if (!tag) continue
        if (!stats[tag]) stats[tag] = { correct: 0, total: 0 }
        stats[tag].total++
        if (ans.is_correct) stats[tag].correct++
      }

      weakTopics = Object.entries(stats)
        .filter(([, s]) => s.total >= 3)
        .map(([tag, s]) => ({
          tag,
          label: chapterLabel(tag),
          pct: Math.round((s.correct / s.total) * 100),
          correct: s.correct,
          total: s.total,
        }))
        .sort((a, b) => a.pct - b.pct)
        .slice(0, 6)
    }
  }

  const fullName: string = profile?.full_name ?? (user.user_metadata?.full_name as string) ?? 'Estudiante'
  const spanishMode: boolean = profile?.spanish_mode ?? false
  const examDate: string | null = profile?.exam_date ?? null
  const daysUntilExam: number | null = examDate
    ? Math.ceil((new Date(examDate + 'T12:00:00').getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null
  const weekNumber = getCurrentWeekNumber()
  const currentWeek = currentWeekRow ?? null

  // Activity calendar — last 35 days
  const activeDays = new Set((attempts ?? []).map(a => a.completed_at.slice(0, 10)))
  const calendarDays: Array<{ date: string; active: boolean; isToday: boolean; isFuture: boolean }> = []
  const today = new Date()
  for (let i = 34; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const ds = d.toISOString().slice(0, 10)
    calendarDays.push({ date: ds, active: activeDays.has(ds), isToday: i === 0, isFuture: false })
  }

  // Weekly checklist completion
  const quizDoneThisWeek = attempts?.some(a => a.week_number === weekNumber && a.mode === 'weekly') ?? false
  const vocabDoneThisWeek = activityCompletions?.some(c => c.activity_type === 'vocab' && c.week_number === weekNumber) ?? false
  const listeningDoneThisWeek = activityCompletions?.some(c => c.activity_type === 'listening' && c.week_number === weekNumber) ?? false
  const nbdheScore = Number(scores?.find(s => s.track === 'nbdhe')?.score_pct ?? 0)
  const jurisScore = Number(scores?.find(s => s.track === 'jurisprudence')?.score_pct ?? 0)

  // Repaso nudge: days since last review attempt
  const repasoNudgeDays = lastRepasoAttempt?.completed_at
    ? Math.floor((Date.now() - new Date(lastRepasoAttempt.completed_at).getTime()) / (1000 * 60 * 60 * 24))
    : null

  // Check today's quiz status
  const todayStr = new Date().toISOString().slice(0, 10)
  const todayAttempts = attempts?.filter(a => a.completed_at.slice(0, 10) === todayStr) ?? []
  const doneToday = todayAttempts.length > 0
  const todayScore = doneToday
    ? Math.round((todayAttempts[0].score / todayAttempts[0].total_questions) * 100)
    : null

  // Streak
  let streak = 0
  if (attempts && attempts.length > 0) {
    const days = new Set(attempts.map(a => a.completed_at.slice(0, 10)))
    const today = new Date()
    for (let i = 0; i < 30; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      if (days.has(d.toISOString().slice(0, 10))) streak++
      else break
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0b0f19', backgroundImage: 'radial-gradient(at 0% 0%, rgba(99,102,241,0.1) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(168,85,247,0.1) 0px, transparent 50%)', backgroundAttachment: 'fixed', color: '#f8fafc', fontFamily: 'var(--font-sans), sans-serif' }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1rem', background: 'linear-gradient(135deg, #fff 0%, #a5b4fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Viva Dental Prep
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <Link href="/vocab" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 500 }}>Vocabulario</Link>
          <Link href="/quiz" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 500 }}>Examen</Link>
          <form action="/api/auth/logout" method="POST">
            <button type="submit" style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500, padding: 0 }}>
              Salir
            </button>
          </form>
        </div>
      </div>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '2.5rem 1rem' }}>

        {/* Greeting */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 800, background: 'linear-gradient(135deg, #fff 0%, #a5b4fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.35rem', letterSpacing: '-0.02em' }}>
            Hola, {fullName.split(' ')[0]} 👋
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '1rem' }}>Semana {weekNumber} de 20 · {streak > 0 ? `${streak} día${streak !== 1 ? 's' : ''} consecutivo${streak !== 1 ? 's' : ''} 🔥` : 'Comienza tu racha hoy'}</p>
        </div>

        {/* Exam countdown + questions counter */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>

          {/* Countdown */}
          <div style={{ background: 'rgba(20,30,54,0.6)', backdropFilter: 'blur(20px)', border: daysUntilExam !== null && daysUntilExam <= 14 ? '1px solid rgba(244,63,94,0.35)' : '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '1.25rem 1.5rem' }}>
            <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.5rem' }}>Fecha del Examen</p>
            {daysUntilExam !== null ? (
              <>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
                  <span style={{ fontFamily: 'var(--font-heading)', fontSize: '2.5rem', fontWeight: 800, color: daysUntilExam <= 14 ? '#f43f5e' : daysUntilExam <= 30 ? '#f59e0b' : '#fff', lineHeight: 1 }}>
                    {daysUntilExam > 0 ? daysUntilExam : 0}
                  </span>
                  <span style={{ color: '#64748b', fontSize: '0.85rem' }}>días</span>
                </div>
                <p style={{ color: '#475569', fontSize: '0.78rem', marginTop: '0.4rem' }}>
                  {new Date(examDate! + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                {daysUntilExam <= 14 && daysUntilExam > 0 && (
                  <p style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: '#f43f5e', fontWeight: 600 }}>¡Últimas semanas! Máxima concentración.</p>
                )}
              </>
            ) : (
              <>
                <p style={{ color: '#475569', fontSize: '0.85rem', marginBottom: '0.75rem' }}>Agrega tu fecha para ver la cuenta regresiva.</p>
                <ExamDateForm userId={user.id} />
              </>
            )}
          </div>

          {/* Questions seen */}
          <div style={{ background: 'rgba(20,30,54,0.6)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '1.25rem 1.5rem' }}>
            <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.5rem' }}>Preguntas Vistas</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginBottom: '0.5rem' }}>
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: '2.5rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>
                {uniqueQuestionsSeen}
              </span>
              <span style={{ color: '#64748b', fontSize: '0.85rem' }}>/ 1,000</span>
            </div>
            <div style={{ width: '100%', height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden', marginBottom: '0.4rem' }}>
              <div style={{ height: '100%', width: `${Math.min(100, (uniqueQuestionsSeen / 1000) * 100)}%`, background: 'linear-gradient(90deg, #6366f1 0%, #a855f7 100%)', borderRadius: 99 }} />
            </div>
            <p style={{ color: '#475569', fontSize: '0.78rem' }}>
              {uniqueQuestionsSeen >= 1000 ? '¡Completaste el banco! 🎉' : `${1000 - uniqueQuestionsSeen} preguntas nuevas por descubrir`}
            </p>
          </div>

        </div>

        {/* Admin notes */}
        {notes && notes.length > 0 && (
          <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 16, padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>Notas del Instructor</p>
            {notes.map((note, i) => (
              <p key={i} style={{ color: '#fcd34d', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: i < notes.length - 1 ? '0.5rem' : 0 }}>
                {note.note_text}
              </p>
            ))}
          </div>
        )}

        {/* Bilingual mode toggle */}
        <div style={{ marginBottom: '1.5rem' }}>
          <SpanishModeToggle initialValue={spanishMode} />
        </div>

        {/* Quiz cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>

          {/* Daily quiz card */}
          <div style={{ background: 'rgba(20,30,54,0.6)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '2rem' }}>📋</span>
              {doneToday && (
                <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.7rem', borderRadius: 99, background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                  Completado
                </span>
              )}
            </div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginBottom: '0.4rem' }}>
                Quiz de Hoy
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.5 }}>
                {doneToday
                  ? `Obtuviste ${todayScore}% hoy. ¡Buen trabajo!`
                  : '10–15 preguntas NBDHE seleccionadas de tu plan de estudio.'}
              </p>
            </div>
            <Link
              href="/quiz"
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                padding: '0.875rem 1.5rem', borderRadius: 12, fontFamily: 'var(--font-heading)',
                fontSize: '0.9rem', fontWeight: 700, textDecoration: 'none',
                background: doneToday ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                color: doneToday ? '#94a3b8' : '#fff',
                border: doneToday ? '1px solid rgba(255,255,255,0.06)' : 'none',
                boxShadow: doneToday ? 'none' : '0 4px 15px rgba(99,102,241,0.35)',
              }}
            >
              {doneToday ? 'Ver resultado' : 'Comenzar examen'}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </Link>
          </div>

          {/* Practice card */}
          <div style={{ background: 'rgba(20,30,54,0.6)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ fontSize: '2rem' }}>🎯</div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginBottom: '0.4rem' }}>
                Práctica Libre
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.5 }}>
                Preguntas aleatorias de todos tus temas. Sin límite diario.
              </p>
            </div>
            <Link
              href="/quiz/practice"
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                padding: '0.875rem 1.5rem', borderRadius: 12, fontFamily: 'var(--font-heading)',
                fontSize: '0.9rem', fontWeight: 700, textDecoration: 'none',
                background: 'rgba(255,255,255,0.04)',
                color: '#a5b4fc',
                border: '1px solid rgba(99,102,241,0.3)',
              }}
            >
              Practicar ahora
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </Link>
          </div>

          {/* Repaso card */}
          <div style={{ background: 'rgba(20,30,54,0.6)', backdropFilter: 'blur(20px)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: 24, padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '2rem' }}>🔁</span>
              {repasoNudgeDays !== null && repasoNudgeDays >= 3 && (
                <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: 99, background: 'rgba(244,63,94,0.12)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.25)' }}>
                  Último hace {repasoNudgeDays}d
                </span>
              )}
            </div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginBottom: '0.4rem' }}>
                Repaso de Errores
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.5 }}>
                Preguntas que fallaste recientemente, ordenadas por las más difíciles primero.
              </p>
            </div>
            <Link
              href="/repaso"
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                padding: '0.875rem 1.5rem', borderRadius: 12, fontFamily: 'var(--font-heading)',
                fontSize: '0.9rem', fontWeight: 700, textDecoration: 'none',
                background: 'rgba(244,63,94,0.08)',
                color: '#fda4af',
                border: '1px solid rgba(244,63,94,0.25)',
              }}
            >
              Repasar ahora
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </Link>
          </div>
        </div>

        {/* Study Stack card */}
        {studyStackItems && studyStackItems.length > 0 && (
          <div style={{ background: 'rgba(20,30,54,0.6)', backdropFilter: 'blur(20px)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 24, padding: '1.5rem 1.75rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                <span style={{ fontSize: '1.25rem' }}>📚</span>
                <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 700, color: '#fbbf24' }}>Tu Study Stack</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.55rem', borderRadius: 99, background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>
                  {studyStackItems.length} pregunta{studyStackItems.length !== 1 ? 's' : ''}
                </span>
              </div>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.4 }}>
                {studyStackItems.some(i => i.status === 'ready')
                  ? 'Tu revisión de audio está lista.'
                  : 'Generando tu revisión de audio en segundo plano...'}
              </p>
            </div>
            <Link
              href="/study-stack"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', borderRadius: 12, fontFamily: 'var(--font-heading)', fontSize: '0.875rem', fontWeight: 700, textDecoration: 'none', background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)', flexShrink: 0 }}
            >
              Ver Study Stack →
            </Link>
          </div>
        )}

        {/* Weekly checklist */}
        {currentWeek && (
          <div style={{ background: 'rgba(20,30,54,0.6)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: '1.75rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>
                  Semana {currentWeek.week_number}
                </div>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
                  {currentWeek.title}
                </div>
              </div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.25rem 0.65rem', borderRadius: 99, background: currentWeek.phase === 'written' ? 'rgba(99,102,241,0.15)' : 'rgba(16,185,129,0.12)', color: currentWeek.phase === 'written' ? '#a5b4fc' : '#10b981', border: `1px solid ${currentWeek.phase === 'written' ? 'rgba(99,102,241,0.25)' : 'rgba(16,185,129,0.2)'}` }}>
                {currentWeek.phase === 'written' ? 'Fase escrita' : 'Fase clínica'}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                { label: 'Quiz semanal', done: quizDoneThisWeek, href: '/quiz' },
                { label: 'Vocabulario', done: vocabDoneThisWeek, href: '/vocab' },
                { label: 'Ejercicio de escucha', done: listeningDoneThisWeek, href: '/listening' },
              ].map(({ label, done, href }) => (
                <Link key={label} href={href} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.75rem 1rem', borderRadius: 12, background: done ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${done ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)'}`, textDecoration: 'none', transition: 'background 0.2s' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${done ? '#10b981' : 'rgba(255,255,255,0.15)'}`, background: done ? '#10b981' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}>
                    {done && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><polyline points="1.5,6 4.5,9 10.5,3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    )}
                  </div>
                  <span style={{ fontSize: '0.9rem', fontWeight: 500, color: done ? '#94a3b8' : '#e2e8f0', textDecoration: done ? 'line-through' : 'none' }}>{label}</span>
                  {!done && <svg style={{ marginLeft: 'auto' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Readiness scores */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <ScoreCard title="NBDHE — Examen Escrito" score={nbdheScore} label={getReadinessLabel(nbdheScore)} attemptsInWindow={scores?.find(s => s.track === 'nbdhe')?.attempts_in_window ?? 0} />
          <ScoreCard title="Jurisprudencia Indiana" score={jurisScore} label={getReadinessLabel(jurisScore)} attemptsInWindow={scores?.find(s => s.track === 'jurisprudence')?.attempts_in_window ?? 0} />
        </div>

        {/* Weak topics */}
        {weakTopics.length >= 2 && (
          <div style={{ background: 'rgba(20,30,54,0.6)', backdropFilter: 'blur(20px)', border: '1px solid rgba(244,63,94,0.18)', borderRadius: 24, padding: '1.75rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div>
                <p style={{ fontFamily: 'var(--font-heading)', fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 0.2rem' }}>
                  Temas por Reforzar
                </p>
                <p style={{ fontSize: '0.75rem', color: '#475569', margin: 0 }}>
                  Últimos 30 quizzes NBDHE · mínimo 3 preguntas por tema
                </p>
              </div>
              <span style={{ fontSize: '1.25rem' }}>📉</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {weakTopics.map(({ tag, label, pct, correct, total }) => {
                const barColor = pct >= 75 ? '#10b981' : pct >= 55 ? '#f59e0b' : '#f43f5e'
                return (
                  <div key={tag}>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                      <span style={{ fontSize: '0.82rem', color: '#cbd5e1', fontWeight: 500, flex: 1, marginRight: '0.75rem', lineHeight: 1.3 }}>
                        {label}
                      </span>
                      <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.85rem', color: barColor, flexShrink: 0 }}>
                        {pct}%
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 99 }} />
                      </div>
                      <span style={{ fontSize: '0.7rem', color: '#475569', flexShrink: 0, minWidth: 50, textAlign: 'right' }}>
                        {correct}/{total} correctas
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
            {weakTopics[0] && weakTopics[0].pct < 60 && (
              <div style={{ marginTop: '1.25rem', padding: '0.75rem 1rem', background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.15)', borderRadius: 12 }}>
                <p style={{ fontSize: '0.8rem', color: '#fda4af', margin: 0, lineHeight: 1.5 }}>
                  💡 Tu tema más débil es <strong>{weakTopics[0].label.split('–')[0].trim()}</strong>. Considera practicar preguntas de ese capítulo.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Recent history */}
        <div style={{ background: 'rgba(20,30,54,0.6)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: '1.75rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
              Historial Reciente
            </p>
            <Link href="/quiz/history" style={{ fontSize: '0.8rem', color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>
              Ver todo →
            </Link>
          </div>
          {!attempts || attempts.length === 0 ? (
            <p style={{ color: '#475569', fontSize: '0.9rem' }}>Aún no hay intentos. ¡Toma tu primer examen hoy!</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {attempts.slice(0, 8).map((a, i) => {
                const pct = Math.round((a.score / a.total_questions) * 100)
                return (
                  <Link key={a.id ?? i} href={`/quiz/history/${a.id}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 0', borderBottom: i < Math.min(attempts.length, 8) - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.55rem', borderRadius: 6, background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {a.track === 'nbdhe' ? 'NBDHE' : 'Juris.'}
                      </span>
                      <span style={{ color: '#64748b', fontSize: '0.85rem' }}>
                        Sem. {a.week_number} · {new Date(a.completed_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: 80, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#f43f5e', borderRadius: 99 }} />
                      </div>
                      <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.9rem', color: pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#f43f5e', minWidth: 36, textAlign: 'right' }}>
                        {pct}%
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Activity calendar */}
        <div style={{ background: 'rgba(20,30,54,0.6)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: '1.75rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
              Actividad — Últimos 35 días
            </p>
            <span style={{ fontSize: '0.78rem', color: '#475569' }}>{streak > 0 ? `🔥 ${streak} día${streak !== 1 ? 's' : ''} seguido${streak !== 1 ? 's' : ''}` : 'Sin racha activa'}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.35rem' }}>
            {calendarDays.map(({ date, active, isToday }) => (
              <div
                key={date}
                title={new Date(date + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })}
                style={{
                  aspectRatio: '1',
                  borderRadius: 6,
                  background: active ? 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' : 'rgba(255,255,255,0.04)',
                  border: isToday ? '1.5px solid rgba(99,102,241,0.6)' : '1px solid transparent',
                  boxShadow: active ? '0 0 8px rgba(99,102,241,0.3)' : 'none',
                }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.875rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' }} />
              <span style={{ fontSize: '0.72rem', color: '#475569' }}>Con actividad</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
              <span style={{ fontSize: '0.72rem', color: '#475569' }}>Sin actividad</span>
            </div>
          </div>
        </div>

        {/* English independence trend */}
        {attempts && attempts.some(a => (a.translation_reveals ?? 0) >= 0) && (() => {
          const withReveals = attempts.slice(0, 10).filter(a => typeof a.translation_reveals === 'number')
          if (withReveals.length === 0) return null
          const avg = withReveals.reduce((sum, a) => sum + (1 - a.translation_reveals / a.total_questions), 0) / withReveals.length
          return (
            <div style={{ background: 'rgba(20,30,54,0.6)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <p style={{ fontFamily: 'var(--font-heading)', fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Independencia del Inglés
                </p>
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.1rem', color: avg >= 0.8 ? '#10b981' : avg >= 0.6 ? '#f59e0b' : '#a5b4fc' }}>
                  {Math.round(avg * 100)}% promedio
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {withReveals.map((a, i) => {
                  const indPct = Math.round((1 - a.translation_reveals / a.total_questions) * 100)
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ color: '#475569', fontSize: '0.75rem', minWidth: 60, flexShrink: 0 }}>
                        {new Date(a.completed_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      </span>
                      <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${indPct}%`, background: indPct >= 80 ? '#10b981' : indPct >= 60 ? '#f59e0b' : '#6366f1', borderRadius: 99, transition: 'width 0.8s ease' }} />
                      </div>
                      <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.82rem', color: indPct >= 80 ? '#10b981' : indPct >= 60 ? '#f59e0b' : '#a5b4fc', minWidth: 36, textAlign: 'right' }}>
                        {indPct}%
                      </span>
                    </div>
                  )
                })}
              </div>
              <p style={{ marginTop: '0.875rem', fontSize: '0.78rem', color: '#475569', lineHeight: 1.5 }}>
                Porcentaje de preguntas en Inglés que respondiste sin usar la traducción al español.
              </p>
            </div>
          )
        })()}

      </main>
    </div>
  )
}

function ScoreCard({ title, score, label, attemptsInWindow }: { title: string; score: number; label: ReturnType<typeof getReadinessLabel>; attemptsInWindow: number }) {
  const meta = READINESS_LABELS[label]
  if (attemptsInWindow === 0) {
    return (
      <div style={{ background: 'rgba(20,30,54,0.6)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: '1.5rem' }}>
        <p style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>{title}</p>
        <p style={{ color: '#475569', fontSize: '0.875rem', lineHeight: 1.5 }}>Completa tu primer quiz para ver tu nivel de preparación.</p>
      </div>
    )
  }
  return (
    <div style={{ background: 'rgba(20,30,54,0.6)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: '1.5rem' }}>
      <p style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>{title}</p>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <span style={{ fontFamily: 'var(--font-heading)', fontSize: '2.5rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{score.toFixed(0)}%</span>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: label === 'ready' ? '#10b981' : label === 'approaching' ? '#f59e0b' : '#f43f5e' }}>
          {meta.es}
        </span>
      </div>
      <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden', marginBottom: '0.5rem' }}>
        <div style={{ height: '100%', width: `${score}%`, background: 'linear-gradient(90deg, #6366f1 0%, #a855f7 100%)', borderRadius: 99, transition: 'width 1s ease' }} />
      </div>
      <p style={{ fontSize: '0.72rem', color: '#475569' }}>Basado en tus últimos {attemptsInWindow} intento{attemptsInWindow !== 1 ? 's' : ''}</p>
    </div>
  )
}
