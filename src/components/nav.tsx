'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ui } from '@/lib/i18n'
import type { Role } from '@/types/database'
import { Sun, Moon } from 'lucide-react'

export function Nav({ role }: { role: Role }) {
  const router = useRouter()
  const supabase = createClient()
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  function toggleTheme() {
    const root = document.documentElement
    if (root.classList.contains('dark')) {
      root.classList.remove('dark')
      localStorage.setItem('theme', 'light')
      setIsDark(false)
    } else {
      root.classList.add('dark')
      localStorage.setItem('theme', 'dark')
      setIsDark(true)
    }
  }

  const candidateLinks = [
    { href: '/dashboard',  label: ui.nav.dashboard },
    { href: '/quiz',       label: ui.nav.quiz },
    { href: '/vocab',      label: ui.nav.vocab },
    { href: '/listening',  label: ui.nav.listening },
  ]

  const adminLinks = [
    { href: '/admin',                     label: ui.admin.candidates },
    { href: '/admin/quiz-preview',        label: '📋 Quiz del Día' },
    { href: '/admin/quiz-builder',        label: '⚡ Generador' },
    { href: '/admin/questions',           label: ui.admin.questions },
    { href: '/admin/case-sets',           label: 'Case Sets' },
    { href: '/admin/questions/translate', label: 'Traducir e Imágenes' },
    { href: '/admin/vocab',               label: ui.admin.vocab },
    { href: '/admin/exercises',           label: ui.admin.exercises },
    { href: '/admin/import',              label: 'Importar' },
    { href: '/admin/analytics',           label: 'Análisis' },
  ]

  const links = role === 'admin' ? adminLinks : candidateLinks

  return (
    <nav className="bg-teal-700 text-white px-4 py-3 flex items-center justify-between">
      <Link href={role === 'admin' ? '/admin' : '/dashboard'} className="font-bold text-lg">
        Viva Dental Prep
      </Link>
      <div className="flex items-center gap-4">
        {links.map(l => (
          <Link key={l.href} href={l.href} className="text-sm hover:text-teal-200 transition-colors">
            {l.label}
          </Link>
        ))}
        
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleTheme} 
          className="text-white hover:text-teal-200 hover:bg-teal-800 rounded-full h-8 w-8 shrink-0"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>

        <Button variant="ghost" size="sm" onClick={logout} className="text-white hover:text-teal-200 hover:bg-teal-800">
          {ui.nav.logout}
        </Button>
      </div>
    </nav>
  )

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }
}
