export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Nav } from '@/components/nav'
import { QuizPreviewClient } from '@/components/admin/quiz-preview-client'
import { QuizPreviewHeader } from '@/components/admin/quiz-preview-header'
import { GenerateButtonClient, RegenerateButtonClient } from '@/components/admin/daily-quiz-generate-button'
import { getCurrentWeekNumber } from '@/lib/program-week'

const FULL_COLUMNS = 'id, week_number, chapter_tag, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, difficulty, image_url, question_text_es, option_a_es, option_b_es, option_c_es, option_d_es, explanation_es'

export default async function QuizPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (user.user_metadata?.role !== 'admin') redirect('/admin')

  const adminDb = createAdminClient()
  const { date: paramDate } = await searchParams
  const today = paramDate || new Date().toISOString().slice(0, 10)
  const week = getCurrentWeekNumber()

  const [{ data: quiz }, { data: poolIds }, { data: candidates }] = await Promise.all([
    adminDb.from('daily_quizzes').select('*').eq('date', today).maybeSingle(),
    adminDb.from('questions').select('id').eq('track', 'nbdhe').eq('is_active', true).lte('week_number', week),
    adminDb.from('profiles').select('id, full_name, phone').eq('role', 'candidate').order('full_name'),
  ])

  const availableCount = poolIds?.length ?? 0

  if (!quiz) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Nav role="admin" />
        <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
          <QuizPreviewHeader date={today} week={week} />
          <div className="rounded-xl border bg-white p-10 flex flex-col items-center gap-4">
            <div className="text-4xl">📋</div>
            <h2 className="font-semibold text-gray-700">No hay quiz generado para esta fecha</h2>
            <p className="text-sm text-gray-400">
              {availableCount > 0
                ? `Banco tiene ${availableCount} preguntas activas disponibles.`
                : 'No hay preguntas activas para la semana actual.'}
            </p>
            {availableCount > 0 && <GenerateButtonClient availableCount={availableCount} date={today} />}
          </div>
        </main>
      </div>
    )
  }

  // Fetch selected questions in stored order
  const { data: selectedQs } = await adminDb
    .from('questions')
    .select(FULL_COLUMNS)
    .in('id', quiz.question_ids as string[])

  const orderedQuestions = (quiz.question_ids as string[])
    .map((id: string) => selectedQs?.find(q => q.id === id))
    .filter(Boolean)

  // Pool: eligible questions not currently in the quiz
  const selectedSet = new Set(quiz.question_ids as string[])
  const { data: allEligible } = await adminDb
    .from('questions')
    .select(FULL_COLUMNS)
    .eq('track', 'nbdhe')
    .eq('is_active', true)
    .lte('week_number', week)
    .order('week_number', { ascending: false })
    .limit(100)

  const poolQuestions = (allEligible ?? []).filter(q => !selectedSet.has(q.id))
  const quizWithQuestions = { ...quiz, questions: orderedQuestions }

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav role="admin" />
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex-1 min-w-0">
            <QuizPreviewHeader date={today} week={week} />
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0 pt-3">
            {quiz.status === 'draft' && (
              <RegenerateButtonClient currentCount={(quiz.question_ids as string[]).length} date={today} />
            )}
            {quiz.status === 'published' && (
              <Link
                href={`/admin/quiz-results/${today}`}
                className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-md"
              >
                📊 Ver Resultados
              </Link>
            )}
          </div>
        </div>

        <QuizPreviewClient
          quiz={quizWithQuestions as Parameters<typeof QuizPreviewClient>[0]['quiz']}
          allPool={poolQuestions as Parameters<typeof QuizPreviewClient>[0]['allPool']}
          candidates={(candidates ?? []) as Parameters<typeof QuizPreviewClient>[0]['candidates']}
        />
      </main>
    </div>
  )
}
