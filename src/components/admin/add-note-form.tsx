'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ui } from '@/lib/i18n'

export function AddNoteForm({ candidateId, adminId }: { candidateId: string; adminId: string }) {
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!note.trim()) return
    setSaving(true)
    await supabase.from('admin_notes').insert({
      candidate_id: candidateId,
      note_text: note.trim(),
      created_by: adminId,
    })
    setNote('')
    setSaving(false)
    window.location.reload()
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <Textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="Agregar nota para este candidato..."
        rows={2}
      />
      <Button type="submit" size="sm" disabled={saving || !note.trim()} className="bg-teal-600 hover:bg-teal-700">
        {saving ? '...' : ui.admin.note}
      </Button>
    </form>
  )
}
