'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

function useGenerate(getCount: () => number, date: string) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generate() {
    setLoading(true)
    setError(null)
    const res = await fetch('/api/admin/daily-quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count: getCount(), date }),
    })
    if (res.ok) {
      router.refresh()
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Error al generar')
    }
    setLoading(false)
  }

  return { generate, loading, error }
}

export function GenerateButtonClient({ availableCount, date }: { availableCount: number; date: string }) {
  const [count, setCount] = useState(15)
  const { generate, loading, error } = useGenerate(() => count, date)
  const max = Math.min(availableCount, 30)

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-600 font-medium whitespace-nowrap">Preguntas:</label>
        <input
          type="number"
          min={1}
          max={max}
          value={count}
          onChange={e => setCount(Math.max(1, Math.min(max, parseInt(e.target.value) || 15)))}
          className="w-16 h-9 rounded-md border border-gray-200 text-sm text-center font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <Button
          onClick={generate}
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold"
        >
          {loading ? 'Generando...' : 'Generar Vista Previa'}
        </Button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <p className="text-xs text-gray-400">{availableCount} preguntas disponibles en el banco</p>
    </div>
  )
}

export function RegenerateButtonClient({ currentCount, date }: { currentCount: number; date: string }) {
  const [count, setCount] = useState(currentCount)
  const { generate, loading, error } = useGenerate(() => count, date)

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-500 whitespace-nowrap">Preguntas:</label>
        <input
          type="number"
          min={1}
          max={30}
          value={count}
          onChange={e => setCount(Math.max(1, Math.min(30, parseInt(e.target.value) || currentCount)))}
          className="w-14 h-8 rounded-md border border-gray-200 text-sm text-center font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <Button
          onClick={generate}
          disabled={loading}
          variant="outline"
          className="text-sm h-8"
        >
          {loading ? 'Regenerando...' : '↺ Regenerar'}
        </Button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
