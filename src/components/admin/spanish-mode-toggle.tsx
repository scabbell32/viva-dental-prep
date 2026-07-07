'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function SpanishModeToggle({ candidateId, initialValue }: { candidateId: string; initialValue: boolean }) {
  const [enabled, setEnabled] = useState(initialValue)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  async function toggle() {
    const next = !enabled
    setSaving(true)
    await supabase.from('profiles').update({ spanish_mode: next }).eq('id', candidateId)
    setEnabled(next)
    setSaving(false)
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600 font-medium">Modo Español</span>
      <button
        onClick={toggle}
        disabled={saving}
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          width: 44,
          height: 24,
          borderRadius: 99,
          background: enabled ? '#0d9488' : '#d1d5db',
          border: 'none',
          cursor: saving ? 'not-allowed' : 'pointer',
          transition: 'background 0.2s',
          padding: 0,
          opacity: saving ? 0.6 : 1,
        }}
        aria-checked={enabled}
        role="switch"
      >
        <span style={{
          position: 'absolute',
          left: enabled ? 22 : 2,
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          transition: 'left 0.2s',
        }} />
      </button>
      <span className="text-xs text-gray-400">{enabled ? 'Activado' : 'Desactivado'}</span>
    </div>
  )
}
