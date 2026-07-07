'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export function DeleteButton({ table, id }: { table: string; id: string }) {
  const [confirming, setConfirming] = useState(false)
  const supabase = createClient()

  async function del() {
    await (supabase.from(table as 'questions') as ReturnType<typeof supabase.from>).delete().eq('id', id)
    window.location.reload()
  }

  if (confirming) {
    return (
      <div className="flex gap-1">
        <Button size="sm" variant="destructive" onClick={del}>Sí</Button>
        <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>No</Button>
      </div>
    )
  }

  return (
    <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-600 shrink-0" onClick={() => setConfirming(true)}>
      ✕
    </Button>
  )
}
