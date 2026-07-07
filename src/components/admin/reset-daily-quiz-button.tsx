'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function ResetDailyQuizButton({ candidateId }: { candidateId: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')

  async function reset() {
    if (!confirm('¿Borrar el quiz de hoy para este candidato? Podrán tomarlo de nuevo.')) return
    setState('loading')
    const res = await fetch('/api/admin/reset-daily-quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidateId }),
    })
    setState(res.ok ? 'done' : 'error')
    if (res.ok) setTimeout(() => setState('idle'), 3000)
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={reset}
      disabled={state === 'loading'}
      className={state === 'done' ? 'border-green-500 text-green-600' : state === 'error' ? 'border-red-400 text-red-500' : 'border-orange-300 text-orange-600 hover:bg-orange-50'}
    >
      {state === 'loading' ? 'Borrando...' : state === 'done' ? '✓ Reseteado' : state === 'error' ? 'Error' : '↺ Resetear quiz de hoy'}
    </Button>
  )
}
