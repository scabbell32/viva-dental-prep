'use client'

import { useState, useRef } from 'react'

type Phase = 'idle' | 'generating' | 'loading-audio' | 'ready' | 'playing' | 'error'

interface Props {
  questionId: string
  preloadedScript?: string
}

export function TeachingAudio({ questionId, preloadedScript }: Props) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [script, setScript] = useState<string | null>(preloadedScript ?? null)
  const [showTranscript, setShowTranscript] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioBlobUrl = useRef<string | null>(null)

  async function handleClick() {
    if (phase === 'playing') {
      audioRef.current?.pause()
      setPhase('ready')
      return
    }
    if (phase === 'ready' && audioBlobUrl.current) {
      audioRef.current?.play()
      setPhase('playing')
      return
    }

    // Step 1: use preloaded script or fetch from Claude
    setErrorMsg('')
    let generatedScript = script
    if (!generatedScript) {
      setPhase('generating')
      try {
        const teachRes = await fetch('/api/quiz/teaching', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question_id: questionId }),
        })
        if (!teachRes.ok) throw new Error('No se pudo generar el guión.')
        const json = await teachRes.json()
        generatedScript = json.script
        setScript(generatedScript)
      } catch (e) {
        setPhase('error')
        setErrorMsg((e as Error).message)
        return
      }
    }

    try {
      // Step 2: generate audio via Gemini TTS
      setPhase('loading-audio')
      const audioRes = await fetch('/api/quiz/audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: generatedScript }),
      })
      if (!audioRes.ok) throw new Error('No se pudo generar el audio.')

      const blob = await audioRes.blob()
      if (audioBlobUrl.current) URL.revokeObjectURL(audioBlobUrl.current)
      audioBlobUrl.current = URL.createObjectURL(blob)

      const audio = new Audio(audioBlobUrl.current)
      audioRef.current = audio
      audio.onended = () => setPhase('ready')
      audio.onerror = () => { setPhase('error'); setErrorMsg('Error al reproducir el audio.') }

      setPhase('playing')
      audio.play()
    } catch (e) {
      setPhase('error')
      setErrorMsg((e as Error).message)
    }
  }

  const labels: Record<Phase, string> = {
    idle: '🎧 Escuchar explicación',
    generating: 'Generando guión...',
    'loading-audio': 'Preparando audio...',
    ready: '▶ Reproducir de nuevo',
    playing: '⏸ Pausar',
    error: '↺ Intentar de nuevo',
  }

  const isLoading = phase === 'generating' || phase === 'loading-audio'

  return (
    <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <button
        onClick={handleClick}
        disabled={isLoading}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.6rem 1.1rem', borderRadius: 10, fontSize: '0.875rem', fontWeight: 600,
          cursor: isLoading ? 'not-allowed' : 'pointer',
          background: 'rgba(99,102,241,0.12)', color: '#a5b4fc',
          border: '1px solid rgba(99,102,241,0.3)',
          transition: 'all 0.2s', width: 'fit-content',
        }}
      >
        {isLoading && (
          <span style={{ width: 12, height: 12, border: '2px solid #a5b4fc', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
        )}
        {labels[phase]}
      </button>

      {phase === 'error' && (
        <p style={{ fontSize: '0.75rem', color: '#f43f5e' }}>{errorMsg}</p>
      )}

      {script && (phase === 'ready' || phase === 'playing') && (
        <button
          onClick={() => setShowTranscript(t => !t)}
          style={{ fontSize: '0.75rem', color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textAlign: 'left', padding: 0, width: 'fit-content' }}
        >
          {showTranscript ? 'Ocultar transcripción' : 'Ver transcripción'}
        </button>
      )}

      {showTranscript && script && (
        <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, padding: '1rem' }}>
          <p style={{ fontSize: '0.8rem', color: '#c7d2fe', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{script}</p>
        </div>
      )}
    </div>
  )
}
