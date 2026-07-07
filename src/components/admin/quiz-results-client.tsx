'use client'

import { useState } from 'react'

type Question = {
  id: string
  week_number: number | null
  question_text: string
  question_text_es: string | null
  option_a: string; option_b: string; option_c: string; option_d: string
  correct_option: string
  difficulty: string
  chapter_tag: string | null
  image_url: string | null
  image_urls?: string[] | null
}

type AnswerRecord = {
  question_id: string
  selected_option: string
  is_correct: boolean
  used_translation?: boolean
}

type Attempt = {
  id: string
  candidate_id: string
  score: number
  total_questions: number
  answers: AnswerRecord[]
  completed_at: string
  mode: string
}

type Profile = { id: string; full_name: string }

const OPTIONS = ['a', 'b', 'c', 'd'] as const
const OPTION_LABELS: Record<string, string> = { a: 'A', b: 'B', c: 'C', d: 'D' }
const DIFF_COLOR: Record<string, string> = {
  easy: '#16a34a', medium: '#d97706', hard: '#dc2626',
}

// Find a candidate's answer for a specific question across their attempts
function findAnswer(attempts: Attempt[], candidateId: string, questionId: string): AnswerRecord | null {
  for (const attempt of attempts) {
    if (attempt.candidate_id !== candidateId) continue
    const answer = attempt.answers?.find(a => a.question_id === questionId)
    if (answer) return answer
  }
  return null
}

// Attempts deduplicated by candidate (keep most recent)
function latestAttemptPerCandidate(attempts: Attempt[]): Map<string, Attempt> {
  const map = new Map<string, Attempt>()
  for (const a of attempts) {
    const existing = map.get(a.candidate_id)
    if (!existing || a.completed_at > existing.completed_at) {
      map.set(a.candidate_id, a)
    }
  }
  return map
}

