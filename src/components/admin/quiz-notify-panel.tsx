'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

interface Candidate {
  id: string
  full_name: string
  phone: string | null
}

interface Props {
  candidates: Candidate[]
}

export function QuizNotifyPanel({ candidates }: Props) {
  const [template, setTemplate] = useState(
    '¡Buenos días {nombre}! Es hora de realizar tu Quiz del Día de Viva Dental Prep ⚡. Entra aquí para contestarlo: {link}'
  )
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    candidates.filter(c => c.phone).map(c => c.id)
  )
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [results, setResults] = useState<{ name: string; status: string; error?: string }[] | null>(null)

  // Message preview for candidate "María"
  const previewMessage = template
    .replace(/{nombre}/g, 'María')
    .replace(/{name}/g, 'María')
    .replace(/{link}/g, 'https://vivadentalprep.com/quiz')

  const toggleSelectAll = () => {
    if (selectedIds.length === candidates.filter(c => c.phone).length) {
      setSelectedIds([])
    } else {
      setSelectedIds(candidates.filter(c => c.phone).map(c => c.id))
    }
  }

  const handleCheckboxChange = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  async function sendNotifications() {
    if (selectedIds.length === 0) {
      setError('Por favor selecciona al menos un alumno con número de teléfono.')
      return
    }
    setSending(true)
    setError(null)
    setSuccessMsg(null)
    setResults(null)

    try {
      const res = await fetch('/api/admin/daily-quiz/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template, candidateIds: selectedIds }),
      })
      const data = await res.json()
      if (res.ok) {
        setResults(data.results)
        const successes = (data.results as { status: string }[]).filter(r => r.status === 'success').length
        setSuccessMsg(`¡Notificaciones enviadas! Éxito: ${successes}, Errores: ${data.results.length - successes}`)
      } else {
        setError(data.error ?? 'Error al enviar notificaciones')
      }
    } catch (e) {
      console.error(e)
      setError('Error de red al enviar notificaciones')
    } finally {
      setSending(false)
    }
  }

  return (
    <Card className="border-indigo-150 bg-indigo-50/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold text-indigo-900 flex items-center gap-1.5">
          📢 Enviar Notificaciones de WhatsApp
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Template input */}
        <div className="space-y-1">
          <Label htmlFor="template" className="text-xs font-semibold text-indigo-900">
            Mensaje de WhatsApp
          </Label>
          <textarea
            id="template"
            rows={3}
            value={template}
            onChange={e => setTemplate(e.target.value)}
            className="w-full text-sm rounded-lg border border-indigo-200 bg-white px-3 py-2 text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
          <p className="text-[10.5px] text-indigo-500/80">
            Usa <code className="font-mono font-bold bg-indigo-100/50 px-1 rounded">{'{nombre}'}</code> para el nombre del alumno, y <code className="font-mono font-bold bg-indigo-100/50 px-1 rounded">{'{link}'}</code> para el enlace al quiz.
          </p>
        </div>

        {/* Live Preview */}
        <div className="rounded-lg bg-white border border-indigo-100 p-3">
          <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider block mb-1">
            Vista Previa (María)
          </span>
          <p className="text-sm text-gray-600 italic leading-relaxed whitespace-pre-wrap">
            {previewMessage}
          </p>
        </div>

        {/* Candidate list checkboxes */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-indigo-900">
              Alumnos a Notificar ({selectedIds.length} seleccionados)
            </Label>
            <button
              onClick={toggleSelectAll}
              type="button"
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
            >
              {selectedIds.length === candidates.filter(c => c.phone).length
                ? 'Deseleccionar Todos'
                : 'Seleccionar Todos'}
            </button>
          </div>

          <div className="max-h-48 overflow-y-auto rounded-lg border border-indigo-100 bg-white p-2 divide-y divide-gray-50">
            {candidates.map(c => {
              const hasPhone = !!c.phone
              return (
                <div
                  key={c.id}
                  className={`flex items-center gap-3 py-1.5 px-1 ${
                    !hasPhone ? 'opacity-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    id={`notify-${c.id}`}
                    checked={selectedIds.includes(c.id)}
                    disabled={!hasPhone || sending}
                    onChange={() => handleCheckboxChange(c.id)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <Label
                    htmlFor={`notify-${c.id}`}
                    className={`flex-1 text-sm ${
                      hasPhone ? 'text-gray-700 cursor-pointer' : 'text-gray-400 font-normal'
                    }`}
                  >
                    {c.full_name}
                  </Label>
                  <div className="shrink-0">
                    {c.phone ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 text-[10px] border-green-200">
                        {c.phone}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-red-50 text-red-600 text-[10px] border-red-150">
                        Sin Teléfono
                      </Badge>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Feedback states */}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-700 font-semibold">
            {successMsg}
          </div>
        )}

        {/* Results logs */}
        {results && (
          <div className="rounded-lg bg-gray-50 border border-gray-200 p-2 max-h-36 overflow-y-auto text-[11px] font-mono space-y-1">
            {results.map((r, idx) => (
              <div key={idx} className="flex justify-between">
                <span className="text-gray-700">{r.name}:</span>
                {r.status === 'success' ? (
                  <span className="text-green-600">✓ Enviado</span>
                ) : (
                  <span className="text-red-500" title={r.error}>
                    ✗ Error ({r.error ?? 'Fallo'})
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Action button */}
        <Button
          onClick={sendNotifications}
          disabled={sending || selectedIds.length === 0}
          className="bg-indigo-600 hover:bg-indigo-700 text-white w-full flex items-center justify-center gap-1.5"
        >
          {sending ? 'Enviando Notificaciones...' : '📢 Enviar por WhatsApp / SMS'}
        </Button>
      </CardContent>
    </Card>
  )
}
