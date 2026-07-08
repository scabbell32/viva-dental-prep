'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function UpdatePhoneForm({ candidateId, currentPhone }: { candidateId: string; currentPhone: string | null }) {
  const [phone, setPhone] = useState(currentPhone ?? '')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  async function save() {
    setSaving(true)
    await supabase.from('profiles').update({ phone: phone || null }).eq('id', candidateId)
    setSaving(false)
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        type="tel"
        value={phone}
        onChange={e => setPhone(e.target.value)}
        placeholder="WhatsApp (+521...)"
        className="w-44 h-9 text-sm"
      />
      <Button size="sm" onClick={save} disabled={saving} className="bg-teal-600 hover:bg-teal-700 h-9 shrink-0">
        {saving ? 'Guardando...' : 'Guardar'}
      </Button>
    </div>
  )
}
