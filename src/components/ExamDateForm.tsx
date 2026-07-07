'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function ExamDateForm({ userId }: { userId: string }) {
  const [date, setDate] = useState('')
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  async function save() {
    if (!date) return
    setSaving(true)
    await fetch('/api/profile/exam-date', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exam_date: date }),
    })
    setSaving(false)
    router.refresh()
  }

  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
      <input
        type="date"
        value={date}
        onChange={e => setDate(e.target.value)}
        min={new Date().toISOString().slice(0, 10)}
        style={{
          flex: 1,
          minWidth: 130,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 8,
          padding: '0.4rem 0.6rem',
          color: '#e2e8f0',
          fontSize: '0.82rem',
          outline: 'none',
          colorScheme: 'dark',
        }}
      />
      <button
        onClick={save}
        disabled={!date || saving}
        style={{
          padding: '0.4rem 0.9rem',
          borderRadius: 8,
          background: date ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' : 'rgba(255,255,255,0.04)',
          color: date ? '#fff' : '#475569',
          border: 'none',
          cursor: date ? 'pointer' : 'default',
          fontSize: '0.82rem',
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {saving ? '...' : 'Guardar'}
      </button>
    </div>
  )
}
