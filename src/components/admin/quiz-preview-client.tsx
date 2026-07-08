'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
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

function QuestionCard({ q, index, onRemove, onReplace, disabled }: { q: Q; index: number; onRemove: () => void; onReplace: () => void; disabled: boolean }) {
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
            onClick={onReplace}
            disabled={disabled}
            title="Reemplazar con otra pregunta aleatoria de la misma semana/tema"
            style={{ width: 22, height: 22, borderRadius: 99, border: '1px solid #cbd5e1', background: '#fff', color: '#4f46e5', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', lineHeight: 1 }}
          >
            🔄
          </button>
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
  const router = useRouter()
  const [quiz, setQuiz] = useState(initial)
  const [pool, setPool] = useState<Q[]>(allPool.filter(p => !initial.question_ids.includes(p.id)))
  const [showPool, setShowPool] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Advanced Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [trackFilter, setTrackFilter] = useState('nbdhe')
  const [weekFilter, setWeekFilter] = useState('all')
  const [legacyFilter, setLegacyFilter] = useState('all')
  const [explanationFilter, setExplanationFilter] = useState('all')
  const [sortFilter, setSortFilter] = useState('recent_added')
  const [loadingPool, setLoadingPool] = useState(false)
  const [totalCount, setTotalCount] = useState(0)

  const disabled = isPending || quiz.status === 'published'

  // Adjust local state when the page server-reloads (props update)
  const [prevInitial, setPrevInitial] = useState(initial)
  if (initial !== prevInitial) {
    setPrevInitial(initial)
    setQuiz(initial)
  }

  // Fetch the pool dynamically from the server based on filters
  async function loadPool(
    search = searchQuery,
    track = trackFilter,
    week = weekFilter,
    legacy = legacyFilter,
    explanation = explanationFilter,
    sort = sortFilter
  ) {
    setLoadingPool(true)
    const excludeIds = quiz.question_ids.join(',')
    const params = new URLSearchParams({
      exclude: excludeIds,
      search,
      track,
      week_number: week,
      is_legacy: legacy,
      has_explanation: explanation,
      sort,
    })
    try {
      const res = await fetch(`/api/admin/daily-quiz/pool?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setPool(data.pool ?? [])
        setTotalCount(data.totalCount ?? 0)
      }
    } catch (e) {
      console.error('Error fetching questions pool:', e)
    } finally {
      setLoadingPool(false)
    }
  }

  async function patchQuiz(action: 'remove' | 'add' | 'replace', questionId: string) {
    const res = await fetch(`/api/admin/daily-quiz/${quiz.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, questionId }),
    })
    if (!res.ok) return
    const data = await res.json()
    
    // Update local state
    setQuiz(prev => ({ ...prev, question_ids: data.question_ids, questions: data.questions }))
    
    // Refresh the pool list to keep exclusions and counts correct
    if (showPool) {
      loadPool(searchQuery, trackFilter, weekFilter, legacyFilter, explanationFilter, sortFilter)
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

  function handleRefresh() {
    startTransition(() => {
      router.refresh()
    })
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
          <Button
            size="sm"
            onClick={handleRefresh}
            disabled={isPending}
            variant="outline"
            style={{
              fontSize: '0.82rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            🔄 Actualizar Vista
          </Button>
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
            onReplace={() => startTransition(() => { patchQuiz('replace', q.id) })}
          />
        ))}
        {quiz.questions.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.9rem' }}>
            No hay preguntas seleccionadas. Agrega preguntas del banco de abajo.
          </div>
        )}
      </div>

      {/* Pool section */}
      {quiz.status === 'draft' && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '1.25rem' }}>
          <button
            onClick={() => {
              const next = !showPool
              setShowPool(next)
              if (next) {
                loadPool(searchQuery, trackFilter, weekFilter, legacyFilter, explanationFilter, sortFilter)
              }
            }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', fontSize: '0.95rem', fontWeight: 700, color: '#4f46e5', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <span>{showPool ? '▲' : '▼'} Banco de Preguntas Disponible</span>
            <span style={{ fontSize: '0.8rem', color: '#64748b', background: '#f1f5f9', padding: '0.2rem 0.6rem', borderRadius: 99 }}>
              Total: {totalCount}
            </span>
          </button>
          
          {showPool && (
            <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Filter controls */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', background: '#f8fafc', padding: '1rem', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                
                {/* Search text filter */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Buscar texto</label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => {
                      const val = e.target.value
                      setSearchQuery(val)
                      loadPool(val, trackFilter, weekFilter, legacyFilter, explanationFilter, sortFilter)
                    }}
                    placeholder="Filtrar por texto..."
                    style={{ padding: '0.4rem 0.75rem', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                  />
                </div>

                {/* Track filter */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Programa</label>
                  <select
                    value={trackFilter}
                    onChange={e => {
                      const val = e.target.value
                      setTrackFilter(val)
                      loadPool(searchQuery, val, weekFilter, legacyFilter, explanationFilter, sortFilter)
                    }}
                    style={{ padding: '0.4rem 0.5rem', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff', outline: 'none' }}
                  >
                    <option value="all">Todos</option>
                    <option value="nbdhe">NBDHE</option>
                    <option value="jurisprudence">Jurisprudencia</option>
                  </select>
                </div>

                {/* Week filter */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Semana</label>
                  <select
                    value={weekFilter}
                    onChange={e => {
                      const val = e.target.value
                      setWeekFilter(val)
                      loadPool(searchQuery, trackFilter, val, legacyFilter, explanationFilter, sortFilter)
                    }}
                    style={{ padding: '0.4rem 0.5rem', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff', outline: 'none' }}
                  >
                    <option value="all">Todas</option>
                    {Array.from({ length: 20 }, (_, i) => i + 1).map(w => (
                      <option key={w} value={w.toString()}>Semana {w}</option>
                    ))}
                  </select>
                </div>

                {/* Legacy filter */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Legacy / New</label>
                  <select
                    value={legacyFilter}
                    onChange={e => {
                      const val = e.target.value
                      setLegacyFilter(val)
                      loadPool(searchQuery, trackFilter, weekFilter, val, explanationFilter, sortFilter)
                    }}
                    style={{ padding: '0.4rem 0.5rem', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff', outline: 'none' }}
                  >
                    <option value="all">Todos</option>
                    <option value="new">Nuevas (New)</option>
                    <option value="legacy">Importadas (Legacy)</option>
                  </select>
                </div>

                {/* Explanation filter */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Explicación</label>
                  <select
                    value={explanationFilter}
                    onChange={e => {
                      const val = e.target.value
                      setExplanationFilter(val)
                      loadPool(searchQuery, trackFilter, weekFilter, legacyFilter, val, sortFilter)
                    }}
                    style={{ padding: '0.4rem 0.5rem', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff', outline: 'none' }}
                  >
                    <option value="all">Todos</option>
                    <option value="yes">Con explicación</option>
                    <option value="no">Sin explicación</option>
                  </select>
                </div>

                {/* Sorting filter */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Ordenar por</label>
                  <select
                    value={sortFilter}
                    onChange={e => {
                      const val = e.target.value
                      setSortFilter(val)
                      loadPool(searchQuery, trackFilter, weekFilter, legacyFilter, explanationFilter, val)
                    }}
                    style={{ padding: '0.4rem 0.5rem', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff', outline: 'none' }}
                  >
                    <option value="recent_added">Recién agregadas</option>
                    <option value="recent_edited">Recién editadas</option>
                    <option value="week_desc">Semana desc</option>
                  </select>
                </div>

              </div>

              {/* Pool results list */}
              {loadingPool ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.9rem' }}>
                  Cargando banco de preguntas...
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: 480, overflowY: 'auto', paddingRight: '0.25rem' }}>
                  {pool.map(q => (
                    <PoolQuestion
                      key={q.id}
                      q={q}
                      disabled={disabled}
                      onAdd={() => startTransition(() => { patchQuiz('add', q.id) })}
                    />
                  ))}
                  {pool.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                      No se encontraron preguntas que coincidan con los filtros.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
