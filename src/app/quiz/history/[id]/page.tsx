export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import type { AnswerRecord, Option, Question, CaseSetWithImages } from '@/types/database'

const OPTIONS: Option[] = ['a', 'b', 'c', 'd', 'e', 'f']

const OPTION_LABELS: Record<Option, string> = { a: 'A', b: 'B', c: 'C', d: 'D', e: 'E', f: 'F' }

const darkPage: React.CSSProperties = {
  minHeight: '100vh',
  backgroundColor: '#0b0f19',
  backgroundImage:
    'radial-gradient(at 0% 0%, rgba(99,102,241,0.12) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(168,85,247,0.12) 0px, transparent 50%)',
  color: '#f8fafc',
  fontFamily: 'var(--font-sans), sans-serif',
}

type FullQuestion = Pick<
  Question,
  | 'id'
  | 'track'
  | 'difficulty'
  | 'is_legacy'
  | 'question_text'
  | 'question_text_es'
  | 'option_a'
  | 'option_b'
  | 'option_c'
  | 'option_d'
  | 'option_e'
  | 'option_f'
  | 'option_a_es'
  | 'option_b_es'
  | 'option_c_es'
  | 'option_d_es'
  | 'option_e_es'
  | 'option_f_es'
  | 'correct_option'
  | 'explanation'
  | 'explanation_es'
  | 'chapter_tag'
  | 'image_url'
  | 'image_urls'
  | 'case_set_id'
> & {
  case_set?: CaseSetWithImages | null
}

