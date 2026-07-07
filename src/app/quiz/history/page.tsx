export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

const MODE_LABEL: Record<string, string> = {
  weekly: 'Quiz Diario',
  review: 'Repaso',
}

const darkPage: React.CSSProperties = {
  minHeight: '100vh',
  backgroundColor: '#0b0f19',
  backgroundImage: 'radial-gradient(at 0% 0%, rgba(99,102,241,0.12) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(168,85,247,0.12) 0px, transparent 50%)',
  color: '#f8fafc',
  fontFamily: 'var(--font-sans), sans-serif',
}

export default async function QuizHistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: attempts } = await supabase
    .from('quiz_attempts')
    .select('id, track, week_number, score, total_questions, completed_at, mode')
    .eq('candidate_id', user.id)
    .order('completed_at', { ascending: false })
    .limit(60)

  const grouped: Record<string, typeof attempts> = {}
  for (const a of attempts ?? []) {
    const month = new Date(a.completed_at).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
    if (!grouped[month]) grouped[month] = []
    grouped[month]!.push(a)
  }

  return (
    <div style={darkPage}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1rem', background: 'linear-gradient(135deg, #fff 0%, #a5b4fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Viva Dental Prep
        </span>
        <Link href="/dashboard" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 500 }}>
          ← Dashboard
        </Link>
      </div>

      <main style={{ maxWidth: 680, margin: '0 auto', padding: '2rem 1rem' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.75rem', fontWeight: 800, background: 'linear-gradient(135deg, #fff 0%, #a5b4fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.35rem', letterSpacing: '-0.02em' }}>
          Historial de Quizzes
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '2rem' }}>
          {attempts?.length ?? 0} intento{(attempts?.length ?? 0) !== 1 ? 's' : ''} completado{(attempts?.length ?? 0) !== 1 ? 's' : ''}. Haz clic en uno para revisarlo.
        </p>

        {(!attempts || attempts.length === 0) ? (
          <div style={{ background: 'rgba(20,30,54,0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '3rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
            <p style={{ color: '#64748b' }}>Aún no has completado ningún quiz.</p>
            <Link href="/quiz" style={{ display: 'inline-block', marginTop: '1.25rem', padding: '0.75rem 1.5rem', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', borderRadius: 12, color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: '0.9rem' }}>
              Comenzar primer quiz →
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {Object.entries(grouped).map(([month, monthAttempts]) => (
              <div key={month}>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
                  {month}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {monthAttempts!.map(a => {
                    const pct = Math.round((a.score / a.total_questions) * 100)
                    const color = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#f43f5e'
                    const date = new Date(a.completed_at).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })
                    const time = new Date(a.completed_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

                    return (
                      <Link
                        key={a.id}
                        href={`/quiz/history/${a.id}`}
                        style={{ textDecoration: 'none', display: 'block' }}
                      >
                        <div style={{ background: 'rgba(20,30,54,0.7)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', transition: 'border-color 0.2s' }}>
                          {/* Score circle */}
                          <div style={{ width: 52, height: 52, borderRadius: '50%', border: `2px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: `${color}15` }}>
                            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '0.9rem', color }}>{pct}%</span>
                          </div>

                          {/* Info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 99, background: 'rgba(99,102,241,0.15)', color: '#a5b4fc' }}>
                                {a.track === 'nbdhe' ? 'NBDHE' : 'Juris.'}
                              </span>
                              <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: 99, background: 'rgba(255,255,255,0.05)', color: '#64748b' }}>
                                {MODE_LABEL[a.mode] ?? a.mode}
                              </span>
                              {a.week_number && (
                                <span style={{ fontSize: '0.72rem', color: '#475569' }}>Sem. {a.week_number}</span>
                              )}
                            </div>
                            <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>
                              {date} · {time} · {a.score}/{a.total_questions} correctas
                            </p>
                          </div>

                          {/* Score bar + arrow */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                            <div style={{ width: 60, height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99 }} />
                            </div>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                            </svg>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
