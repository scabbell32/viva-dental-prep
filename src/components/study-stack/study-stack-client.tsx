'use client'

import { useState } from 'react'
import { TeachingAudio } from '@/components/quiz/teaching-audio'

type StackItem = {
  id: string
  question_id: string
  status: string
  teaching_script: string | null
  created_at: string
  question: {
    question_text: string
    question_text_es: string | null
    option_a: string; option_b: string; option_c: string; option_d: string
    option_a_es: string | null; option_b_es: string | null; option_c_es: string | null; option_d_es: string | null
    correct_option: string
    explanation: string | null
    explanation_es: string | null
  } | null
}

const OPTIONS = ['a', 'b', 'c', 'd'] as const

export function StudyStackClient({ items: initial }: { items: StackItem[] }) {
  const [items, setItems] = useState(initial)

  async function remove(id: string) {
    await fetch('/api/study-stack/list', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setItems(prev => prev.filter(i => i.id !== id))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {items.map((item, idx) => {
        const q = item.question
        if (!q) return null
        const correctOpt = q.correct_option as typeof OPTIONS[number]

        return (
          <div key={item.id} style={{ background: 'rgba(20,30,54,0.7)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(251,191,36,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 8, background: 'rgba(251,191,36,0.15)', color: '#fbbf24', fontFamily: 'var(--font-heading)', fontSize: '0.8rem', fontWeight: 800 }}>
                  {idx + 1}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Pregunta guardada
                </span>
              </div>
              <button
                onClick={() => remove(item.id)}
                style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '0.8rem', padding: '0.25rem 0.5rem', borderRadius: 6 }}
                title="Eliminar del stack"
              >
                ✕ Quitar
              </button>
            </div>

            <div style={{ padding: '1.5rem' }}>
              {/* Question text */}
              <div style={{ marginBottom: '1.25rem' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Español</p>
                <p style={{ fontSize: '1rem', fontWeight: 600, color: '#e2e8f0', lineHeight: 1.5, marginBottom: '0.5rem' }}>
                  {q.question_text_es || q.question_text}
                </p>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem', marginTop: '0.75rem' }}>English</p>
                <p style={{ fontSize: '1rem', fontWeight: 600, color: '#e2e8f0', lineHeight: 1.5 }}>
                  {q.question_text}
                </p>
              </div>

              {/* Options with correct highlighted */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.25rem' }}>
                {OPTIONS.map(opt => {
                  const isCorrect = opt === correctOpt
                  return (
                    <div key={opt} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: 10, background: isCorrect ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isCorrect ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.04)'}` }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: 5, fontSize: '0.65rem', fontWeight: 700, flexShrink: 0, marginTop: 1, background: isCorrect ? '#10b981' : 'rgba(255,255,255,0.06)', color: isCorrect ? '#fff' : '#64748b' }}>
                        {opt.toUpperCase()}
                      </span>
                      <div>
                        <div style={{ fontSize: '0.875rem', color: isCorrect ? '#6ee7b7' : '#94a3b8', lineHeight: 1.4 }}>
                          {q[`option_${opt}_es` as keyof typeof q] as string || q[`option_${opt}` as keyof typeof q] as string}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.4, marginTop: '0.2rem' }}>
                          {q[`option_${opt}` as keyof typeof q] as string}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Explanation */}
              {(q.explanation_es || q.explanation) && (
                <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 12, padding: '1rem', marginBottom: '1.25rem' }}>
                  <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Explicación</p>
                  {q.explanation_es && <p style={{ fontSize: '0.875rem', color: '#c7d2fe', lineHeight: 1.6, marginBottom: q.explanation ? '0.5rem' : 0 }}>{q.explanation_es}</p>}
                  {q.explanation && <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.6 }}>{q.explanation}</p>}
                </div>
              )}

              {/* Teaching audio */}
              <div>
                <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem' }}>Audio Review</p>
                <TeachingAudio questionId={item.question_id} preloadedScript={item.teaching_script ?? undefined} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
