'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertCircle, CheckCircle, Image as ImageIcon } from 'lucide-react'

const WEEKS = Array.from({ length: 20 }, (_, i) => i + 1)

interface CaseStudy {
  id: string
  title: string
  title_es: string | null
  synopsis: string
  synopsis_es: string | null
}

interface Question {
  id: string
  week_number: number
  chapter_tag: string
  question_text: string
  option_a: string
  option_b: string
  option_c: string | null
  option_d: string | null
  option_e: string | null
  option_f: string | null
  correct_option: 'a' | 'b' | 'c' | 'd' | 'e' | 'f'
  explanation: string | null
  question_text_es: string | null
  option_a_es: string | null
  option_b_es: string | null
  option_c_es: string | null
  option_d_es: string | null
  option_e_es: string | null
  option_f_es: string | null
  explanation_es: string | null
  image_url: string | null
  image_urls: string[] | null
  case_set_id: string | null
  is_active: boolean
  track: string
  difficulty: string
  is_legacy: boolean
  case_study?: CaseStudy | null
}

export default function TranslatePage() {
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [loadingUser, setLoadingUser] = useState(true)
  const [selectedWeek, setSelectedWeek] = useState(1)
  const [questions, setQuestions] = useState<Question[]>([])
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [queryError, setQueryError] = useState<string | null>(null)
  
  // Scroll ref for main workspace
  const mainScrollRef = useRef<HTMLDivElement>(null)

  // Editing state
  const [editForm, setEditForm] = useState({
    // English fields
    question_text: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    option_e: '',
    option_f: '',
    explanation: '',
    is_active: true,
    // Spanish fields
    question_text_es: '',
    option_a_es: '',
    option_b_es: '',
    option_c_es: '',
    option_d_es: '',
    option_e_es: '',
    option_f_es: '',
    explanation_es: '',
    // Image
    image_url: '',
    image_urls: [] as string[],
  })
  
  const [editCase, setEditCase] = useState({
    id: '',
    title_es: '',
    synopsis_es: '',
  })

  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Auth check
  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoadingUser(false)
    }
    checkAuth()
  }, [])

  // Load questions for selected week via server-side API (bypasses client RLS recursion)
  useEffect(() => {
    async function loadQuestions() {
      setLoadingQuestions(true)
      setSelectedIdx(null)
      setQueryError(null)
      
      try {
        const res = await fetch(`/api/admin/questions?week=${selectedWeek}`)
        const data = await res.json()
        
        if (!res.ok) {
          throw new Error(data.error || 'Failed to load questions')
        }
        
        setQuestions(data || [])
      } catch (e) {
        console.error(e)
        setQueryError((e as Error).message)
      } finally {
        setLoadingQuestions(false)
      }
    }
    loadQuestions()
  }, [selectedWeek])

  // Populate editing form and scroll workspace back to top on question change
  useEffect(() => {
    if (selectedIdx !== null && questions[selectedIdx]) {
      const q = questions[selectedIdx]
      setEditForm({
        question_text: q.question_text || '',
        option_a: q.option_a || '',
        option_b: q.option_b || '',
        option_c: q.option_c || '',
        option_d: q.option_d || '',
        option_e: q.option_e || '',
        option_f: q.option_f || '',
        explanation: q.explanation || '',
        is_active: q.is_active ?? true,
        question_text_es: q.question_text_es || '',
        option_a_es: q.option_a_es || '',
        option_b_es: q.option_b_es || '',
        option_c_es: q.option_c_es || '',
        option_d_es: q.option_d_es || '',
        option_e_es: q.option_e_es || '',
        option_f_es: q.option_f_es || '',
        explanation_es: q.explanation_es || '',
        image_url: q.image_url || '',
        image_urls: q.image_urls || [],
      })
      
      if (q.case_study) {
        setEditCase({
          id: q.case_study.id,
          title_es: q.case_study.title_es || '',
          synopsis_es: q.case_study.synopsis_es || '',
        })
      } else {
        setEditCase({
          id: '',
          title_es: '',
          synopsis_es: '',
        })
      }
      
      if (mainScrollRef.current) {
        mainScrollRef.current.scrollTop = 0
      }
    }
  }, [selectedIdx, questions])

  const selectedQuestion = selectedIdx !== null ? questions[selectedIdx] : null

  async function handleSave() {
    if (!selectedQuestion) return
    setSaving(true)
    setMessage(null)

    try {
      const res = await fetch('/api/admin/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question_id: selectedQuestion.id,
          editForm,
          editCase: selectedQuestion.case_study ? {
            id: editCase.id,
            title_es: editCase.title_es,
            synopsis_es: editCase.synopsis_es,
          } : null,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save question')
      }

      // Update local state
      const updatedQuestions = [...questions]
      updatedQuestions[selectedIdx!] = {
        ...selectedQuestion,
        question_text: editForm.question_text,
        option_a: editForm.option_a,
        option_b: editForm.option_b,
        option_c: editForm.option_c || null,
        option_d: editForm.option_d || null,
        option_e: editForm.option_e || null,
        option_f: editForm.option_f || null,
        explanation: editForm.explanation || null,
        is_active: editForm.is_active,
        question_text_es: editForm.question_text_es || null,
        option_a_es: editForm.option_a_es || null,
        option_b_es: editForm.option_b_es || null,
        option_c_es: editForm.option_c_es || null,
        option_d_es: editForm.option_d_es || null,
        option_e_es: editForm.option_e_es || null,
        option_f_es: editForm.option_f_es || null,
        explanation_es: editForm.explanation_es || null,
        image_url: editForm.image_url || null,
        image_urls: editForm.image_urls || [],
        case_study: selectedQuestion.case_study ? {
          ...selectedQuestion.case_study,
          title_es: editCase.title_es || null,
          synopsis_es: editCase.synopsis_es || null
        } : null
      }
      setQuestions(updatedQuestions)
      setMessage({ type: 'success', text: '¡Cambios guardados con éxito!' })
    } catch (e) {
      console.error(e)
      setMessage({ type: 'error', text: `Error al guardar: ${(e as Error).message}` })
    } finally {
      setSaving(false)
    }
  }

  function handleNext() {
    if (selectedIdx !== null && selectedIdx < questions.length - 1) {
      setSelectedIdx(selectedIdx + 1)
      setMessage(null)
    }
  }

  function handlePrev() {
    if (selectedIdx !== null && selectedIdx > 0) {
      setSelectedIdx(selectedIdx - 1)
      setMessage(null)
    }
  }

  if (loadingUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-slate-950">
        <p className="text-sm font-semibold text-gray-500 dark:text-slate-400">Verificando sesión...</p>
      </div>
    )
  }

  if (!user || user.user_metadata?.role !== 'admin') {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2 bg-gray-50 dark:bg-slate-950 p-4 text-center">
        <AlertCircle className="w-8 h-8 text-red-500" />
        <h2 className="text-lg font-bold text-gray-800 dark:text-slate-200">Acceso Denegado</h2>
        <p className="text-sm text-gray-500 dark:text-slate-400">Se requieren privilegios de Administrador.</p>
        <Link href="/login" className="text-xs text-indigo-500 underline mt-2">Ir al Login</Link>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-gray-50 dark:bg-slate-950 font-sans text-gray-800 dark:text-slate-200 overflow-hidden">
      
      {/* HEADER BAR */}
      <header className="flex h-14 items-center justify-between border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <Link href="/admin/questions" className="text-xs text-indigo-500 hover:underline font-semibold">
            ← Volver a Preguntas
          </Link>
          <span className="h-4 w-px bg-gray-200 dark:bg-slate-800" />
          <h1 className="text-sm font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
            Espacio de Traducción (Inglés ➔ Español)
          </h1>
        </div>
        <div className="text-xs text-gray-400 dark:text-slate-500">
          Sesión: <span className="font-semibold text-gray-600 dark:text-slate-300">{user.email}</span>
        </div>
      </header>
      
      <div className="flex-1 flex overflow-hidden">
        {/* SIDEBAR: Question list */}
        <aside className="w-80 border-r border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 flex flex-col shrink-0">
          <div className="p-4 border-b border-gray-200 dark:border-slate-800 space-y-2">
            <Label className="font-semibold text-gray-700 dark:text-slate-300">Seleccionar Semana de Estudio</Label>
            <Select value={String(selectedWeek)} onValueChange={v => v && setSelectedWeek(parseInt(v, 10))}>
              <SelectTrigger className="w-full bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WEEKS.map(w => (
                  <SelectItem key={w} value={String(w)}>Semana {w}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 min-h-0">
            {loadingQuestions ? (
              <p className="text-xs text-gray-450 text-center py-6">Cargando pool...</p>
            ) : queryError ? (
              <p className="text-xs text-red-500 text-center py-6">{queryError}</p>
            ) : questions.length === 0 ? (
              <p className="text-xs text-gray-450 text-center py-6">No hay preguntas esta semana.</p>
            ) : (
              questions.map((q, idx) => {
                const isTranslated = !!q.question_text_es && !!q.option_a_es && !!q.option_b_es && !!q.option_c_es && !!q.option_d_es
                const hasImage = !!q.image_url || (q.image_urls && q.image_urls.length > 0)
                const isActive = q.is_active ?? true
                
                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      setSelectedIdx(idx)
                      setMessage(null)
                    }}
                    className={`w-full text-left p-3 rounded-lg border transition-all flex flex-col gap-2 ${
                      selectedIdx === idx
                        ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800 shadow-sm'
                        : 'bg-white dark:bg-slate-900 border-gray-150 dark:border-slate-800/80 hover:bg-gray-50 dark:hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="scale-90 font-mono border-gray-300 dark:border-slate-700 text-gray-500 dark:text-slate-400">{q.chapter_tag?.toUpperCase() || 'UNTAGGED'}</Badge>
                        <span className="font-semibold text-gray-400 dark:text-slate-500">Q{idx + 1}</span>
                        {!isActive && (
                          <Badge variant="secondary" className="scale-75 bg-gray-200 dark:bg-slate-800 text-gray-600 dark:text-slate-400 font-bold">Inactivo</Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {isTranslated ? (
                          <span title="Traducido"><CheckCircle className="w-3.5 h-3.5 text-green-500" /></span>
                        ) : (
                          <span title="Traducción pendiente"><AlertCircle className="w-3.5 h-3.5 text-gray-300 dark:text-slate-700" /></span>
                        )}
                        {hasImage && (
                          <span title="Con Imagen"><ImageIcon className="w-3.5 h-3.5 text-blue-500" /></span>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-gray-750 dark:text-slate-350 line-clamp-2 leading-relaxed font-semibold text-xs">
                      {q.question_text}
                    </p>
                  </button>
                )
              })
            )}
          </div>
        </aside>

        {/* WORKSPACE AREA */}
        <main ref={mainScrollRef} className="flex-1 overflow-y-auto p-6 bg-gray-50/50 dark:bg-slate-950/20">
          {selectedQuestion ? (
            <div className="max-w-5xl mx-auto space-y-6">
              
              {/* Question metadata badge bar */}
              <div className="flex justify-between items-center border-b border-gray-200 dark:border-slate-850 pb-3">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-xs uppercase">{selectedQuestion.track}</Badge>
                  <Badge variant="secondary" className="text-xs">Semana {selectedQuestion.week_number}</Badge>
                  <Badge variant="outline" className="text-xs capitalize">{selectedQuestion.difficulty}</Badge>
                  {selectedQuestion.is_legacy && <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">Legacy</Badge>}
                </div>
                
                {/* Save status notification */}
                {message && (
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded shadow-sm border ${
                    message.type === 'success' 
                      ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900' 
                      : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900'
                  }`}>
                    {message.text}
                  </span>
                )}
              </div>

              {/* CASE STUDY BOX - ONLY IF ASSOCIATED */}
              {selectedQuestion.case_study && (
                <Card className="border-indigo-100 dark:border-indigo-900 bg-indigo-50/20 dark:bg-indigo-950/5">
                  <CardHeader className="py-2.5 px-4 bg-indigo-50/50 dark:bg-indigo-950/10 border-b border-indigo-100 dark:border-indigo-900">
                    <CardTitle className="text-xs text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider">Estudio de Caso Clínico Asociado</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1 bg-white dark:bg-slate-900 p-2.5 border rounded">
                        <p className="font-bold text-gray-500 dark:text-slate-500 uppercase tracking-wide text-[9px]">English Synopsis (Original)</p>
                        <p className="font-bold text-gray-800 dark:text-slate-200 mt-1">{selectedQuestion.case_study.title}</p>
                        <p className="text-gray-650 mt-1 leading-relaxed">{selectedQuestion.case_study.synopsis}</p>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <Label className="text-indigo-650 font-bold">Título del Caso (Español)</Label>
                          <Input 
                            value={editCase.title_es}
                            onChange={e => setEditCase({ ...editCase, title_es: e.target.value })}
                            className="text-xs mt-1 bg-white dark:bg-slate-900 border-indigo-150"
                            placeholder="ej. Caso Clínico A: Periodoncia..."
                          />
                        </div>
                        <div>
                          <Label className="text-indigo-650 font-bold">Sinopsis del Caso (Español)</Label>
                          <Textarea 
                            value={editCase.synopsis_es}
                            onChange={e => setEditCase({ ...editCase, synopsis_es: e.target.value })}
                            rows={3}
                            className="text-xs mt-1 bg-white dark:bg-slate-900 border-indigo-150 leading-relaxed"
                            placeholder="Describa el historial, la tabla clínica o los detalles clínicos traducidos..."
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* GRID WORKSPACE */}
              <div className="grid grid-cols-2 gap-6">
                
                {/* English Column */}
                <div className="space-y-4">
                  <Card className="border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/50">
                    <CardHeader className="py-3 px-4 border-b border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50">
                      <CardTitle className="text-xs text-gray-400 dark:text-slate-500 font-bold uppercase tracking-wider">Original English Question (Editable)</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                      <div>
                        <Label className="text-xs text-gray-400 dark:text-slate-500 font-semibold">Question Statement</Label>
                        <Textarea
                          value={editForm.question_text}
                          onChange={e => setEditForm({ ...editForm, question_text: e.target.value })}
                          rows={3}
                          required
                          className="mt-1 text-sm bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 text-gray-800 dark:text-slate-100"
                          placeholder="Edit English question statement..."
                        />
                      </div>
                      
                      <div className="space-y-3 mt-2">
                        <Label className="text-xs text-gray-400 dark:text-slate-500 font-semibold">Options</Label>
                        {(['a', 'b', 'c', 'd', 'e', 'f'] as const).map(opt => {
                          const hasOriginalOpt = opt === 'a' || opt === 'b' || Boolean(selectedQuestion[`option_${opt}` as keyof Question])
                          if (!hasOriginalOpt) return null
                          const isRequired = opt === 'a' || opt === 'b'
                          return (
                            <div key={opt} className="flex items-center gap-2">
                              <Badge variant={opt === selectedQuestion.correct_option ? 'default' : 'outline'} className="font-mono h-6 w-6 justify-center shrink-0">
                                {opt.toUpperCase()}
                              </Badge>
                              <Input
                                value={editForm[`option_${opt}` as keyof typeof editForm] as string ?? ''}
                                onChange={e => setEditForm({ ...editForm, [`option_${opt}`]: e.target.value })}
                                required={isRequired}
                                className="text-xs bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-300"
                                placeholder={`Option ${opt.toUpperCase()}...`}
                              />
                            </div>
                          )
                        })}
                      </div>

                      <div>
                        <Label className="text-sm font-bold text-gray-500 dark:text-slate-400">Explanation / Rationale</Label>
                        <Textarea
                          value={editForm.explanation}
                          onChange={e => setEditForm({ ...editForm, explanation: e.target.value })}
                          rows={4}
                          className="mt-1.5 text-sm bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 text-gray-800 dark:text-slate-100 leading-relaxed whitespace-pre-wrap"
                          placeholder="Edit English explanation..."
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Spanish Column */}
                <div className="space-y-4">
                  <Card className="border-teal-100 dark:border-teal-900 bg-white dark:bg-slate-900/50 shadow-sm">
                    <CardHeader className="py-3 px-4 border-b border-teal-100 dark:border-teal-900/50 bg-teal-50/30 dark:bg-teal-950/5">
                      <CardTitle className="text-xs text-teal-600 dark:text-teal-400 font-bold uppercase tracking-wider">Traducción al Español</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                      <div>
                        <Label className="text-xs text-teal-600 dark:text-teal-400 font-semibold">Enunciado de la Pregunta</Label>
                        <Textarea
                          value={editForm.question_text_es}
                          onChange={e => setEditForm({ ...editForm, question_text_es: e.target.value })}
                          rows={3}
                          required
                          className="mt-1 text-sm bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 text-gray-800 dark:text-slate-100"
                          placeholder="Ingrese el enunciado traducido al español..."
                        />
                      </div>

                      <div className="space-y-3 mt-2">
                        <Label className="text-xs text-teal-600 dark:text-teal-400 font-semibold">Opciones de Respuesta</Label>
                        {(['a', 'b', 'c', 'd', 'e', 'f'] as const).map(opt => {
                          const hasOriginalOpt = opt === 'a' || opt === 'b' || Boolean(selectedQuestion[`option_${opt}` as keyof Question])
                          if (!hasOriginalOpt) return null
                          const isRequired = opt === 'a' || opt === 'b'
                          return (
                            <div key={opt} className="flex items-center gap-2">
                              <Badge variant={opt === selectedQuestion.correct_option ? 'default' : 'outline'} className="font-mono h-6 w-6 justify-center shrink-0">
                                {opt.toUpperCase()}
                              </Badge>
                              <Input
                                value={editForm[`option_${opt}_es` as keyof typeof editForm] as string ?? ''}
                                onChange={e => setEditForm({ ...editForm, [`option_${opt}_es`]: e.target.value })}
                                required={isRequired}
                                className="text-xs bg-white dark:bg-slate-900 border-teal-100 dark:border-teal-900 text-gray-700 dark:text-slate-350"
                                placeholder={`Traducción de Opción ${opt.toUpperCase()}...`}
                              />
                            </div>
                          )
                        })}
                      </div>

                      <div>
                        <Label className="text-sm font-bold text-teal-600 dark:text-teal-400">Explicación / Rationale (Español)</Label>
                        <Textarea
                          value={editForm.explanation_es}
                          onChange={e => setEditForm({ ...editForm, explanation_es: e.target.value })}
                          rows={4}
                          className="mt-1.5 text-sm bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 text-gray-800 dark:text-slate-100 leading-relaxed whitespace-pre-wrap"
                          placeholder="Ingrese la explicación traducida..."
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* IMAGE MANAGEMENT BOX */}
              <Card className="border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/50">
                <CardHeader className="py-3 px-4 border-b border-gray-200 dark:border-slate-800 flex flex-row items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-teal-600" />
                  <CardTitle className="text-sm font-bold text-gray-700 dark:text-slate-300">Imágenes y Diagramas Clínicos</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="space-y-1 bg-gray-50/50 dark:bg-slate-900/10 p-3.5 rounded border border-dashed border-gray-200 dark:border-slate-850">
                    <Label className="text-xs font-semibold text-gray-600 dark:text-slate-400">Enlace de Imagen (Opcional):</Label>
                    <div className="flex gap-2 mt-1.5 max-w-xl">
                      <Input 
                        value={editForm.image_url} 
                        onChange={(e) => setEditForm({ ...editForm, image_url: e.target.value })}
                        className="text-xs bg-white dark:bg-slate-900" 
                        placeholder="ej. /images/figures/fig1.png o https://..." 
                      />
                      {editForm.image_url && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setEditForm({ ...editForm, image_url: '' })}
                          className="text-red-500 hover:text-red-700"
                        >
                          Limpiar
                        </Button>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 dark:text-slate-500">
                      * Puede colocar imágenes en la carpeta pública de Next.js: <code className="font-mono bg-gray-100 dark:bg-slate-800 px-1 py-0.5 rounded">public/images/figures/</code> y colocar la ruta relativa aquí, por ejemplo: <code className="font-mono bg-gray-100 dark:bg-slate-800 px-1 py-0.5 rounded">/images/figures/fig-8-91.png</code>.
                    </p>
                  </div>
                  
                  {((editForm.image_urls && editForm.image_urls.length > 0) || editForm.image_url) && (
                    <div className="border border-gray-200 dark:border-slate-800 rounded bg-gray-50 dark:bg-slate-900 p-4 flex flex-col items-center justify-center space-y-2">
                      <Label className="text-xs text-gray-400 dark:text-slate-500">Vista Previa de Imágenes:</Label>
                      <div className="flex gap-2 flex-wrap justify-center">
                        {(editForm.image_urls && editForm.image_urls.length > 0 ? editForm.image_urls : [editForm.image_url]).map((url, idx) => (
                          <img 
                            key={idx}
                            src={url} 
                            alt={`Preview ${idx + 1}`} 
                            onError={(e) => {
                              (e.target as any).style.display = 'none';
                            }}
                            className="max-h-40 object-contain rounded border shadow-sm bg-white dark:bg-slate-900" 
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* SAVE CONTROL BAR */}
              <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900/50 p-4 rounded-lg border border-gray-200 dark:border-slate-800 shadow-sm">
                
                {/* Active Question Switch */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active_toggle"
                    checked={editForm.is_active}
                    onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <Label htmlFor="is_active_toggle" className="text-xs font-semibold cursor-pointer">
                    Pregunta Activa (Mostrar a alumnos)
                  </Label>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={handlePrev}
                    disabled={selectedIdx === 0}
                    className="text-xs bg-white dark:bg-slate-900"
                  >
                    ◄ Anterior
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleNext}
                    disabled={selectedIdx === questions.length - 1}
                    className="text-xs bg-white dark:bg-slate-900"
                  >
                    Siguiente ►
                  </Button>
                  
                  <span className="h-6 w-px bg-gray-200 dark:bg-slate-800" />
                  
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5"
                  >
                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                  </Button>
                </div>
              </div>

            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <p className="text-sm text-gray-400 dark:text-slate-500 italic">Seleccione una pregunta de la barra lateral para comenzar a traducir...</p>
            </div>
          )}
        </main>
      </div>

    </div>
  )
}