export default async function AttemptReviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch the attempt (user-scoped — RLS ensures ownership)
  const { data: attempt } = await supabase
    .from('quiz_attempts')
    .select('id, track, week_number, score, total_questions, completed_at, mode, answers')
    .eq('id', id)
    .maybeSingle()

  if (!attempt) notFound()

  const answers: AnswerRecord[] = attempt.answers ?? []
  const questionIds = answers.map((a) => a.question_id)

  // Fetch full question data server-side with admin client (includes correct_option + explanations)
  const adminDb = createAdminClient()
  const { data: rawQuestions } = await adminDb
    .from('questions')
    .select(
      'id, track, difficulty, is_legacy, question_text, question_text_es, option_a, option_b, option_c, option_d, option_e, option_f, option_a_es, option_b_es, option_c_es, option_d_es, option_e_es, option_f_es, correct_option, explanation, explanation_es, chapter_tag, image_url, image_urls, context_text, case_set_id, case_set:case_sets(*, images:case_images(*))'
    )
    .in('id', questionIds)

  const parsedQuestions = (rawQuestions ?? []).map((q) => {
    const rawCaseSet = (q as any).case_set
    const caseSet = Array.isArray(rawCaseSet) ? rawCaseSet[0] : rawCaseSet
    if (caseSet && Array.isArray(caseSet.images)) {
      caseSet.images = [...caseSet.images].sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0))
    }
    return {
      ...q,
      case_set: caseSet || null
    } as unknown as FullQuestion
  })

  const questionMap = new Map<string, FullQuestion>(
    parsedQuestions.map((q) => [q.id, q])
  )

  // Build ordered review items preserving attempt answer order
  const reviewItems = answers.map((ans) => ({
    answer: ans,
    question: questionMap.get(ans.question_id) ?? null,
  }))

  const correctCount = answers.filter((a) => a.is_correct).length
  const pct = Math.round((correctCount / attempt.total_questions) * 100)
  const color = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#f43f5e'

  const dateStr = new Date(attempt.completed_at).toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const MODE_LABEL: Record<string, string> = { weekly: 'Quiz Diario', review: 'Repaso' }

  return (
    <div style={darkPage}>
      {/* Top bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 1.5rem',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 800,
            fontSize: '1rem',
            background: 'linear-gradient(135deg, #fff 0%, #a5b4fc 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Viva Dental Prep
        </span>
        <Link
          href="/quiz/history"
          style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 500 }}
        >
          ← Historial
        </Link>
      </div>

      <main style={{ maxWidth: 740, margin: '0 auto', padding: '2rem 1rem 4rem' }}>
        {/* Header summary */}
        <div
          style={{
            background: 'rgba(20,30,54,0.8)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 20,
            padding: '1.5rem',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1.5rem',
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              border: `3px solid ${color}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              background: `${color}15`,
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 800,
                fontSize: '1.2rem',
                color,
              }}
            >
              {pct}%
            </span>
          </div>
          <div>
            <h1
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.3rem',
                fontWeight: 800,
                color: '#f8fafc',
                margin: '0 0 0.25rem',
                textTransform: 'capitalize',
              }}
            >
              {dateStr}
            </h1>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '0.15rem 0.5rem',
                  borderRadius: 99,
                  background: 'rgba(99,102,241,0.15)',
                  color: '#a5b4fc',
                }}
              >
                {attempt.track === 'nbdhe' ? 'NBDHE' : 'Juris.'}
              </span>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  padding: '0.15rem 0.5rem',
                  borderRadius: 99,
                  background: 'rgba(255,255,255,0.05)',
                  color: '#64748b',
                }}
              >
                {MODE_LABEL[attempt.mode] ?? attempt.mode}
              </span>
              {attempt.week_number && (
                <span style={{ fontSize: '0.72rem', color: '#475569' }}>
                  Sem. {attempt.week_number}
                </span>
              )}
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                {correctCount}/{attempt.total_questions} correctas
              </span>
            </div>
          </div>
        </div>

        {/* Question cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {reviewItems.map(({ answer, question }, idx) => {
            if (!question) return null
            const isCorrect = answer.is_correct
            const selected = answer.selected_option
            const correct = question.correct_option

            const prevItem = idx > 0 ? reviewItems[idx - 1] : null
            const prevQuestion = prevItem ? prevItem.question : null
            const showCaseHeader = question.case_set && (!prevQuestion || prevQuestion.case_set_id !== question.case_set_id)

            return (
              <div key={answer.question_id} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {showCaseHeader && question.case_set && (
                  <div
                    style={{
                      background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(168,85,247,0.08) 100%)',
                      border: '1px solid rgba(168,85,247,0.2)',
                      borderRadius: 16,
                      padding: '1.25rem',
                      marginTop: '0.5rem',
                    }}
                  >
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#c084fc', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
                      Usa {question.case_set.case_label} para responder las siguientes preguntas:
                    </div>
                    {question.case_set.description && (
                      <p style={{ fontSize: '0.88rem', color: '#cbd5e1', lineHeight: 1.45, margin: '0 0 0.5rem', maxHeight: 180, overflowY: 'auto' }}>
                        {question.case_set.description}
                      </p>
                    )}
                    {question.case_set.case_type === 'patient' && question.case_set.patient_data && (
                      <div style={{ borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden', fontSize: '0.78rem', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <tbody>
                            {Object.entries(question.case_set.patient_data as Record<string, string>).map(([k, v]) => (
                              <tr key={k} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                <td style={{ padding: '0.4rem 0.6rem', fontWeight: 600, color: '#a5b4fc', background: 'rgba(255,255,255,0.01)', width: '35%', textTransform: 'capitalize' }}>
                                  {k.replace(/_/g, ' ')}
                                </td>
                                <td style={{ padding: '0.4rem 0.6rem', color: '#cbd5e1' }}>{v}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {question.case_set.images && question.case_set.images.length > 0 && (
                      <div style={{ display: 'flex', gap: '0.6rem', overflowX: 'auto', marginTop: '0.5rem', paddingBottom: '0.4rem' }}>
                        {question.case_set.images.map((img, imgIdx) => (
                          <div key={img.id} style={{ position: 'relative', flexShrink: 0, maxWidth: '80%', width: 220, borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <img src={img.image_url} alt={img.caption || `Case image ${imgIdx + 1}`} style={{ width: '100%', height: 130, objectFit: 'contain', background: '#000' }} />
                            {question.case_set!.images!.length > 1 && (
                              <span style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '0.6rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: 4 }}>
                                {imgIdx + 1} / {question.case_set!.images!.length}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div
                  key={answer.question_id}
                  style={{
                    background: 'rgba(20,30,54,0.7)',
                    border: `1px solid ${isCorrect ? 'rgba(16,185,129,0.25)' : 'rgba(244,63,94,0.2)'}`,
                    borderRadius: 18,
                    padding: '1.5rem',
                  }}
                >
                {/* Question header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    marginBottom: '1rem',
                  }}
                >
                  <span
                    style={{
                      flexShrink: 0,
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: isCorrect ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)',
                      border: `1.5px solid ${isCorrect ? '#10b981' : '#f43f5e'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: isCorrect ? '#10b981' : '#f43f5e',
                    }}
                  >
                    {idx + 1}
                  </span>
                  <div style={{ flex: 1 }}>
                    {answer.used_translation && (
                      <span
                        style={{
                          display: 'inline-block',
                          fontSize: '0.68rem',
                          fontWeight: 600,
                          padding: '0.1rem 0.45rem',
                          borderRadius: 99,
                          background: 'rgba(168,85,247,0.15)',
                          color: '#c084fc',
                          marginBottom: '0.4rem',
                        }}
                      >
                        vio traducción
                      </span>
                    )}
                    {question.chapter_tag && (
                      <span
                        style={{
                          display: 'inline-block',
                          marginLeft: answer.used_translation ? '0.4rem' : 0,
                          fontSize: '0.68rem',
                          fontWeight: 600,
                          padding: '0.1rem 0.45rem',
                          borderRadius: 99,
                          background: 'rgba(255,255,255,0.05)',
                          color: '#475569',
                          marginBottom: '0.4rem',
                        }}
                      >
                        {question.chapter_tag}
                      </span>
                    )}
                    {((question.image_urls && question.image_urls.length > 0) || question.image_url) && (
                      <div style={{ display: 'flex', gap: '0.6rem', overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: '0.75rem', WebkitOverflowScrolling: 'touch' }}>
                        {(question.image_urls && question.image_urls.length > 0
                          ? question.image_urls
                          : [question.image_url!]
                        ).map((url, imgIdx) => (
                          <div key={imgIdx} style={{ position: 'relative', flexShrink: 0, maxWidth: (question.image_urls && question.image_urls.length > 1) ? '80%' : '100%', width: (question.image_urls && question.image_urls.length > 1) ? 220 : '100%', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={url}
                              alt={`Diagrama ${imgIdx + 1}`}
                              style={{
                                display: 'block',
                                maxWidth: '100%',
                                maxHeight: 200,
                                objectFit: 'contain',
                              }}
                            />
                            {(question.image_urls && question.image_urls.length > 1) && (
                              <span style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '0.6rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: 4 }}>
                                {imgIdx + 1} / {question.image_urls.length}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    <p style={{ color: '#e2e8f0', fontSize: '0.95rem', lineHeight: 1.55, margin: 0 }}>
                      {question.question_text}
                    </p>
                    {question.question_text_es && (
                      <p
                        style={{
                          color: '#64748b',
                          fontSize: '0.82rem',
                          lineHeight: 1.5,
                          marginTop: '0.35rem',
                          marginBottom: 0,
                          fontStyle: 'italic',
                        }}
                      >
                        {question.question_text_es}
                      </p>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {OPTIONS.filter(opt => opt === 'a' || opt === 'b' || Boolean(question[`option_${opt}` as keyof FullQuestion])).map((opt) => {
                    const optText = question[`option_${opt}` as keyof FullQuestion] as string
                    const optTextEs = question[`option_${opt}_es` as keyof FullQuestion] as string | null

                    const isSelected = selected === opt
                    const isCorrectOpt = correct === opt
                    const isWrong = isSelected && !isCorrectOpt

                    let bg = 'rgba(255,255,255,0.03)'
                    let border = 'rgba(255,255,255,0.06)'
                    let labelColor = '#64748b'
                    let textColor = '#94a3b8'

                    if (isCorrectOpt) {
                      bg = 'rgba(16,185,129,0.1)'
                      border = 'rgba(16,185,129,0.35)'
                      labelColor = '#10b981'
                      textColor = '#d1fae5'
                    } else if (isWrong) {
                      bg = 'rgba(244,63,94,0.08)'
                      border = 'rgba(244,63,94,0.3)'
                      labelColor = '#f43f5e'
                      textColor = '#fda4af'
                    }

                    return (
                      <div
                        key={opt}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.6rem',
                          background: bg,
                          border: `1px solid ${border}`,
                          borderRadius: 10,
                          padding: '0.6rem 0.85rem',
                        }}
                      >
                        <span
                          style={{
                            flexShrink: 0,
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            background: isCorrectOpt
                              ? 'rgba(16,185,129,0.2)'
                              : isWrong
                              ? 'rgba(244,63,94,0.15)'
                              : 'rgba(255,255,255,0.04)',
                            border: `1.5px solid ${border}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            color: labelColor,
                          }}
                        >
                          {OPTION_LABELS[opt]}
                        </span>
                        <div>
                          <p style={{ color: textColor, fontSize: '0.88rem', margin: 0, lineHeight: 1.45 }}>
                            {optText}
                          </p>
                          {optTextEs && (
                            <p
                              style={{
                                color: '#475569',
                                fontSize: '0.77rem',
                                margin: '0.15rem 0 0',
                                fontStyle: 'italic',
                              }}
                            >
                              {optTextEs}
                            </p>
                          )}
                        </div>
                        {isCorrectOpt && (
                          <span style={{ marginLeft: 'auto', color: '#10b981', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>
                            ✓ correcta
                          </span>
                        )}
                        {isWrong && (
                          <span style={{ marginLeft: 'auto', color: '#f43f5e', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>
                            tu respuesta
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Explanation */}
                {question.explanation && (
                  <div
                    style={{
                      marginTop: '1rem',
                      padding: '0.85rem 1rem',
                      background: 'rgba(99,102,241,0.07)',
                      border: '1px solid rgba(99,102,241,0.15)',
                      borderRadius: 12,
                    }}
                  >
                    <p
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: '#6366f1',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        marginBottom: '0.35rem',
                      }}
                    >
                      Explicación
                    </p>
                    <p style={{ color: '#c7d2fe', fontSize: '0.88rem', lineHeight: 1.55, margin: 0 }}>
                      {question.explanation}
                    </p>
                    {question.explanation_es && (
                      <p
                        style={{
                          color: '#64748b',
                          fontSize: '0.82rem',
                          lineHeight: 1.5,
                          marginTop: '0.5rem',
                          marginBottom: 0,
                          fontStyle: 'italic',
                        }}
                      >
                        {question.explanation_es}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
          })}
        </div>

        {/* Footer nav */}
        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
          <Link
            href="/quiz/history"
            style={{
              padding: '0.65rem 1.25rem',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12,
              color: '#94a3b8',
              textDecoration: 'none',
              fontSize: '0.85rem',
              fontWeight: 600,
            }}
          >
            ← Historial
          </Link>
          <Link
            href="/quiz"
            style={{
              padding: '0.65rem 1.25rem',
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              borderRadius: 12,
              color: '#fff',
              textDecoration: 'none',
              fontSize: '0.85rem',
              fontWeight: 700,
            }}
          >
            Nuevo quiz →
          </Link>
        </div>
      </main>
    </div>
  )
}
