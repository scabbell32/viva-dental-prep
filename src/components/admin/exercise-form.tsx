'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const WEEKS = Array.from({ length: 20 }, (_, i) => i + 1)

export function ExerciseForm() {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    week_number: 1,
    title: '',
    dialogue_text: '',
    cloze_text: '',
    cloze_answers_raw: '',
    comprehension_raw: '',
  })

  function set(key: string, value: string | number) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const cloze_answers = form.cloze_answers_raw.split('\n').map(s => s.trim()).filter(Boolean)
    const comprehension_questions = form.comprehension_raw
      .split('\n---\n')
      .map(block => {
        const [q, a] = block.split('\n')
        return { question: q?.trim() ?? '', answer: a?.trim() ?? '' }
      })
      .filter(q => q.question)

    await supabase.from('listening_exercises').insert({
      week_number: form.week_number,
      title: form.title,
      dialogue_text: form.dialogue_text,
      cloze_text: form.cloze_text,
      cloze_answers,
      comprehension_questions,
    })

    setSaving(false)
    setForm({ week_number: 1, title: '', dialogue_text: '', cloze_text: '', cloze_answers_raw: '', comprehension_raw: '' })
    window.location.reload()
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Semana</Label>
          <Select value={String(form.week_number)} onValueChange={v => v && set('week_number', parseInt(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{WEEKS.map(w => <SelectItem key={w} value={String(w)}>Semana {w}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Título</Label>
          <Input value={form.title} onChange={e => set('title', e.target.value)} required placeholder="ej. Explicando radiografías al paciente" />
        </div>
      </div>
      <div>
        <Label>Diálogo Completo</Label>
        <Textarea value={form.dialogue_text} onChange={e => set('dialogue_text', e.target.value)} required rows={4} placeholder="El texto completo del diálogo clínico..." />
      </div>
      <div>
        <Label>Versión con Espacios en Blanco (use _____ para blancos)</Label>
        <Textarea value={form.cloze_text} onChange={e => set('cloze_text', e.target.value)} required rows={4} placeholder="I need to take _____ to check the bone _____." />
      </div>
      <div>
        <Label>Respuestas del Cloze (una por línea)</Label>
        <Textarea value={form.cloze_answers_raw} onChange={e => set('cloze_answers_raw', e.target.value)} rows={3} placeholder="X-rays&#10;levels" />
      </div>
      <div>
        <Label>Preguntas de Comprensión (pregunta, luego respuesta, separadas por ---, una pregunta por bloque)</Label>
        <Textarea value={form.comprehension_raw} onChange={e => set('comprehension_raw', e.target.value)} rows={6} placeholder={'What does the dentist need to check?\nBone levels under the gums\n---\nWhy are X-rays important?\nTo evaluate bone levels'} />
      </div>
      <Button type="submit" disabled={saving} className="bg-teal-600 hover:bg-teal-700">
        {saving ? 'Guardando...' : 'Guardar Ejercicio'}
      </Button>
    </form>
  )
}
