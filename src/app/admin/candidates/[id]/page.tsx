export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import { Nav } from '@/components/nav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { getReadinessLabel, READINESS_LABELS } from '@/types/database'
import type { Profile, QuizAttempt, ReadinessScore, AdminNote } from '@/types/database'
import { AddNoteForm } from '@/components/admin/add-note-form'
import { UpdateLevelForm } from '@/components/admin/update-level-form'
import { SpanishModeToggle } from '@/components/admin/spanish-mode-toggle'
import { ResetDailyQuizButton } from '@/components/admin/reset-daily-quiz-button'

export default async function CandidateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  if (user.user_metadata?.role !== 'admin') redirect('/dashboard')

  const adminDb = createAdminClient()

  const { data: candidate } = await adminDb
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single() as { data: Profile | null }

  if (!candidate || candidate.role !== 'candidate') notFound()

  const [scoresRes, attemptsRes, notesRes] = await Promise.all([
    adminDb.from('readiness_scores').select('*').eq('candidate_id', id),
    adminDb.from('quiz_attempts').select('*').eq('candidate_id', id).order('completed_at', { ascending: false }).limit(30),
    adminDb.from('admin_notes').select('*').eq('candidate_id', id).order('created_at', { ascending: false }),
  ])
  const scores = scoresRes.data as ReadinessScore[] | null
  const attempts = attemptsRes.data as QuizAttempt[] | null
  const notes = notesRes.data as AdminNote[] | null

  const nbdhe = scores?.find(s => s.track === 'nbdhe')?.score_pct ?? 0
  const juris = scores?.find(s => s.track === 'jurisprudence')?.score_pct ?? 0

  // Weak topics: chapters with lowest average score
  const chapterScores: Record<string, number[]> = {}
  for (const a of attempts ?? []) {
    const key = `Sem.${a.week_number} ${a.track.toUpperCase()}`
    if (!chapterScores[key]) chapterScores[key] = []
    chapterScores[key].push((a.score / a.total_questions) * 100)
  }
  const weakTopics = Object.entries(chapterScores)
    .map(([key, vals]) => ({ key, avg: vals.reduce((a, b) => a + b, 0) / vals.length }))
    .filter(t => t.avg < 70)
    .sort((a, b) => a.avg - b.avg)
    .slice(0, 3)

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav role="admin" />
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{candidate.full_name}</h1>
            <div className="flex gap-2 mt-1">
              {candidate.country && <Badge variant="outline">{candidate.country}</Badge>}
              {candidate.english_level && (
                <Badge variant="secondary" className="capitalize">{candidate.english_level}</Badge>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <UpdateLevelForm candidateId={id} currentLevel={candidate.english_level} />
            <SpanishModeToggle candidateId={id} initialValue={candidate.spanish_mode ?? false} />
            <ResetDailyQuizButton candidateId={id} />
          </div>
        </div>

        {/* Readiness */}
        <div className="grid grid-cols-2 gap-4">
          {[{ label: 'NBDHE', score: Number(nbdhe) }, { label: 'Jurisprudencia', score: Number(juris) }].map(({ label, score }) => {
            const meta = READINESS_LABELS[getReadinessLabel(score)]
            return (
              <Card key={label}>
                <CardHeader className="pb-1"><CardTitle className="text-sm text-gray-500">{label}</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-3xl font-bold">{score.toFixed(0)}%</span>
                    <span className={`text-sm font-semibold ${meta.color}`}>{meta.es}</span>
                  </div>
                  <Progress value={score} className="h-2" />
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Weak Topics */}
        {weakTopics.length > 0 && (
          <Card className="border-orange-200">
            <CardHeader><CardTitle className="text-sm text-orange-700">Áreas débiles (&lt; 70%)</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {weakTopics.map(t => (
                <div key={t.key} className="flex justify-between text-sm">
                  <span>{t.key}</span>
                  <span className="text-orange-600 font-semibold">{t.avg.toFixed(0)}%</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Quiz History */}
        <Card>
          <CardHeader><CardTitle className="text-base">Historial de Exámenes</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(attempts ?? []).map(a => {
                const pct = Math.round((a.score / a.total_questions) * 100)
                return (
                  <div key={a.id} className="flex justify-between items-center text-sm py-2 border-b last:border-0">
                    <div className="flex gap-2 items-center">
                      <Badge variant="outline" className="text-xs">{a.track.toUpperCase()}</Badge>
                      <span className="text-gray-500">Sem. {a.week_number} · {new Date(a.completed_at).toLocaleDateString('es-ES')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={pct} className="w-16 h-2" />
                      <span className={pct >= 80 ? 'text-green-600 font-semibold' : pct >= 60 ? 'text-yellow-600 font-semibold' : 'text-red-500 font-semibold'}>
                        {pct}%
                      </span>
                    </div>
                  </div>
                )
              })}
              {(!attempts || attempts.length === 0) && (
                <p className="text-gray-400 text-sm text-center py-4">Sin intentos todavía.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader><CardTitle className="text-base">Notas del Instructor</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <AddNoteForm candidateId={id} adminId={user.id} />
            <div className="space-y-2 mt-4">
              {(notes ?? []).map(n => (
                <div key={n.id} className="text-sm border-l-2 border-teal-400 pl-3 py-1">
                  <p>{n.note_text}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(n.created_at).toLocaleDateString('es-ES')}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
