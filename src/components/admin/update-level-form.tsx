'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import type { EnglishLevel } from '@/types/database'

export function UpdateLevelForm({ candidateId, currentLevel }: { candidateId: string; currentLevel: EnglishLevel | null }) {
  const [level, setLevel] = useState<EnglishLevel>(currentLevel ?? 'intermediate')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  async function save() {
    setSaving(true)
    await supabase.from('profiles').update({ english_level: level }).eq('id', candidateId)
    setSaving(false)
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={level} onValueChange={v => v && setLevel(v as EnglishLevel)}>
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="beginner">Principiante</SelectItem>
          <SelectItem value="intermediate">Intermedio</SelectItem>
          <SelectItem value="advanced">Avanzado</SelectItem>
        </SelectContent>
      </Select>
      <Button size="sm" onClick={save} disabled={saving} className="bg-teal-600 hover:bg-teal-700">
        {saving ? '...' : 'Guardar'}
      </Button>
    </div>
  )
}
