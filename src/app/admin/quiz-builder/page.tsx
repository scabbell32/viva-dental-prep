export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Nav } from '@/components/nav'
import { QuizBuilderClient } from '@/components/admin/quiz-builder-client'

export default async function QuizBuilderPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (user.user_metadata?.role !== 'admin') redirect('/dashboard')

  const adminClient = createAdminClient()

  // Fetch all distinct chapters that have active questions (with pagination to bypass 1000 row limit)
  const chaptersSet = new Set<string>()
  let page = 0
  const pageSize = 1000
  while (true) {
    const { data: rows } = await adminClient
      .from('questions')
      .select('chapter_tag')
      .eq('is_active', true)
      .not('chapter_tag', 'is', null)
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (!rows || rows.length === 0) break
    for (const r of rows) {
      if (r.chapter_tag) {
        chaptersSet.add(r.chapter_tag)
      }
    }
    if (rows.length < pageSize) break
    page++
  }

  const chapters = [...chaptersSet]
    .sort((a, b) => {
      const n = (s: string) => parseInt(s.replace(/\D/g, '') || '0')
      return n(a) - n(b)
    })

  const { data: allQuizzes } = await adminClient
    .from('daily_quizzes')
    .select('date, status, question_ids')
    .order('date', { ascending: false })

  const quizDates = (allQuizzes ?? []).map(q => ({
    date: q.date,
    status: q.status as 'draft' | 'published',
    questionCount: Array.isArray(q.question_ids) ? q.question_ids.length : 0,
  }))

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav role="admin" />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Generador de Quiz</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Configura los parámetros y genera una vista previa del quiz
          </p>
        </div>
        <QuizBuilderClient chapters={chapters} quizDates={quizDates} />
      </main>
    </div>
  )
}
