export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Nav } from '@/components/nav'
import { QuizResultsClient } from '@/components/admin/quiz-results-client'

export default async function QuizResultsPage({ params }: { params: Promise<{ date: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (user.user_metadata?.role !== 'admin') redirect('/admin')

  const { date } = await params
  const adminDb = createAdminClient()

  // Load the daily quiz for this date
  const { data: quiz } = await adminDb
    .from('daily_quizzes')
    .select('*')
    .eq('date', date)
    .maybeSingle()

  if (!quiz) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Nav role="admin" />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <Link href="/admin/quiz-preview" className="text-sm text-indigo-600 hover:underline">← Volver a Vista Previa</Link>
          <div className="mt-6 rounded-xl border bg-white p-10 text-center">
            <p className="text-gray-400">No se encontró un quiz publicado para {date}.</p>
          </div>
        </main>
      </div>
    )
  }

  const questionIds = quiz.question_ids as string[]

  // Fetch questions (with correct answers — admin view)
  const { data: questions } = await adminDb
    .from('questions')
    .select('id, week_number, question_text, question_text_es, option_a, option_b, option_c, option_d, correct_option, difficulty, chapter_tag, image_url')
    .in('id', questionIds)

  const orderedQuestions = questionIds
    .map(id => questions?.find(q => q.id === id))
    .filter(Boolean)

  // All quiz_attempts submitted on this date for nbdhe
  const dayStart = `${date}T00:00:00.000Z`
  const dayEnd   = `${date}T23:59:59.999Z`

  const { data: attempts } = await adminDb
    .from('quiz_attempts')
    .select('id, candidate_id, score, total_questions, answers, completed_at, mode')
    .eq('track', 'nbdhe')
    .gte('completed_at', dayStart)
    .lte('completed_at', dayEnd)

  // Get all candidate profiles referenced in those attempts
  const candidateIds = [...new Set((attempts ?? []).map(a => a.candidate_id))]
  const { data: profiles } = candidateIds.length
    ? await adminDb.from('profiles').select('id, full_name').in('id', candidateIds)
    : { data: [] }

  // Total enrolled candidates
  const { data: allCandidates } = await adminDb
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'candidate')

  const formatted = new Date(date + 'T12:00:00').toLocaleDateString('es-MX', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav role="admin" />
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <Link href="/admin/quiz-preview" className="text-sm text-indigo-600 hover:underline">← Vista Previa</Link>
            <h1 className="text-2xl font-bold text-gray-800 mt-1 capitalize">Resultados — {formatted}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Semana {quiz.week_number} · NBDHE · {questionIds.length} preguntas
            </p>
          </div>
        </div>

        <QuizResultsClient
          questions={orderedQuestions as Parameters<typeof QuizResultsClient>[0]['questions']}
          attempts={attempts ?? []}
          profiles={profiles ?? []}
          allCandidates={allCandidates ?? []}
          date={date}
        />
      </main>
    </div>
  )
}
