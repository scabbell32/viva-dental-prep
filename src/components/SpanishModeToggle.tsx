'use client'

import { useState, useTransition } from 'react'

export function SpanishModeToggle({ initialValue }: { initialValue: boolean }) {
  const [enabled, setEnabled] = useState(initialValue)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  function toggle() {
    const next = !enabled
    setEnabled(next)
    setSaved(false)
    startTransition(async () => {
      await fetch('/api/settings/spanish-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  return (
    <div style={{ background: 'rgba(20,30,54,0.6)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: '1.5rem 1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
      <div>
        <p style={{ fontFamily: 'var(--font-heading)', fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>
          Modo Bilingüe
        </p>
        <p style={{ color: '#64748b', fontSize: '0.82rem', lineHeight: 1.5 }}>
          {enabled
            ? 'Las preguntas aparecen primero en español, luego en inglés.'
            : 'Solo inglés. Activa para practicar en ambos idiomas.'}
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
        {saved && (
          <span style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 600 }}>Guardado ✓</span>
        )}
        <button
          onClick={toggle}
          disabled={isPending}
          aria-pressed={enabled}
          style={{
            width: 52,
            height: 28,
            borderRadius: 99,
            border: 'none',
            cursor: isPending ? 'wait' : 'pointer',
            background: enabled ? '#6366f1' : 'rgba(255,255,255,0.1)',
            position: 'relative',
            transition: 'background 0.2s ease',
            flexShrink: 0,
          }}
        >
          <span style={{
            position: 'absolute',
            top: 4,
            left: enabled ? 28 : 4,
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: '#fff',
            transition: 'left 0.2s ease',
            boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
          }} />
        </button>
      </div>
    </div>
  )
}