function AnswerBar({ question, attempts }: { question: Question; attempts: Attempt[] }) {
  const relevant = attempts.filter(a => a.answers?.some(ans => ans.question_id === question.id))
  const total = relevant.length
  if (total === 0) return <p className="text-xs text-gray-400 italic">Nadie ha respondido esta pregunta aún.</p>

  const counts: Record<string, number> = { a: 0, b: 0, c: 0, d: 0 }
  for (const attempt of relevant) {
    const ans = attempt.answers?.find(a => a.question_id === question.id)
    if (ans) counts[ans.selected_option] = (counts[ans.selected_option] ?? 0) + 1
  }

  const correctCount = counts[question.correct_option] ?? 0
  const pct = Math.round((correctCount / total) * 100)

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, background: pct >= 70 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626' }}
          />
        </div>
        <span className="text-sm font-bold" style={{ color: pct >= 70 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626' }}>
          {pct}% correcto
        </span>
        <span className="text-xs text-gray-400">({correctCount}/{total})</span>
      </div>
      <div className="flex gap-2 flex-wrap">
        {OPTIONS.map(opt => {
          const n = counts[opt] ?? 0
          const isCorrect = opt === question.correct_option
          return (
            <div
              key={opt}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold"
              style={{
                background: isCorrect ? '#dcfce7' : n > 0 ? '#fef2f2' : '#f8fafc',
                color: isCorrect ? '#15803d' : n > 0 ? '#dc2626' : '#94a3b8',
                border: `1px solid ${isCorrect ? '#86efac' : n > 0 ? '#fca5a5' : '#e2e8f0'}`,
              }}
            >
              <span>{OPTION_LABELS[opt]}</span>
              <span>{n}</span>
              {isCorrect && <span>✓</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function QuizResultsClient({
  questions, attempts, profiles, allCandidates,
}: {
  questions: Question[]
  attempts: Attempt[]
  profiles: Profile[]
  allCandidates: Profile[]
  date: string
}) {
  const [expandedQ, setExpandedQ] = useState<string | null>(null)
  const [view, setView] = useState<'questions' | 'matrix'>('questions')

  const latestAttempts = latestAttemptPerCandidate(attempts)
  const profileMap = new Map(profiles.map(p => [p.id, p.full_name]))
  const candidatesWhoAttempted = [...latestAttempts.keys()]

  // Only include candidates who actually answered at least one daily quiz question
  const dailyQuestionIds = new Set(questions.map(q => q.id))
  const participatingIds = candidatesWhoAttempted.filter(cid => {
    const attempt = latestAttempts.get(cid)
    return attempt?.answers?.some(a => dailyQuestionIds.has(a.question_id))
  })

  const totalEnrolled = allCandidates.length
  const participated = participatingIds.length

  // Average score across participants (on daily quiz questions only)
  const avgPct = participated === 0 ? 0 : Math.round(
    participatingIds.reduce((sum, cid) => {
      const attempt = latestAttempts.get(cid)!
      const dailyAnswers = attempt.answers?.filter(a => dailyQuestionIds.has(a.question_id)) ?? []
      const correct = dailyAnswers.filter(a => a.is_correct).length
      return sum + (dailyAnswers.length ? correct / dailyAnswers.length : 0)
    }, 0) / participated * 100
  )

  return (
    <div className="space-y-5">
      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Participación', value: `${participated} / ${totalEnrolled}`, sub: 'candidatos completaron el quiz' },
          { label: 'Promedio del grupo', value: `${avgPct}%`, sub: 'correcto en las preguntas del día' },
          { label: 'Preguntas en el quiz', value: String(questions.length), sub: 'preguntas seleccionadas hoy' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border p-4 text-center">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-gray-800">{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* View toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setView('questions')}
          className="text-sm px-3 py-1.5 rounded-md font-semibold transition-colors"
          style={{ background: view === 'questions' ? '#6366f1' : '#f1f5f9', color: view === 'questions' ? '#fff' : '#475569' }}
        >
          Por pregunta
        </button>
        <button
          onClick={() => setView('matrix')}
          className="text-sm px-3 py-1.5 rounded-md font-semibold transition-colors"
          style={{ background: view === 'matrix' ? '#6366f1' : '#f1f5f9', color: view === 'matrix' ? '#fff' : '#475569' }}
        >
          Por candidato
        </button>
      </div>

      {/* ─── Per-question view ─── */}
      {view === 'questions' && (
        <div className="space-y-3">
          {questions.map((q, i) => {
            const relevant = attempts.filter(a => a.answers?.some(ans => ans.question_id === q.id))
            const correctCount = relevant.filter(a => a.answers?.find(ans => ans.question_id === q.id)?.is_correct).length
            const pct = relevant.length ? Math.round(correctCount / relevant.length * 100) : null
            const isExpanded = expandedQ === q.id

            return (
              <div key={q.id} className="bg-white rounded-xl border overflow-hidden">
                {/* Header row — always visible */}
                <button
                  onClick={() => setExpandedQ(isExpanded ? null : q.id)}
                  className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5"
                    style={{
                      background: pct === null ? '#f1f5f9' : pct >= 70 ? '#dcfce7' : pct >= 50 ? '#fef9c3' : '#fef2f2',
                      color: pct === null ? '#94a3b8' : pct >= 70 ? '#15803d' : pct >= 50 ? '#a16207' : '#dc2626',
                    }}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      {q.week_number && <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700">Sem. {q.week_number}</span>}
                      <span className="text-xs font-semibold" style={{ color: DIFF_COLOR[q.difficulty] ?? '#64748b' }}>{q.difficulty}</span>
                      {pct !== null && (
                        <span className="text-xs font-bold ml-auto" style={{ color: pct >= 70 ? '#15803d' : pct >= 50 ? '#a16207' : '#dc2626' }}>
                          {pct}% correcto
                        </span>
                      )}
                      {pct === null && <span className="text-xs text-gray-400 ml-auto">Sin respuestas</span>}
                    </div>
                    <p className="text-sm font-medium text-gray-800 leading-snug line-clamp-2">{q.question_text}</p>
                  </div>
                  <span className="text-gray-400 text-xs flex-shrink-0 mt-1">{isExpanded ? '▲' : '▼'}</span>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t px-4 py-4 space-y-4">
                    {((q.image_urls && q.image_urls.length > 0) || q.image_url) && (
                      <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
                        {(q.image_urls && q.image_urls.length > 0 ? q.image_urls : [q.image_url!]).map((url, idx) => (
                          <img key={idx} src={url} alt={`Diagrama ${idx + 1}`} className="max-h-40 rounded-lg border object-contain" />
                        ))}
                      </div>
                    )}
                    <p className="text-sm font-semibold text-gray-800">{q.question_text}</p>

                    {/* Options with correct highlighted */}
                    <div className="space-y-1.5">
                      {OPTIONS.map(opt => {
                        const isCorrect = opt === q.correct_option
                        const text = q[`option_${opt}` as keyof Question] as string
                        return (
                          <div key={opt} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
                            style={{
                              background: isCorrect ? '#f0fdf4' : '#f8fafc',
                              border: `1px solid ${isCorrect ? '#86efac' : '#e2e8f0'}`,
                              color: isCorrect ? '#15803d' : '#374151',
                              fontWeight: isCorrect ? 600 : 400,
                            }}>
                            <span className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold flex-shrink-0"
                              style={{ background: isCorrect ? '#16a34a' : '#e2e8f0', color: isCorrect ? '#fff' : '#64748b' }}>
                              {OPTION_LABELS[opt]}
                            </span>
                            {text}
                            {isCorrect && <span className="text-xs ml-auto">← correcta</span>}
                          </div>
                        )
                      })}
                    </div>

                    {/* Answer distribution */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Distribución de respuestas</p>
                      <AnswerBar question={q} attempts={attempts} />
                    </div>

                    {/* Who answered what */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Respuestas por candidato</p>
                      <div className="space-y-1">
                        {allCandidates.map(c => {
                          const ans = findAnswer(attempts, c.id, q.id)
                          if (!ans) return (
                            <div key={c.id} className="flex items-center gap-2 text-sm text-gray-400 py-1">
                              <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-xs">–</span>
                              <span>{c.full_name}</span>
                              <span className="text-xs">no completó</span>
                            </div>
                          )
                          const isCorrect = ans.selected_option === q.correct_option
                          return (
                            <div key={c.id} className="flex items-center gap-2 text-sm py-1">
                              <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                                style={{ background: isCorrect ? '#dcfce7' : '#fef2f2', color: isCorrect ? '#15803d' : '#dc2626' }}>
                                {isCorrect ? '✓' : '✗'}
                              </span>
                              <span className="flex-1 text-gray-700">{c.full_name}</span>
                              <span className="text-xs font-semibold px-1.5 py-0.5 rounded"
                                style={{ background: isCorrect ? '#dcfce7' : '#fef2f2', color: isCorrect ? '#15803d' : '#dc2626' }}>
                                {OPTION_LABELS[ans.selected_option]}: {q[`option_${ans.selected_option as 'a' | 'b' | 'c' | 'd'}` as keyof Question] as string}
                              </span>
                              {ans.used_translation && <span className="text-xs text-gray-400">usó traducción</span>}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ─── Matrix view (candidates × questions) ─── */}
      {view === 'matrix' && (
        <div className="bg-white rounded-xl border overflow-x-auto">
          <table className="text-sm w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 font-semibold text-gray-700 whitespace-nowrap sticky left-0 bg-gray-50 z-10">Candidato</th>
                <th className="px-3 py-3 font-semibold text-gray-700 whitespace-nowrap">Puntuación</th>
                {questions.map((q, i) => (
                  <th key={q.id} className="px-2 py-3 font-semibold text-gray-500 text-center" title={q.question_text}>
                    Q{i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allCandidates.map(c => {
                const attempt = latestAttempts.get(c.id)
                const dailyAnswers = attempt?.answers?.filter(a => dailyQuestionIds.has(a.question_id)) ?? []
                const score = dailyAnswers.filter(a => a.is_correct).length
                const total = dailyAnswers.length

                return (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-800 whitespace-nowrap sticky left-0 bg-white z-10">
                      {c.full_name}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {total === 0 ? (
                        <span className="text-gray-400 text-xs">—</span>
                      ) : (
                        <span className="font-bold text-sm" style={{ color: score / total >= 0.7 ? '#15803d' : score / total >= 0.5 ? '#d97706' : '#dc2626' }}>
                          {score}/{total}
                        </span>
                      )}
                    </td>
                    {questions.map(q => {
                      const ans = findAnswer(attempts, c.id, q.id)
                      if (!ans) return (
                        <td key={q.id} className="px-2 py-2.5 text-center text-gray-300 text-xs">—</td>
                      )
                      const isCorrect = ans.selected_option === q.correct_option
                      return (
                        <td key={q.id} className="px-2 py-2.5 text-center" title={`${c.full_name} → ${OPTION_LABELS[ans.selected_option]}`}>
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold"
                            style={{ background: isCorrect ? '#dcfce7' : '#fef2f2', color: isCorrect ? '#15803d' : '#dc2626' }}>
                            {OPTION_LABELS[ans.selected_option]}
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {participated === 0 && (
        <div className="bg-white rounded-xl border p-8 text-center">
          <p className="text-gray-400">Ningún candidato ha completado este quiz todavía.</p>
          <p className="text-sm text-gray-300 mt-1">Los resultados aparecerán aquí una vez que los candidatos respondan.</p>
        </div>
      )}
    </div>
  )
}
