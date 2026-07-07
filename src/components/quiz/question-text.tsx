'use client'

import { useState } from 'react'

interface Props {
  primary: string
  secondary: string | null
  revealLabel: string
  secondaryLang?: string   // 'es' or 'en' for the <span lang> attribute
  compact?: boolean        // icon-only affordance (advanced level)
  onReveal?: () => void    // fires once on first open
}

export function QuestionText({ primary, secondary, revealLabel, secondaryLang, compact, onReveal }: Props) {
  const [open, setOpen] = useState(false)
  const hasSecondary = Boolean(secondary)

  function toggle(e: React.MouseEvent) {
    e.stopPropagation()
    if (!open) onReveal?.()
    setOpen(v => !v)
  }

  return (
    <span style={{ display: 'block' }}>
      <span>{primary}</span>
      {hasSecondary && (
        <button
          onClick={toggle}
          style={{
            marginLeft: '0.5rem',
            display: 'inline-flex', alignItems: 'center',
            background: open ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.08)',
            border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: compact ? 4 : 6,
            padding: compact ? '0.1rem 0.3rem' : '0.15rem 0.55rem',
            fontSize: compact ? '0.6rem' : '0.7rem',
            fontWeight: 700, color: '#a5b4fc',
            cursor: 'pointer', verticalAlign: 'middle',
            transition: 'all 0.15s',
            outline: 'none',
          }}
          aria-expanded={open}
        >
          {compact ? 'ES' : open ? '▲ Ocultar' : revealLabel}
        </button>
      )}
      {open && secondary && (
        <span
          lang={secondaryLang}
          style={{
            display: 'block', marginTop: '0.4rem',
            fontSize: '0.88em', color: '#64748b',
            lineHeight: 1.45, fontStyle: 'italic',
          }}
        >
          {secondary}
        </span>
      )}
    </span>
  )
}
