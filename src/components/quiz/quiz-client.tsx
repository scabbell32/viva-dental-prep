'use client'

import { useState, useRef, useEffect } from 'react'
import { QuestionText } from '@/components/quiz/question-text'
import type { SafeQuestion, Track, Option, DraftAnswer, EnglishLevel, SubmitResponse, CaseImage } from '@/types/database'

const OPTIONS: Option[] = ['a', 'b', 'c', 'd', 'e', 'f']
const OPTION_LABELS: Record<Option, string> = { a: 'A', b: 'B', c: 'C', d: 'D', e: 'E', f: 'F' }

const CARD: React.CSSProperties = {
  background: 'rgba(20,30,54,0.85)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 24, padding: '2.5rem',
  boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
}

const BTN_PRIMARY: React.CSSProperties = {
  padding: '1rem 1.75rem', borderRadius: 14,
  fontFamily: 'var(--font-heading), sans-serif', fontSize: '0.95rem', fontWeight: 700,
  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
  border: 'none', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
  color: '#fff', boxShadow: '0 4px 15px rgba(99,102,241,0.35)',
}

const BTN_SECONDARY: React.CSSProperties = {
  padding: '1rem 1.75rem', borderRadius: 14,
  fontFamily: 'var(--font-heading), sans-serif', fontSize: '0.95rem', fontWeight: 700,
  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
  background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)',
}

