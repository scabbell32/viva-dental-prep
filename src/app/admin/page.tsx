export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Nav } from '@/components/nav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ui } from '@/lib/i18n'
import { getReadinessLabel, READINESS_LABELS } from '@/types/database'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const role = user.user_metadata?.role
  if (role !== 'admin') redirect('/dashboard')

  const adminDb = createAdminClient()

  // All candidates
  const { data: candidates } = await adminDb
    .from('profiles')
    .select('id, full_name, english_level, country, created_at')
    .eq('role', 'candidate')
    .order('full_name')

  // Readiness scores for all candidates
  const { data: allScores } = await adminDb
    .from('readiness_scores')
    .select('*')

  // Streak per candidate (attempts in last 7 days)
  const { data: recentAttempts } = await adminDb
    .from('quiz_attempts')
    .select('candidate_id, completed_at')
    .gte('completed_at', new Date(Date.now() - 7 * 86400000).toISOString())

  function getStreak(candidateId: string) {
    const days = new Set(
      (recentAttempts ?? [])
        .filter(a => a.candidate_id === candidateId)
        .map(a => a.completed_at.slice(0, 10))
    )
    let streak = 0
    const today = new Date()
    for (let i = 0; i < 7; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      if (days.has(d.toISOString().slice(0, 10))) streak++
      else break
    }
    return streak
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav role="admin" />
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-bold text-gray-800">{ui.admin.candidates}</h1>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/quiz-results"
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-md"
            >
              📊 Historial de Quizzes
            </Link>
            <Link
              href="/admin/candidates/new"
              className="bg-teal-600 hover:bg-teal-700 text-white text-sm px-4 py-2 rounded-md"
            >
              + Agregar Candidato
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(candidates ?? []).map(c => {
            const nbdhe = allScores?.find(s => s.candidate_id === c.id && s.track === 'nbdhe')?.score_pct ?? 0
            const juris = allScores?.find(s => s.candidate_id === c.id && s.track === 'jurisprudence')?.score_pct ?? 0
            const streak = getStreak(c.id)
            const nbdheLabel = READINESS_LABELS[getReadinessLabel(Number(nbdhe))]
            const jurisLabel = READINESS_LABELS[getReadinessLabel(Number(juris))]

            return (
              <Link key={c.id} href={`/admin/candidates/${c.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{c.full_name}</CardTitle>
                      <Badge variant="outline" className="text-xs shrink-0 ml-2">
                        🔥 {streak}d
                      </Badge>
                    </div>
                    <div className="flex gap-2 text-xs text-gray-400">
                      {c.country && <span>{c.country}</span>}
                      {c.english_level && (
                        <Badge variant="secondary" className="text-xs capitalize">
                          {c.english_level}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>NBDHE</span>
                        <span className={nbdheLabel.color}>{nbdheLabel.es}</span>
                      </div>
                      <Progress value={Number(nbdhe)} className="h-2" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Jurisprudencia</span>
                        <span className={jurisLabel.color}>{jurisLabel.es}</span>
                      </div>
                      <Progress value={Number(juris)} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}

          {(!candidates || candidates.length === 0) && (
            <p className="text-gray-400 col-span-2 text-center py-12">
              No hay candidatos todavía. Agrega el primero.
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
