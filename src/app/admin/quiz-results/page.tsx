export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Nav } from '@/components/nav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function QuizResultsHistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (user.user_metadata?.role !== 'admin') redirect('/dashboard')

  const adminDb = createAdminClient()

  // 1. Fetch all daily quizzes
  const { data: quizzes } = await adminDb
    .from('daily_quizzes')
    .select('*')
    .order('date', { ascending: false })

  // 2. Fetch total count of candidate profiles
  const { count: totalCandidates } = await adminDb
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'candidate')

  // 3. Fetch attempts to calculate participation rates
  const { data: attempts } = await adminDb
    .from('quiz_attempts')
    .select('completed_at, candidate_id')
    .eq('track', 'nbdhe')

  // Map candidate attempts to dates
  const attemptsByDate = new Map<string, Set<string>>()
  for (const a of attempts ?? []) {
    const d = a.completed_at.slice(0, 10)
    if (!attemptsByDate.has(d)) {
      attemptsByDate.set(d, new Set())
    }
    attemptsByDate.get(d)!.add(a.candidate_id)
  }

  const enrolledCount = totalCandidates ?? 0

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav role="admin" />
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Historial de Quizzes Diarios</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Revisa los cuestionarios pasados y la participación de los alumnos
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {(quizzes ?? []).map(quiz => {
            const dateObj = new Date(quiz.date + 'T12:00:00')
            const formattedDate = dateObj.toLocaleDateString('es-MX', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })

            const qCount = (quiz.question_ids as string[])?.length ?? 0
            const participants = attemptsByDate.get(quiz.date)?.size ?? 0
            const pct = enrolledCount > 0 ? Math.round((participants / enrolledCount) * 100) : 0

            return (
              <Card key={quiz.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-bold text-gray-800 capitalize">
                      {formattedDate}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span>Semana {quiz.week_number}</span>
                      <span>·</span>
                      <span>{qCount} pregunta{qCount !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={quiz.status === 'published' ? 'default' : 'secondary'} className={quiz.status === 'published' ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100'}>
                      {quiz.status === 'published' ? 'Publicado' : 'Borrador'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Participación de los Alumnos</span>
                      <span className="font-semibold text-gray-700">{participants} de {enrolledCount} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="shrink-0 flex gap-2">
                    <Link
                      href={`/admin/quiz-results/${quiz.date}`}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-md transition-colors"
                    >
                      📊 Resultados
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )
          })}

          {(!quizzes || quizzes.length === 0) && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center">
              <p className="text-gray-400 text-sm">No se han generado quizzes diarios todavía.</p>
              <Link href="/admin/quiz-preview" className="text-indigo-600 text-sm hover:underline mt-2 inline-block">
                Generar el primer quiz diario →
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
