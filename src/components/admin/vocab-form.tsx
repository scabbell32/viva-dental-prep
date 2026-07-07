'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const WEEKS = Array.from({ length: 20 }, (_, i) => i + 1)

export function VocabForm() {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ week_number: 1, english_term: '', spanish_term: '', pronunciation_tip: '', category: '' })

  function set(key: string, value: string | number) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('vocab_sets').insert(form)
    setSaving(false)
    setForm({ week_number: 1, english_term: '', spanish_term: '', pronunciation_tip: '', category: '' })
    window.location.reload()
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label>Semana</Label>
          <Select value={String(form.week_number)} onValueChange={v => v && set('week_number', parseInt(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{WEEKS.map(w => <SelectItem key={w} value={String(w)}>Semana {w}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Categoría (opcional)</Label>
          <Input value={form.category} onChange={e => set('category', e.target.value)} placeholder="ej. Periodoncia" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Término en Inglés</Label>
          <Input value={form.english_term} onChange={e => set('english_term', e.target.value)} required />
        </div>
        <div>
          <Label>Término en Español</Label>
          <Input value={form.spanish_term} onChange={e => set('spanish_term', e.target.value)} required />
        </div>
      </div>
      <div>
        <Label>Consejo de Pronunciación (opcional)</Label>
        <Input value={form.pronunciation_tip} onChange={e => set('pronunciation_tip', e.target.value)} placeholder="ej. Proh-BIN-g" />
      </div>
      <Button type="submit" disabled={saving} className="bg-teal-600 hover:bg-teal-700">
        {saving ? 'Guardando...' : 'Guardar Término'}
      </Button>
    </form>
  )
}
