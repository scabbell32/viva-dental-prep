'use client'

import { useState, useTransition } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type Q = {
  id: string
  week_number: number | null
  chapter_tag: string | null
  question_text: string
  option_a: string; option_b: string; option_c: string; option_d: string
  correct_option: string
  explanation: string | null
  difficulty: string
  image_url: string | null
  image_urls?: string[] | null
}

type DailyQuiz = {
  id: string
  date: string
  week_number: number
  status: 'draft' | 'published'
  question_ids: string[]
  questions: Q[]
}

const OPTIONS = ['a', 'b', 'c', 'd'] as const
const DIFFICULTY_LABEL: Record<string, string> = { easy: 'Fácil', medium: 'Medio', hard: 'Difícil' }
const DIFFICULTY_COLOR: Record<string, string> = {
  easy: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  hard: 'bg-red-100 text-red-700',
}

function QuestionCard({ q, index, onRemove, disabled }: { q: Q; index: number; onRemove: () => void; disabled: boolean }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 1rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>#{index + 1}</span>
          {q.week_number && (
            <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.15rem 0.45rem', borderRadius: 99, background: '#ede9fe', color: '#7c3aed' }}>Sem. {q.week_number}</span>
          )}
          <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.15rem 0.45rem', borderRadius: 99 }} className={DIFFICULTY_COLOR[q.difficulty] ?? 'bg-gray-100 text-gray-600'}>
            {DIFFICULTY_LABEL[q.difficulty] ?? q.difficulty}
          </span>
          {q.chapter_tag && (
            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{q.chapter_tag}</span>
          )}
          {((q.image_urls && q.image_urls.length > 0) || q.image_url) && (
            <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.15rem 0.45rem', borderRadius: 99, background: '#dbeafe', color: '#1d4ed8' }}>🖼 imagen</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <a href="/admin/questions" target="_blank" style={{ fontSize: '0.72rem', color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>
            Editar →
          </a>
          <button
            onClick={onRemove}
            disabled={disabled}
            title="Quitar del quiz"
            style={{ width: 22, height: 22, borderRadius: 99, border: '1px solid #fca5a5', background: '#fff', color: '#ef4444', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', lineHeight: 1 }}
          >
            ×
          </button>
        </div>
      </div>

      {/* Question body */}
      <div style={{ padding: '1rem' }}>
        {((q.image_urls && q.image_urls.length > 0) || q.image_url) && (
          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
            {(q.image_urls && q.image_urls.length > 0 ? q.image_urls : [q.image_url!]).map((url, idx) => (
              <img key={idx} src={url} alt={`Diagrama ${idx + 1}`} style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, objectFit: 'contain' }} />
            ))}
          </div>
        )}
        <p style={{ fontWeight: 600, fontSize: '0.95rem', color: '#1e293b', lineHeight: 1.5, marginBottom: '0.85rem' }}>{q.question_text}</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: q.explanation ? '0.75rem' : 0 }}>
          {OPTIONS.map(opt => {
            const isCorrect = opt === q.correct_option
            return (
              <div key={opt} style={{
                display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.4rem 0.6rem', borderRadius: 7,
                background: isCorrect ? '#f0fdf4' : '#f8fafc',
                border: `1px solid ${isCorrect ? '#86efac' : '#e2e8f0'}`,
              }}>
                <span style={{ width: 18, height: 18, borderRadius: 4, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, background: isCorrect ? '#16a34a' : '#e2e8f0', color: isCorrect ? '#fff' : '#64748b' }}>
                  {opt.toUpperCase()}
                </span>
                <span style={{ fontSize: '0.85rem', color: isCorrect ? '#15803d' : '#475569', fontWeight: isCorrect ? 600 : 400, lineHeight: 1.4 }}>
                  {q[`option_${opt}` as keyof Q] as string}
                  {isCorrect && <span style={{ marginLeft: '0.4rem', fontSize: '0.7rem', fontWeight: 700, color: '#16a34a' }}>← correcta</span>}
                </span>
              </div>
            )
          })}
        </div>

        {q.explanation && (
          <button
            onClick={() => setExpanded(v => !v)}
            style={{ fontSize: '0.75rem', color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600 }}
          >
            {expanded ? '▲ Ocultar explicación' : '▼ Ver explicación'}
          </button>
        )}
        {expanded && q.explanation && (
          <div style={{ marginTop: '0.5rem', fontSize: '0.82rem', color: '#475569', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '0.65rem 0.75rem', lineHeight: 1.55 }}>
            {q.explanation}
          </div>
        )}
      </div>
    </div>
  )
}

