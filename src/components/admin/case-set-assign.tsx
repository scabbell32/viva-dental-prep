'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface ChapterQuestion {
  id: string
  question_text: string
  option_a: string
  option_b: string
  correct_option: string
  difficulty: string
  case_set_id: string | null
  question_type: string
  sequence_order: number | null
  is_active: boolean
}

interface Props {
  caseSetId: string
  chapterQuestions: ChapterQuestion[]
}

export function CaseSetAssign({ caseSetId, chapterQuestions }: Props) {
  // Build initial selection from questions already assigned to this case set
  const initialAssigned = chapterQuestions
    .filter(q => q.case_set_id === caseSetId)
    .sort((a, b) => (a.sequence_order ?? 0) - (b.sequence_order ?? 0))
    .map(q => q.id)

  const [selected, setSelected] = useState<string[]>(initialAssigned)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const assignedElsewhere = chapterQuestions.filter(
    q => q.case_set_id && q.case_set_id !== caseSetId
  )
  const unassigned = chapterQuestions.filter(q => !q.case_set_id)
  const assignedHere = chapterQuestions.filter(q => q.case_set_id === caseSetId)

  function toggle(id: string) {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
    setSaved(false)
  }

  function moveUp(id: string) {
    setSelected(prev => {
      const idx = prev.indexOf(id)
      if (idx <= 0) return prev
      const next = [...prev]
      ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
      return next
    })
    setSaved(false)
  }

  function moveDown(id: string) {
    setSelected(prev => {
      const idx = prev.indexOf(id)
      if (idx === -1 || idx >= prev.length - 1) return prev
      const next = [...prev]
      ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
      return next
    })
    setSaved(false)
  }

  async function save() {
    setSaving(true)
    setError(null)
    const assignments = selected.map((question_id, i) => ({
      question_id,
      sequence_order: i + 1,
    }))
    const res = await fetch(`/api/admin/case-sets/${caseSetId}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignments }),
    })
    setSaving(false)
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'Error saving')
      return
    }
    setSaved(true)
  }

  const qMap = Object.fromEntries(chapterQuestions.map(q => [q.id, q]))

  return (
    <div className="space-y-6">

      {/* Current assignment (ordered) */}
      {selected.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Preguntas en este case set ({selected.length}) — arrastra para reordenar
          </p>
          <div className="space-y-1.5">
            {selected.map((id, idx) => {
              const q = qMap[id]
              if (!q) return null
              return (
                <div key={id} className="flex items-start gap-2 p-2.5 bg-teal-50 border border-teal-200 rounded-md">
                  <span className="text-xs font-bold text-teal-600 w-5 shrink-0 mt-0.5">{idx + 1}</span>
                  <p className="text-sm text-gray-800 flex-1 line-clamp-2">{q.question_text}</p>
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button
                      onClick={() => moveUp(id)}
                      disabled={idx === 0}
                      className="text-gray-400 hover:text-gray-600 disabled:opacity-20 text-xs leading-none"
                      aria-label="Move up"
                    >▲</button>
                    <button
                      onClick={() => moveDown(id)}
                      disabled={idx === selected.length - 1}
                      className="text-gray-400 hover:text-gray-600 disabled:opacity-20 text-xs leading-none"
                      aria-label="Move down"
                    >▼</button>
                  </div>
                  <button
                    onClick={() => toggle(id)}
                    className="text-xs text-red-400 hover:text-red-600 shrink-0"
                  >✕</button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Unassigned questions from this chapter */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Sin asignar en {chapterQuestions[0] ? '' : 'este capítulo'} ({unassigned.length})
        </p>
        {unassigned.length === 0 ? (
          <p className="text-sm text-gray-400">Todas las preguntas de este capítulo ya están asignadas.</p>
        ) : (
          <div className="space-y-1.5 max-h-96 overflow-y-auto">
            {unassigned.map(q => {
              const isSelected = selected.includes(q.id)
              return (
                <div
                  key={q.id}
                  onClick={() => toggle(q.id)}
                  className={`flex items-start gap-2 p-2.5 border rounded-md cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-teal-50 border-teal-200'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    readOnly
                    checked={isSelected}
                    className="mt-0.5 shrink-0"
                  />
                  <p className="text-sm text-gray-800 line-clamp-2 flex-1">{q.question_text}</p>
                  <Badge variant="outline" className="text-xs shrink-0">{q.difficulty}</Badge>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Questions assigned to other case sets (read-only info) */}
      {assignedElsewhere.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            En otro case set ({assignedElsewhere.length}) — solo lectura
          </p>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {assignedElsewhere.map(q => (
              <div key={q.id} className="flex items-start gap-2 p-2 bg-gray-50 border border-gray-100 rounded-md opacity-60">
                <p className="text-xs text-gray-600 line-clamp-1 flex-1">{q.question_text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex items-center gap-3">
        <Button
          onClick={save}
          disabled={saving}
          className="bg-teal-600 hover:bg-teal-700"
        >
          {saving ? 'Guardando...' : `Guardar asignación (${selected.length} preguntas)`}
        </Button>
        {saved && <span className="text-sm text-teal-600 font-medium">✓ Guardado</span>}
      </div>
    </div>
  )
}