interface ShuffledQuestion {
  q: SafeQuestion
  optionOrder: Option[]
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function shuffleKeepingGroupsTogether<T extends { case_set_id?: string | null; sequence_order?: number | null }>(arr: T[]): T[] {
  const groups: Record<string, T[]> = {}
  const standalones: T[][] = []

  arr.forEach(item => {
    if (item.case_set_id) {
      if (!groups[item.case_set_id]) {
        groups[item.case_set_id] = []
      }
      groups[item.case_set_id].push(item)
    } else {
      standalones.push([item])
    }
  })

  // Sort case questions within each group by sequence_order if present
  Object.keys(groups).forEach(key => {
    groups[key].sort((a, b) => {
      const seqA = a.sequence_order ?? 0
      const seqB = b.sequence_order ?? 0
      return seqA - seqB
    })
  })

  const allGroups = [...Object.values(groups), ...standalones]
  const shuffledGroups = shuffle(allGroups)
  return shuffledGroups.flat()
}

function getCaseRange<T extends { case_set_id?: string | null }>(questions: T[], currentIdx: number): { start: number; end: number } | null {
  const currentItem = questions[currentIdx]
  if (!currentItem || !currentItem.case_set_id) return null

  const targetId = currentItem.case_set_id
  let start = currentIdx
  while (start > 0 && questions[start - 1].case_set_id === targetId) {
    start--
  }

  let end = currentIdx
  while (end < questions.length - 1 && questions[end + 1].case_set_id === targetId) {
    end++
  }

  return { start: start + 1, end: end + 1 }
}

// Phrases that must always display last — "all of the above", "none of the above", etc.
const ANCHOR_PHRASES = [
  'all of the above', 'none of the above', 'all of these', 'none of these',
  'both of the above', 'todas las anteriores', 'ninguna de las anteriores',
  'todas las opciones', 'ninguna de las opciones',
]

function isAnchorOption(q: SafeQuestion, opt: Option): boolean {
  const en = (q[`option_${opt}` as keyof SafeQuestion] as string | null ?? '').toLowerCase()
  const es = (q[`option_${opt}_es` as keyof SafeQuestion] as string | null ?? '').toLowerCase()
  return ANCHOR_PHRASES.some(p => en.includes(p) || es.includes(p))
}

// Shuffle options but keep any "all/none of the above" style options pinned to the end
function shuffleKeepAnchorsLast(q: SafeQuestion): Option[] {
  const available = OPTIONS.filter(o => {
    if (o === 'a' || o === 'b') return true
    return Boolean(q[`option_${o}` as keyof SafeQuestion])
  })
  const anchors = available.filter(o => isAnchorOption(q, o))
  const normal  = available.filter(o => !isAnchorOption(q, o))
  return [...shuffle(normal), ...anchors]
}

// Returns reveal config based on english_level for the English quiz phase.
// English is always primary in the English phase; level controls Spanish fallback access.
function getLangConfig(level: EnglishLevel | null) {
  if (level === 'advanced') return { revealLabel: 'ES', compact: true }
  return { revealLabel: 'Ver en español', compact: false }
}

const LANGUAGE_TIPS = [
  { label: 'EXCEPT / NOT', tip: 'Busca el que NO pertenece al grupo. Todas las otras opciones son correctas — solo una no lo es.' },
  { label: 'BEST / MOST APPROPRIATE', tip: 'Puede haber varias respuestas correctas. Elige la más fuerte, la más directa, o la más segura para el paciente.' },
  { label: 'FIRST / INITIAL', tip: 'El primer paso del proceso, no el diagnóstico final. Suele ser evaluación antes de tratamiento.' },
  { label: 'MOST LIKELY', tip: 'Probabilidad, no certeza. Piensa en la condición más común que produce esos síntomas.' },
  { label: 'Palabras absolutas', tip: '"Always" y "never" casi nunca son correctas en preguntas de examen.' },
  { label: 'Doble negativo', tip: 'Lee con cuidado preguntas como "which is NOT least likely." Relee la pregunta completa antes de responder.' },
]

interface Props {
  questions: SafeQuestion[]
  track: Track
  weekNumber: number
  englishLevel: EnglishLevel
  spanishMode: boolean
  mode?: 'weekly' | 'review'
}

type Phase = 'spanish-quiz' | 'spanish-break' | 'english-quiz' | 'final-results'

export function QuizClient({ questions, track, weekNumber, englishLevel, spanishMode, mode = 'weekly' }: Props) {
  const [phase, setPhase] = useState<Phase>(spanishMode ? 'spanish-quiz' : 'english-quiz')
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<Option | null>(null)
  const [spanishAnswers, setSpanishAnswers] = useState<DraftAnswer[]>([])
  const [englishAnswers, setEnglishAnswers] = useState<DraftAnswer[]>([])
  const [spanishResult, setSpanishResult] = useState<SubmitResponse | null>(null)
  const [englishResult, setEnglishResult] = useState<SubmitResponse | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [studyStack, setStudyStack] = useState<Set<string>>(new Set())
  const [stackAdding, setStackAdding] = useState<Set<string>>(new Set())
  // Tracks which question IDs had a translation revealed this attempt (monotonic)
  const revealedRef = useRef<Set<string>>(new Set())
  // Display state for options translation toggle (resets on navigation)
  const [showOptionsES, setShowOptionsES] = useState(false)

  // localQuestions allows reshuffling on retake without a page reload
  const [localQuestions, setLocalQuestions] = useState<SafeQuestion[]>(() => shuffleKeepingGroupsTogether([...questions]))
  const [englishPhase, setEnglishPhase] = useState<ShuffledQuestion[]>(() =>
    shuffleKeepingGroupsTogether([...questions]).map(q => ({ q, optionOrder: shuffleKeepAnchorsLast(q) }))
  )

  function resetQuiz() {
    const reordered = shuffleKeepingGroupsTogether([...questions])
    setLocalQuestions(reordered)
    setEnglishPhase(shuffleKeepingGroupsTogether([...reordered]).map(q => ({ q, optionOrder: shuffleKeepAnchorsLast(q) })))
    setPhase(spanishMode ? 'spanish-quiz' : 'english-quiz')
    setCurrent(0)
    setSelected(null)
    setSpanishAnswers([])
    setEnglishAnswers([])
    setSpanishResult(null)
    setEnglishResult(null)
    setSubmitting(false)
    setSubmitError(null)
    revealedRef.current = new Set()
    setShowOptionsES(false)
  }

  const n = localQuestions.length
  const grandTotal = spanishMode ? n * 2 : n
  const spOffset = spanishMode ? n : 0
  const langCfg = getLangConfig(englishLevel)

  const spCircleRef = useRef<SVGCircleElement>(null)
  const enCircleRef = useRef<SVGCircleElement>(null)

  // Per-question countdown timer (30s, resets on each question/phase change)
  const [timeLeft, setTimeLeft] = useState(30)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const isActiveQuiz = phase === 'spanish-quiz' || phase === 'english-quiz'
    if (!isActiveQuiz) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }
    setTimeLeft(30)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setTimeLeft(t => (t <= 1 ? 0 : t - 1))
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [current, phase]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase !== 'final-results') return
    const C = 440
    if (spanishResult && spCircleRef.current) {
      const offset = C - C * (spanishResult.score / spanishResult.total)
      setTimeout(() => { if (spCircleRef.current) spCircleRef.current.style.strokeDashoffset = String(offset) }, 200)
    }
    if (englishResult && enCircleRef.current) {
      const offset = C - C * (englishResult.score / englishResult.total)
      setTimeout(() => { if (enCircleRef.current) enCircleRef.current.style.strokeDashoffset = String(offset) }, 500)
    }
  }, [phase, spanishResult, englishResult])

  function getOptionText(q: SafeQuestion, opt: Option): string {
    return q[`option_${opt}` as keyof SafeQuestion] as string
  }

  function getEsText(q: SafeQuestion, opt: Option): string {
    const es = q[`option_${opt}_es` as keyof SafeQuestion] as string | null
    return es || getOptionText(q, opt)
  }

  function markRevealed(questionId: string) {
    revealedRef.current.add(questionId)
  }

  async function addToStudyStack(questionId: string) {
    if (studyStack.has(questionId) || stackAdding.has(questionId)) return
    setStackAdding(prev => new Set(prev).add(questionId))
    try {
      await fetch('/api/study-stack/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_id: questionId }),
      })
      setStudyStack(prev => new Set(prev).add(questionId))
    } finally {
      setStackAdding(prev => { const s = new Set(prev); s.delete(questionId); return s })
    }
  }

  function navigate(
    phaseAnswers: DraftAnswer[],
    setAnswers: (a: DraftAnswer[]) => void,
    questionId: string,
    direction: 'next' | 'prev',
    onFinish: (a: DraftAnswer[]) => void
  ) {
    if (direction === 'prev') {
      if (current === 0) return
      if (selected) {
        const saved = [...phaseAnswers]
        saved[current] = {
          question_id: questionId,
          selected_option: selected,
          used_translation: phase === 'english-quiz' ? revealedRef.current.has(questionId) : false,
        }
        setAnswers(saved)
      }
      const prevIdx = current - 1
      setCurrent(prevIdx)
      setSelected(phaseAnswers[prevIdx]?.selected_option ?? null)
      setShowOptionsES(false)
      return
    }

    if (!selected) return
    const newAnswers = [...phaseAnswers]
    newAnswers[current] = {
      question_id: questionId,
      selected_option: selected,
      used_translation: phase === 'english-quiz' ? revealedRef.current.has(questionId) : false,
    }
    setAnswers(newAnswers)
    setShowOptionsES(false)

    if (current + 1 < n) {
      const nextIdx = current + 1
      setCurrent(nextIdx)
      setSelected(newAnswers[nextIdx]?.selected_option ?? null)
    } else {
      onFinish(newAnswers)
    }
  }

  async function submitAnswers(answers: DraftAnswer[], endpoint: string): Promise<SubmitResponse | null> {
    const complete = answers.filter(Boolean)
    if (complete.length !== n) {
      const firstHole = answers.findIndex(a => !a)
      setCurrent(firstHole === -1 ? 0 : firstHole)
      setSelected(null)
      return null
    }
    setSubmitting(true)
    setSubmitError(null)
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ track, week_number: weekNumber, answers: complete, mode }),
    })
    setSubmitting(false)
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      const msg = body?.error ?? `HTTP ${res.status}`
      console.error('[quiz submit]', res.status, body)
      setSubmitError(msg)
      return null
    }
    return res.json()
  }

  async function finishSpanishPhase(answers: DraftAnswer[]) {
    const result = await submitAnswers(answers, '/api/quiz/submit')
    if (!result) return
    setSpanishResult(result)
    setCurrent(0); setSelected(null); setShowOptionsES(false)
    setPhase('spanish-break')
  }

  async function finishEnglishPhase(answers: DraftAnswer[]) {
    const result = await submitAnswers(answers, '/api/quiz/grade')
    if (!result) return
    setEnglishResult(result)
    setPhase('final-results')
  }

  // ── Shared quiz card ───────────────────────────────────────────────────────

  function renderQuizCard(
    questionNode: React.ReactNode,
    displayOptions: { opt: Option; primary: string; secondary: string | null }[],
    questionId: string,
    phaseAnswers: DraftAnswer[],
    setAnswers: (a: DraftAnswer[]) => void,
    onFinish: (a: DraftAnswer[]) => void,
    phaseLabel: string,
    phaseOffset: number,
    isEnglishPhase: boolean
  ) {
    const hasAnySecondary = displayOptions.some(o => o.secondary)

    const q = isEnglishPhase ? englishPhase[current]?.q : localQuestions[current]
    const caseSet = q?.case_set
    let caseRangeText = ''
    if (caseSet && q) {
      const activeQs = isEnglishPhase ? englishPhase.map(x => x.q) : localQuestions
      const range = getCaseRange(activeQs, current)
      if (range) {
        if (range.start === range.end) {
          caseRangeText = isEnglishPhase
            ? `Use ${caseSet.case_label} to answer question ${range.start}`
            : `Usa ${caseSet.case_label} para responder la pregunta ${range.start}`
        } else {
          caseRangeText = isEnglishPhase
            ? `Use ${caseSet.case_label} to answer questions ${range.start} - ${range.end}`
            : `Usa ${caseSet.case_label} para responder las preguntas ${range.start} - ${range.end}`
        }
      }
    }

    const timerUrgent = timeLeft <= 5
    const timerWarn   = timeLeft <= 10 && timeLeft > 5
    const timerColor  = timerUrgent ? '#f43f5e' : timerWarn ? '#f97316' : '#94a3b8'
    const timerBg     = timerUrgent ? 'rgba(244,63,94,0.12)' : timerWarn ? 'rgba(249,115,22,0.1)' : 'rgba(255,255,255,0.05)'
    const timerBorder = timerUrgent ? 'rgba(244,63,94,0.35)' : timerWarn ? 'rgba(249,115,22,0.3)' : 'rgba(255,255,255,0.08)'

    return (
      <div>
        {/* Flash keyframe — injected once, harmless if repeated */}
        <style>{`@keyframes vdp-flash{0%,100%{opacity:1}50%{opacity:0.25}}`}</style>
        <div style={{ marginBottom: '1.25rem', padding: '0 0.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: '0.8rem', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {phaseLabel}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              {timeLeft === 0 && (
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f43f5e', animation: 'vdp-flash 0.6s ease-in-out infinite' }}>
                  ⚡ ¡Decide ya!
                </span>
              )}
              <span
                aria-live="polite"
                aria-label={`${timeLeft} segundos restantes`}
                style={{
                  fontSize: '0.78rem', fontWeight: 700, color: timerColor,
                  background: timerBg, border: `1px solid ${timerBorder}`,
                  borderRadius: 99, padding: '0.2rem 0.6rem',
                  fontVariantNumeric: 'tabular-nums',
                  animation: timerUrgent && timeLeft > 0 ? 'vdp-flash 0.9s ease-in-out infinite' : 'none',
                  minWidth: '2.8rem', textAlign: 'center',
                }}
              >
                {timeLeft}s
              </span>
              <span style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 500 }}>
                {phaseOffset + current + 1} / {grandTotal}
              </span>
            </div>
          </div>
          <div
            role="progressbar"
            aria-valuenow={phaseOffset + current + 1}
            aria-valuemin={1}
            aria-valuemax={grandTotal}
            aria-label={`Progreso: pregunta ${phaseOffset + current + 1} de ${grandTotal}`}
            style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 99, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.02)' }}
          >
            <div style={{ height: '100%', width: `${((phaseOffset + current + 1) / grandTotal) * 100}%`, background: 'linear-gradient(90deg, #6366f1 0%, #a855f7 100%)', borderRadius: 99, transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)' }} />
          </div>
        </div>

        <div style={CARD}>
          {caseSet && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(168,85,247,0.1) 100%)',
              border: '1px solid rgba(168,85,247,0.25)',
              borderRadius: 16,
              padding: '1.15rem',
              marginBottom: '1.5rem',
              boxShadow: '0 4px 20px rgba(168,85,247,0.05)',
            }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#c084fc', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
                {caseRangeText}
              </div>
              
              {caseSet.description && (
                <div style={{ fontSize: '0.88rem', color: '#cbd5e1', lineHeight: 1.45, maxHeight: 180, overflowY: 'auto', paddingRight: '0.4rem', borderRight: '2px solid rgba(255,255,255,0.05)', marginBottom: '0.5rem' }}>
                  {caseSet.description}
                </div>
              )}

              {caseSet.case_type === 'patient' && caseSet.patient_data && (
                <div style={{ borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden', fontSize: '0.78rem', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      {Object.entries(caseSet.patient_data as Record<string, string>).map(([k, v]) => (
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

              {caseSet.images && caseSet.images.length > 0 && (
                <div style={{ marginTop: '0.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.6rem', overflowX: 'auto', paddingBottom: '0.4rem', WebkitOverflowScrolling: 'touch' }}>
                    {caseSet.images.map((img: CaseImage, imgIdx: number) => (
                      <div key={img.id} style={{ position: 'relative', flexShrink: 0, maxWidth: caseSet.images!.length > 1 ? '80%' : '100%', width: caseSet.images!.length > 1 ? 240 : '100%', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden', background: '#000', display: 'flex', flexDirection: 'column' }}>
                        <img src={img.image_url} alt={img.caption || `Case image ${imgIdx + 1}`} style={{ width: '100%', height: 140, objectFit: 'contain', background: '#000' }} />
                        {caseSet.images!.length > 1 && (
                          <span style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '0.6rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: 4 }}>
                            {imgIdx + 1} / {caseSet.images!.length}
                          </span>
                        )}
                        {img.caption && (
                          <div style={{ padding: '0.35rem 0.5rem', fontSize: '0.65rem', color: '#94a3b8', background: 'rgba(0,0,0,0.4)', borderTop: '1px solid rgba(255,255,255,0.04)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {img.caption}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {caseSet.images.length > 1 && (
                    <div style={{ fontSize: '0.65rem', color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.2rem', fontWeight: 600 }}>
                      <span>Desliza para ver más diagramas</span>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Question text with optional reveal */}
          <div
            id={`question-${questionId}`}
            style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', fontWeight: 700, lineHeight: 1.45, marginBottom: isEnglishPhase && hasAnySecondary ? '1rem' : '2rem', color: '#fff', letterSpacing: '-0.01em' }}
          >
            {questionNode}
          </div>

          {/* Options translation toggle (English phase only) */}
          {isEnglishPhase && hasAnySecondary && englishLevel !== 'advanced' && (
            <div style={{ marginBottom: '1.25rem' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (!showOptionsES) markRevealed(questionId)
                  setShowOptionsES(v => !v)
                }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                  background: showOptionsES ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.07)',
                  border: '1px solid rgba(99,102,241,0.25)',
                  borderRadius: 8, padding: '0.3rem 0.75rem',
                  fontSize: '0.75rem', fontWeight: 600, color: '#a5b4fc', cursor: 'pointer',
                }}
              >
                {showOptionsES ? '▲ Ocultar opciones en español' : '▼ Ver opciones en español'}
              </button>
            </div>
          )}

          <div
            role="radiogroup"
            aria-labelledby={`question-${questionId}`}
            style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}
          >
            {displayOptions.map(({ opt, primary, secondary }, optIdx) => {
              const isSelected = selected === opt
              const allOpts = displayOptions.map(o => o.opt)
              const isFocusable = isSelected || (!selected && optIdx === 0)
              return (
                <div
                  key={opt}
                  id={`option-${opt}-${questionId}`}
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={isFocusable ? 0 : -1}
                  onClick={() => setSelected(opt)}
                  onKeyDown={e => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault()
                      setSelected(opt)
                    } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                      e.preventDefault()
                      const next = allOpts[(optIdx + 1) % allOpts.length]
                      setSelected(next)
                      document.getElementById(`option-${next}-${questionId}`)?.focus()
                    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                      e.preventDefault()
                      const prev = allOpts[(optIdx - 1 + allOpts.length) % allOpts.length]
                      setSelected(prev)
                      document.getElementById(`option-${prev}-${questionId}`)?.focus()
                    }
                  }}
                  style={{
                    background: isSelected ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${isSelected ? '#6366f1' : 'rgba(255,255,255,0.06)'}`,
                    borderRadius: 16, padding: '1.15rem 1.5rem',
                    color: '#f8fafc', fontFamily: 'var(--font-sans)', fontSize: '1rem', fontWeight: 500,
                    textAlign: 'left', cursor: 'pointer',
                    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                    transition: 'all 0.25s cubic-bezier(0.16,1,0.3,1)',
                    boxShadow: isSelected ? '0 0 20px rgba(99,102,241,0.15)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', flexGrow: 1 }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0, marginRight: '1rem', marginTop: 1,
                      background: isSelected ? '#6366f1' : 'rgba(255,255,255,0.05)',
                      fontFamily: 'var(--font-heading)', fontWeight: 700,
                      fontSize: '0.9rem', color: isSelected ? '#fff' : '#94a3b8',
                      transition: 'all 0.25s',
                    }}>
                      {OPTION_LABELS[opt]}
                    </span>
                    <span style={{ display: 'block' }}>
                      <span>{primary}</span>
                      {isEnglishPhase && showOptionsES && secondary && (
                        <span style={{ display: 'block', marginTop: '0.3rem', fontSize: '0.85em', color: '#64748b', fontStyle: 'italic' }} lang="es">
                          {secondary}
                        </span>
                      )}
                      {/* Advanced: compact per-option ES button */}
                      {isEnglishPhase && englishLevel === 'advanced' && secondary && (
                        <QuestionText
                          primary=""
                          secondary={secondary}
                          revealLabel="ES"
                          secondaryLang="es"
                          compact
                          onReveal={() => markRevealed(questionId)}
                        />
                      )}
                    </span>
                  </div>
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%', flexShrink: 0, marginLeft: '1rem', marginTop: 3,
                    border: isSelected ? '2px solid #6366f1' : '2px solid rgba(255,255,255,0.15)',
                    background: isSelected ? '#6366f1' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.25s',
                  }}>
                    {isSelected && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <polyline points="1.5,5 4,8 8.5,2" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {submitError && (
            <div style={{ marginTop: '1.5rem', padding: '0.875rem 1.25rem', borderRadius: 12, background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', color: '#f43f5e', fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                <span>No se pudo guardar. Reinténtalo.</span>
                <button onClick={() => onFinish(phaseAnswers)} style={{ background: 'rgba(244,63,94,0.2)', border: '1px solid rgba(244,63,94,0.4)', color: '#f43f5e', borderRadius: 8, padding: '0.375rem 0.875rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                  Reintentar
                </button>
              </div>
              <span style={{ fontSize: '0.75rem', opacity: 0.7, fontFamily: 'monospace' }}>{submitError}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', gap: '1rem' }}>
            <button
              style={{ ...BTN_SECONDARY, opacity: current === 0 ? 0.3 : 1, cursor: current === 0 ? 'not-allowed' : 'pointer' }}
              onClick={() => navigate(phaseAnswers, setAnswers, questionId, 'prev', onFinish)}
              disabled={current === 0}
            >
              Anterior
            </button>
            <button
              style={{ ...BTN_PRIMARY, opacity: (!selected || submitting) ? 0.4 : 1, cursor: (!selected || submitting) ? 'not-allowed' : 'pointer' }}
              onClick={() => navigate(phaseAnswers, setAnswers, questionId, 'next', onFinish)}
              disabled={!selected || submitting}
            >
              {current + 1 === n
                ? (submitting ? 'Guardando...' : phase === 'spanish-quiz' ? 'Ver Resultados en Español' : 'Finalizar y Calificar')
                : 'Siguiente'}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Phase: Spanish Quiz ────────────────────────────────────────────────────

  if (phase === 'spanish-quiz') {
    const q = localQuestions[current]
    const currentImages = (q.image_urls && q.image_urls.length > 0) ? q.image_urls : (q.image_url ? [q.image_url] : [])
    return renderQuizCard(
      <>
        {currentImages.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.6rem', overflowX: 'auto', paddingBottom: '0.4rem', WebkitOverflowScrolling: 'touch' }}>
              {currentImages.map((url, idx) => (
                <div key={idx} style={{ position: 'relative', flexShrink: 0, maxWidth: currentImages.length > 1 ? '80%' : '100%', width: currentImages.length > 1 ? 240 : '100%', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={url} alt={`Diagrama ${idx + 1}`} style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain' }} />
                  {currentImages.length > 1 && (
                    <span style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '0.6rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: 4 }}>
                      {idx + 1} / {currentImages.length}
                    </span>
                  )}
                </div>
              ))}
            </div>
            {currentImages.length > 1 && (
              <div style={{ fontSize: '0.65rem', color: '#6366f1', display: 'flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.2rem', fontWeight: 600 }}>
                <span>Desliza para ver más diagramas</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </div>
            )}
          </div>
        )}
        <span>{current + 1}. {q.question_text_es || q.question_text}</span>
      </>,
      OPTIONS.map(opt => ({ opt, primary: getEsText(q, opt), secondary: null })),
      q.id, spanishAnswers, setSpanishAnswers, finishSpanishPhase,
      'Parte 1 de 2 · Español', 0, false
    )
  }

  // ── Phase: Spanish Break ───────────────────────────────────────────────────

  if (phase === 'spanish-break' && spanishResult) {
    const questionMap = Object.fromEntries(questions.map(q => [q.id, q]))
    const independence = n - spanishResult.translation_reveals

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ ...CARD, textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
            {spanishResult.score / n >= 0.8 ? '🎉' : spanishResult.score / n >= 0.6 ? '💪' : '📚'}
          </div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 800, color: '#fff', marginBottom: '0.25rem' }}>
            {spanishResult.score} / {n}
          </div>
          <div style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
            Parte 1 completa — {Math.round((spanishResult.score / n) * 100)}% en Español
          </div>
          <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem' }}>
            Independencia del inglés: respondiste {independence} de {n} preguntas sin traducción
          </div>
          <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 12, padding: '1rem 1.25rem', textAlign: 'left' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>A continuación</div>
            <div style={{ color: '#c7d2fe', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Revisa las explicaciones, luego completa la <strong>Parte 2 en Inglés</strong> — mismas preguntas, diferente orden. Total: <strong>{grandTotal} preguntas</strong>.
            </div>
          </div>
        </div>

        {/* Spanish results review */}
        <div style={CARD}>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            Revisión — Parte 1 (Español)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {spanishResult.review.map((item, i) => {
              const q = questionMap[item.question_id]
              if (!q) return null
              return (
                <div key={item.question_id} style={{ borderLeft: `3px solid ${item.is_correct ? '#10b981' : '#f43f5e'}`, paddingLeft: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8' }}>Pregunta {i + 1}</span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: 5, background: item.is_correct ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)', color: item.is_correct ? '#10b981' : '#f43f5e' }}>
                      {item.is_correct ? 'Correcta' : 'Incorrecta'}
                    </span>
                    {item.used_translation && (
                      <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: 5, background: 'rgba(255,255,255,0.05)', color: '#64748b' }}>
                        Usaste traducción
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#e2e8f0', lineHeight: 1.4, marginBottom: '0.75rem' }}>{q.question_text_es || q.question_text}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '0.75rem' }}>
                    {OPTIONS.filter(opt => opt === 'a' || opt === 'b' || Boolean(q[`option_${opt}` as keyof SafeQuestion])).map(opt => {
                      const wasSelected = opt === item.selected_option
                      const isCorrect = opt === item.correct_option
                      return (
                        <div key={opt} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.85rem', color: isCorrect ? '#10b981' : wasSelected && !item.is_correct ? '#f43f5e' : '#64748b', fontWeight: isCorrect || wasSelected ? 600 : 400 }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: 4, fontSize: '0.65rem', fontWeight: 700, flexShrink: 0, marginTop: 1, background: isCorrect ? 'rgba(16,185,129,0.15)' : wasSelected && !item.is_correct ? 'rgba(244,63,94,0.12)' : 'rgba(255,255,255,0.04)', color: isCorrect ? '#10b981' : wasSelected && !item.is_correct ? '#f43f5e' : '#475569' }}>
                            {OPTION_LABELS[opt]}
                          </span>
                          {getEsText(q, opt)}
                        </div>
                      )
                    })}
                  </div>
                  {item.explanation_es && (
                    <div style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5, background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: 10, marginBottom: !item.is_correct ? '0.5rem' : 0 }}>
                      {item.explanation_es}
                    </div>
                  )}
                  {/* Vocab hints */}
                  {item.related_vocab.length > 0 && (
                    <div style={{ marginTop: '0.6rem' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>Vocabulario relacionado</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {item.related_vocab.map((v, vi) => (
                          <span key={vi} style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem', borderRadius: 6, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#a5b4fc' }}>
                            {v.english_term} → {v.spanish_term}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Study Stack button */}
                  <div style={{ marginTop: '0.75rem' }}>
                    {studyStack.has(item.question_id) ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#fbbf24', fontWeight: 600 }}>
                        ✓ Agregada al Study Stack
                      </span>
                    ) : (
                      <button
                        onClick={() => addToStudyStack(item.question_id)}
                        disabled={stackAdding.has(item.question_id)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.9rem', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, cursor: stackAdding.has(item.question_id) ? 'wait' : 'pointer', background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)', transition: 'all 0.2s' }}
                      >
                        {stackAdding.has(item.question_id) ? '...' : '📚 Agregar a Study Stack'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Language tips */}
        <div style={CARD}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
            <span style={{ fontSize: '1.25rem' }}>🧠</span>
            <div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 700, color: '#fff' }}>Lo que debes buscar en Inglés</div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.1rem' }}>Palabras clave que cambian el significado de la pregunta</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {LANGUAGE_TIPS.map((tip, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, padding: '0.2rem 0.6rem', fontFamily: 'var(--font-heading)', fontSize: '0.72rem', fontWeight: 800, color: '#a5b4fc', whiteSpace: 'nowrap', marginTop: '0.1rem' }}>
                  {tip.label}
                </span>
                <span style={{ fontSize: '0.875rem', color: '#94a3b8', lineHeight: 1.5 }}>{tip.tip}</span>
              </div>
            ))}
          </div>
        </div>

        {/* English questions reference */}
        <div style={{ borderRadius: 18, overflow: 'hidden', border: '1px solid rgba(99,102,241,0.25)' }}>
          <div style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.18) 0%, rgba(168,85,247,0.12) 100%)', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.1rem' }}>🇺🇸</span>
            <div>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>Preguntas en Inglés — Referencia</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.15rem' }}>Las mismas preguntas que encontrarás en la Parte 2, en un orden diferente</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {spanishResult.review.map((item, i) => {
              const q = questionMap[item.question_id]
              if (!q) return null
              return (
                <div key={`ref-${item.question_id}`} style={{ padding: '1.25rem 1.5rem', borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 6, background: item.is_correct ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.15)', color: item.is_correct ? '#10b981' : '#f43f5e', fontFamily: 'var(--font-heading)', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0, marginTop: 2 }}>
                      {i + 1}
                    </span>
                    <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#e2e8f0', lineHeight: 1.45 }}>{q.question_text}</span>
                  </div>
                  <div style={{ paddingLeft: '2.25rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {OPTIONS.map(opt => {
                      const isCorrect = opt === item.correct_option
                      const isSelected = opt === item.selected_option
                      const isWrongSelected = isSelected && !item.is_correct
                      return (
                        <div key={opt} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.85rem', lineHeight: 1.4, padding: '0.3rem 0.5rem', borderRadius: 7, background: isCorrect ? 'rgba(16,185,129,0.08)' : isWrongSelected ? 'rgba(244,63,94,0.07)' : 'transparent' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: 4, fontSize: '0.65rem', fontWeight: 700, flexShrink: 0, marginTop: 1, background: isCorrect ? 'rgba(16,185,129,0.25)' : isWrongSelected ? 'rgba(244,63,94,0.2)' : 'rgba(255,255,255,0.04)', color: isCorrect ? '#10b981' : isWrongSelected ? '#f43f5e' : '#475569' }}>
                            {opt.toUpperCase()}
                          </span>
                          <span style={{ color: isCorrect ? '#6ee7b7' : isWrongSelected ? '#fca5a5' : '#64748b' }}>
                            {getOptionText(q, opt)}
                            {isCorrect && !item.is_correct && <span style={{ marginLeft: '0.4rem', fontSize: '0.7rem', color: '#10b981', fontWeight: 700 }}>← correcta</span>}
                            {isWrongSelected && <span style={{ marginLeft: '0.4rem', fontSize: '0.7rem', color: '#f43f5e', fontWeight: 700 }}>← tu respuesta</span>}
                            {isCorrect && item.is_correct && isSelected && <span style={{ marginLeft: '0.4rem', fontSize: '0.7rem', color: '#10b981', fontWeight: 700 }}>✓</span>}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ textAlign: 'center', paddingBottom: '1rem' }}>
          <button style={BTN_PRIMARY} onClick={() => { setCurrent(0); setSelected(null); setShowOptionsES(false); setPhase('english-quiz') }}>
            Comenzar Parte 2 — Inglés
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </button>
        </div>
      </div>
    )
  }

  // ── Phase: English Quiz ────────────────────────────────────────────────────

  if (phase === 'english-quiz') {
    const sq = englishPhase[current]
    if (!sq) return null
    const { q } = sq
    const hasSecondary = (opt: Option) => Boolean(q[`option_${opt}_es` as keyof SafeQuestion])
    const currentImages = (q.image_urls && q.image_urls.length > 0) ? q.image_urls : (q.image_url ? [q.image_url] : [])
    return renderQuizCard(
      <>
        {currentImages.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.6rem', overflowX: 'auto', paddingBottom: '0.4rem', WebkitOverflowScrolling: 'touch' }}>
              {currentImages.map((url, idx) => (
                <div key={idx} style={{ position: 'relative', flexShrink: 0, maxWidth: currentImages.length > 1 ? '80%' : '100%', width: currentImages.length > 1 ? 240 : '100%', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={url} alt={`Diagrama ${idx + 1}`} style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain' }} />
                  {currentImages.length > 1 && (
                    <span style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '0.6rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: 4 }}>
                      {idx + 1} / {currentImages.length}
                    </span>
                  )}
                </div>
              ))}
            </div>
            {currentImages.length > 1 && (
              <div style={{ fontSize: '0.65rem', color: '#6366f1', display: 'flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.2rem', fontWeight: 600 }}>
                <span>Desliza para ver más diagramas</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </div>
            )}
          </div>
        )}
        <QuestionText
          primary={`${current + 1}. ${q.question_text}`}
          secondary={q.question_text_es}
          revealLabel={langCfg.revealLabel}
          secondaryLang="es"
          compact={langCfg.compact}
          onReveal={() => markRevealed(q.id)}
        />
      </>,
      sq.optionOrder.map(opt => ({
        opt,
        primary: getOptionText(q, opt),
        secondary: hasSecondary(opt) ? getEsText(q, opt) : null,
      })),
      q.id, englishAnswers, setEnglishAnswers, finishEnglishPhase,
      spanishMode ? 'Parte 2 de 2 · English' : 'Preguntas',
      spOffset, true
    )
  }

  // ── Phase: Final Results ───────────────────────────────────────────────────

  if (phase === 'final-results') {
    const spPct = spanishResult ? Math.round((spanishResult.score / spanishResult.total) * 100) : 0
    const enPct = englishResult ? Math.round((englishResult.score / englishResult.total) * 100) : 0
    const enIndependence = englishResult ? englishResult.total - englishResult.translation_reveals : 0
    const englishQuestionMap = Object.fromEntries(englishPhase.map(sq => [sq.q.id, sq]))

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ ...CARD, textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginBottom: '0.35rem' }}>
            {mode === 'review'
              ? (enPct === 100 ? '¡Dominado! Estas preguntas ya no aparecerán tan seguido.' : 'Sigue practicando — repasa las explicaciones.')
              : (enPct >= 80 ? '¡Excelente Trabajo!' : enPct >= 60 ? '¡Buen Intento!' : 'Sigue Repasando')}
          </div>
          <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '1.75rem' }}>Puntaje combinado de ambas partes</div>

          {spanishMode && spanishResult && englishResult ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              {[
                { label: 'Parte 1 · Español', score: spanishResult.score, total: spanishResult.total, pct: spPct, ref: spCircleRef, color: '#a855f7' },
                { label: 'Parte 2 · English', score: englishResult.score, total: englishResult.total, pct: enPct, ref: enCircleRef, color: '#6366f1' },
              ].map(({ label, score, total, pct, ref, color }) => (
                <div key={label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: '1.25rem 1rem' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>{label}</div>
                  <div style={{ position: 'relative', width: 100, height: 100, margin: '0 auto 0.75rem' }}>
                    <svg width="100" height="100" style={{ transform: 'rotate(-90deg)' }}>
                      <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="8" />
                      <circle ref={ref} cx="50" cy="50" r="42" fill="none" stroke={color} strokeWidth="8"
                        strokeDasharray="264" strokeDashoffset="264" strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1)' }} />
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{pct}%</span>
                      <span style={{ fontSize: '0.65rem', color: '#64748b' }}>{score}/{total}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : englishResult && (
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '3rem', fontWeight: 800, color: '#fff', marginBottom: '1rem' }}>
              {englishResult.score}/{englishResult.total}
            </div>
          )}

          {/* Independence line */}
          {englishResult && (
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: spanishMode && enPct > spPct ? '0.75rem' : 0 }}>
              Independencia del inglés: respondiste <span style={{ color: '#a5b4fc', fontWeight: 600 }}>{enIndependence} de {n}</span> preguntas en Inglés sin traducción
            </div>
          )}
          {spanishMode && enPct > spPct && (
            <div style={{ fontSize: '0.875rem', color: '#10b981', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: '0.6rem 1rem', display: 'inline-block', marginTop: '0.5rem' }}>
              +{enPct - spPct}% de mejora del Español al Inglés 🎯
            </div>
          )}
        </div>

        {/* English phase review */}
        {englishResult && (
          <div style={CARD}>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              Revisión — Parte 2 (English)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {englishResult.review.map((item, i) => {
                const sq = englishQuestionMap[item.question_id]
                if (!sq) return null
                const { q, optionOrder } = sq

                const prevItem = i > 0 ? englishResult.review[i - 1] : null
                const prevSq = prevItem ? englishQuestionMap[prevItem.question_id] : null
                const showCaseHeader = q.case_set && (!prevSq || prevSq.q.case_set_id !== q.case_set_id)

                return (
                  <div key={item.question_id} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {showCaseHeader && q.case_set && (
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
                          Use {q.case_set.case_label} to answer the following questions:
                        </div>
                        {q.case_set.description && (
                          <p style={{ fontSize: '0.88rem', color: '#cbd5e1', lineHeight: 1.45, margin: '0 0 0.5rem', maxHeight: 180, overflowY: 'auto' }}>
                            {q.case_set.description}
                          </p>
                        )}
                        {q.case_set.case_type === 'patient' && q.case_set.patient_data && (
                          <div style={{ borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden', fontSize: '0.78rem', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                              <tbody>
                                {Object.entries(q.case_set.patient_data as Record<string, string>).map(([k, v]) => (
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
                        {q.case_set.images && q.case_set.images.length > 0 && (
                          <div style={{ display: 'flex', gap: '0.6rem', overflowX: 'auto', marginTop: '0.5rem', paddingBottom: '0.4rem' }}>
                            {q.case_set.images.map((img, imgIdx) => (
                              <div key={img.id} style={{ position: 'relative', flexShrink: 0, maxWidth: '80%', width: 220, borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <img src={img.image_url} alt={img.caption || `Case image ${imgIdx + 1}`} style={{ width: '100%', height: 130, objectFit: 'contain', background: '#000' }} />
                                {q.case_set!.images!.length > 1 && (
                                  <span style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '0.6rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: 4 }}>
                                    {imgIdx + 1} / {q.case_set!.images!.length}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div
                      key={item.question_id}
                      style={{
                        borderLeft: `3px solid ${item.is_correct ? '#10b981' : '#f43f5e'}`,
                        paddingLeft: '1rem',
                        paddingBottom: '0.5rem',
                      }}
                    >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8' }}>Question {i + 1}</span>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: 5, background: item.is_correct ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)', color: item.is_correct ? '#10b981' : '#f43f5e' }}>
                        {item.is_correct ? 'Correct' : 'Incorrect'}
                      </span>
                      {item.used_translation && (
                        <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: 5, background: 'rgba(255,255,255,0.05)', color: '#64748b' }}>
                          Usaste traducción
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#e2e8f0', lineHeight: 1.4, marginBottom: '0.75rem' }}>{q.question_text}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '0.75rem' }}>
                      {optionOrder.map(opt => {
                        const wasSelected = opt === item.selected_option
                        const isCorrect = opt === item.correct_option
                        return (
                          <div key={opt} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.85rem', color: isCorrect ? '#10b981' : wasSelected && !item.is_correct ? '#f43f5e' : '#64748b', fontWeight: isCorrect || wasSelected ? 600 : 400 }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: 4, fontSize: '0.65rem', fontWeight: 700, flexShrink: 0, marginTop: 1, background: isCorrect ? 'rgba(16,185,129,0.15)' : wasSelected && !item.is_correct ? 'rgba(244,63,94,0.12)' : 'rgba(255,255,255,0.04)', color: isCorrect ? '#10b981' : wasSelected && !item.is_correct ? '#f43f5e' : '#475569' }}>
                              {OPTION_LABELS[opt]}
                            </span>
                            {getOptionText(q, opt)}
                          </div>
                        )
                      })}
                    </div>
                    {/* Vocab hints for wrong+translated */}
                    {item.related_vocab.length > 0 && (
                      <div style={{ marginBottom: '0.6rem' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>Vocabulario relacionado</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                          {item.related_vocab.map((v, vi) => (
                            <span key={vi} style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem', borderRadius: 6, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#a5b4fc' }}>
                              {v.english_term} → {v.spanish_term}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {item.explanation && (
                      <div style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5, background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: 10 }}>
                        {item.explanation}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center' }}>
          <button style={BTN_PRIMARY} onClick={resetQuiz}>
            Realizar de Nuevo
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38"/></svg>
          </button>
        </div>
      </div>
    )
  }

  return null
}