function PoolQuestion({ q, onAdd, disabled }: { q: Q; onAdd: () => void; disabled: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.75rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}>
      <button
        onClick={onAdd}
        disabled={disabled}
        style={{ width: 22, height: 22, borderRadius: 99, border: '1px solid #86efac', background: '#f0fdf4', color: '#16a34a', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', lineHeight: 1, flexShrink: 0 }}
      >
        +
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
          {q.week_number && <span style={{ fontSize: '0.65rem', fontWeight: 600, padding: '0.1rem 0.35rem', borderRadius: 99, background: '#ede9fe', color: '#7c3aed' }}>Sem. {q.week_number}</span>}
          <span style={{ fontSize: '0.65rem', fontWeight: 600, padding: '0.1rem 0.35rem', borderRadius: 99 }} className={DIFFICULTY_COLOR[q.difficulty] ?? 'bg-gray-100 text-gray-600'}>{DIFFICULTY_LABEL[q.difficulty] ?? q.difficulty}</span>
        </div>
        <p style={{ fontSize: '0.82rem', color: '#374151', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.question_text}</p>
      </div>
    </div>
  )
}

export function QuizPreviewClient({ quiz: initial, allPool }: { quiz: DailyQuiz; allPool: Q[] }) {
  const [quiz, setQuiz] = useState(initial)
  const [pool, setPool] = useState<Q[]>(allPool.filter(p => !initial.question_ids.includes(p.id)))
  const [showPool, setShowPool] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const disabled = isPending || quiz.status === 'published'

  async function patchQuiz(action: 'remove' | 'add', questionId: string) {
    const res = await fetch(`/api/admin/daily-quiz/${quiz.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, questionId }),
    })
    if (!res.ok) return
    const data = await res.json()
    setQuiz(prev => ({ ...prev, question_ids: data.question_ids, questions: data.questions }))
    if (action === 'remove') {
      const removedQ = quiz.questions.find(q => q.id === questionId)
      if (removedQ) setPool(prev => [removedQ, ...prev])
    } else {
      setPool(prev => prev.filter(q => q.id !== questionId))
    }
  }

  async function togglePublish() {
    const action = quiz.status === 'draft' ? 'publish' : 'unpublish'
    const label = action === 'publish' ? 'Publicando...' : 'Despublicando...'
    setStatusMsg(label)
    const res = await fetch(`/api/admin/daily-quiz/${quiz.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    if (res.ok) {
      const data = await res.json()
      setQuiz(prev => ({ ...prev, status: data.status }))
      setStatusMsg(action === 'publish' ? '✓ Publicado — los candidatos ya pueden tomar este quiz' : '✓ Revertido a borrador')
      setTimeout(() => setStatusMsg(null), 4000)
    }
  }

  const formatted = new Date(quiz.date + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Status bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', margin: 0, textTransform: 'capitalize' }}>{formatted}</h2>
          <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.2rem 0 0' }}>Semana {quiz.week_number} · NBDHE · {quiz.questions.length} pregunta{quiz.questions.length !== 1 ? 's' : ''}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, padding: '0.3rem 0.75rem', borderRadius: 99, background: quiz.status === 'published' ? '#dcfce7' : '#fef9c3', color: quiz.status === 'published' ? '#16a34a' : '#a16207' }}>
            {quiz.status === 'published' ? '✓ Publicado' : '● Borrador'}
          </span>
          <Button
            size="sm"
            onClick={() => startTransition(togglePublish)}
            disabled={isPending}
            style={{
              background: quiz.status === 'draft' ? '#16a34a' : '#e2e8f0',
              color: quiz.status === 'draft' ? '#fff' : '#475569',
              fontSize: '0.82rem', fontWeight: 700,
            }}
          >
            {quiz.status === 'draft' ? '✓ Publicar Quiz' : 'Revertir a Borrador'}
          </Button>
        </div>
      </div>

      {statusMsg && (
        <div style={{ padding: '0.65rem 1rem', borderRadius: 8, background: '#f0fdf4', border: '1px solid #86efac', color: '#15803d', fontSize: '0.85rem', fontWeight: 600 }}>
          {statusMsg}
        </div>
      )}

      {quiz.status === 'published' && (
        <div style={{ padding: '0.65rem 1rem', borderRadius: 8, background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', fontSize: '0.82rem' }}>
          Este quiz está publicado. Los candidatos lo verán hoy. Para editar, reviértelo a borrador primero.
        </div>
      )}

      {/* Question list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {quiz.questions.map((q, i) => (
          <QuestionCard
            key={q.id}
            q={q}
            index={i}
            disabled={disabled}
            onRemove={() => startTransition(() => { patchQuiz('remove', q.id) })}
          />
        ))}
        {quiz.questions.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.9rem' }}>
            No hay preguntas seleccionadas. Agrega preguntas del banco de abajo.
          </div>
        )}
      </div>

      {/* Pool section */}
      {pool.length > 0 && quiz.status === 'draft' && (
        <div>
          <button
            onClick={() => setShowPool(v => !v)}
            style={{ fontSize: '0.85rem', fontWeight: 700, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: '0.75rem' }}
          >
            {showPool ? '▲' : '▼'} Banco disponible ({pool.length} pregunta{pool.length !== 1 ? 's' : ''} no seleccionadas)
          </button>
          {showPool && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: 480, overflowY: 'auto', paddingRight: '0.25rem' }}>
              {pool.map(q => (
                <PoolQuestion
                  key={q.id}
                  q={q}
                  disabled={disabled}
                  onAdd={() => startTransition(() => { patchQuiz('add', q.id) })}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
