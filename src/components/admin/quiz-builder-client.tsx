'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import type { AdminQuestion, CaseSetWithImages, Option } from '@/types/database'

const OPTIONS: Option[] = ['a', 'b', 'c', 'd', 'e', 'f']
const OPTION_LABELS: Record<Option, string> = { a: 'A', b: 'B', c: 'C', d: 'D', e: 'E', f: 'F' }

const DIFFICULTY_COLOR: Record<string, string> = {
  easy:   'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  hard:   'bg-red-100 text-red-700',
}
const DIFFICULTY_LABEL: Record<string, string> = {
  easy: 'Fácil', medium: 'Medio', hard: 'Difícil',
}

const TYPE_COLOR: Record<string, string> = {
  standalone: 'bg-gray-100 text-gray-600',
  case:       'bg-purple-100 text-purple-700',
}

interface Props {
  chapters: string[]
}

const RANGES: Record<string, { min: number; max: number; label: string }> = {
  '7-10':  { min: 7,  max: 10, label: '7–10 (corto)' },
  '10-15': { min: 10, max: 15, label: '10–15 (normal)' },
  '15-20': { min: 15, max: 20, label: '15–20 (largo)' },
}


interface PreviewSection {
  type: 'standalone'
  question: AdminQuestion
  index: number
}
interface PreviewCaseSection {
  type: 'case_group'
  caseSet: CaseSetWithImages
  questions: AdminQuestion[]
  startIndex: number
}
type Section = PreviewSection | PreviewCaseSection

function buildSections(questions: AdminQuestion[]): Section[] {
  const sections: Section[] = []
  let i = 0
  let counter = 1

  while (i < questions.length) {
    const q = questions[i]
    if (q.question_type === 'case' && q.case_set) {
      // Collect all consecutive questions with the same case_set_id
      const caseSetId = q.case_set_id
      const groupQs: AdminQuestion[] = []
      while (i < questions.length && questions[i].case_set_id === caseSetId) {
        groupQs.push(questions[i])
        i++
      }
      sections.push({ type: 'case_group', caseSet: q.case_set, questions: groupQs, startIndex: counter })
      counter += groupQs.length
    } else {
      sections.push({ type: 'standalone', question: q, index: counter })
      counter++
      i++
    }
  }
  return sections
}

function CaseHeader({ caseSet }: { caseSet: CaseSetWithImages }) {
  const [imgIdx, setImgIdx] = useState(0)
  const images = caseSet.images ?? []

  return (
    <div className="rounded-xl border-2 border-purple-200 bg-purple-50 overflow-hidden mb-2">
      <div className="flex items-center gap-2 px-4 py-2 bg-purple-100 border-b border-purple-200">
        <span className="text-xs font-bold text-purple-700 uppercase tracking-wide">
          {caseSet.case_label}
        </span>
        <Badge className="text-xs bg-purple-200 text-purple-700 border-0">
          {caseSet.case_type}
        </Badge>
        <span className="text-xs text-purple-500 ml-auto">
          {caseSet.chapter_tag?.toUpperCase()}
        </span>
      </div>

      <div className="p-4 space-y-3">
        {/* Patient data table */}
        {caseSet.case_type === 'patient' && caseSet.patient_data && (
          <div className="rounded-lg border border-purple-200 overflow-hidden text-sm">
            <table className="w-full">
              <tbody>
                {Object.entries(caseSet.patient_data as Record<string, string>).map(([k, v]) => (
                  <tr key={k} className="border-b border-purple-100 last:border-0">
                    <td className="px-3 py-1.5 font-medium text-purple-700 bg-purple-50 w-36 capitalize text-xs">
                      {k.replace(/_/g, ' ')}
                    </td>
                    <td className="px-3 py-1.5 text-gray-700 text-xs">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Images with prev/next */}
        {images.length > 0 && (
          <div className="space-y-2">
            <div className="relative rounded-lg overflow-hidden bg-white border border-purple-200">
              <img
                src={images[imgIdx]?.image_url}
                alt={images[imgIdx]?.caption ?? 'Case image'}
                className="w-full max-h-64 object-contain"
              />
              {images[imgIdx]?.caption && (
                <p className="text-xs text-center text-gray-500 py-1 border-t border-purple-100">
                  {images[imgIdx].caption}
                </p>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setImgIdx(i => Math.max(0, i - 1))}
                  disabled={imgIdx === 0}
                  className="px-3 py-1 text-xs rounded border border-purple-200 bg-white text-purple-600 disabled:opacity-30"
                >
                  ← Anterior
                </button>
                <span className="text-xs text-purple-500">{imgIdx + 1} / {images.length}</span>
                <button
                  onClick={() => setImgIdx(i => Math.min(images.length - 1, i + 1))}
                  disabled={imgIdx === images.length - 1}
                  className="px-3 py-1 text-xs rounded border border-purple-200 bg-white text-purple-600 disabled:opacity-30"
                >
                  Siguiente →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Scenario text */}
        {caseSet.description && (
          <div>
            <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1">Scenario</p>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{caseSet.description}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function QuestionCard({ q, index }: { q: AdminQuestion; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const optionsToShow = OPTIONS.filter(o => q[`option_${o}` as keyof AdminQuestion] != null)

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden mb-3">
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100 flex-wrap">
        <span className="text-xs font-bold text-gray-500">#{index}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFFICULTY_COLOR[q.difficulty] ?? 'bg-gray-100 text-gray-500'}`}>
          {DIFFICULTY_LABEL[q.difficulty] ?? q.difficulty}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLOR[q.question_type] ?? ''}`}>
          {q.question_type === 'case' ? 'caso' : 'individual'}
        </span>
        {q.chapter_tag && (
          <span className="text-xs text-gray-400">{q.chapter_tag.toUpperCase()}</span>
        )}
      </div>

      <div className="p-4">
        {q.context_text && (
          <p className="text-xs text-gray-600 bg-indigo-50 border border-indigo-100 rounded px-2.5 py-1.5 mb-2 whitespace-pre-wrap">{q.context_text}</p>
        )}
        <p className="font-semibold text-gray-800 text-sm leading-relaxed mb-3">{q.question_text}</p>

        <div className="space-y-1.5">
          {optionsToShow.map(opt => {
            const text = q[`option_${opt}` as keyof AdminQuestion] as string
            return (
              <div key={opt} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded text-xs font-bold bg-gray-100 text-gray-500 shrink-0 mt-0.5">
                  {OPTION_LABELS[opt]}
                </span>
                <span>{text}</span>
              </div>
            )
          })}
        </div>

        <button
          onClick={() => setExpanded(v => !v)}
          className="mt-3 text-xs text-indigo-500 hover:text-indigo-700 font-medium"
        >
          {expanded ? '▲ Ocultar respuesta' : '▼ Ver respuesta correcta'}
        </button>

        {expanded && (
          <div className="mt-2 p-3 rounded-lg bg-green-50 border border-green-200 text-sm">
            <span className="font-semibold text-green-700">
              Correcta: {OPTION_LABELS[q.correct_option as Option] ?? q.correct_option?.toUpperCase()}
            </span>
            {q.explanation && (
              <p className="text-gray-600 mt-1 text-xs leading-relaxed">{q.explanation}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function QuizBuilderClient({ chapters }: Props) {
  const router = useRouter()
  const [range, setRange]         = useState('10-15')
  const [chapter, setChapter]     = useState('all')
  const [difficulty, setDiff]     = useState('mixed')
  const [qType, setQType]         = useState('both')
  const [loading, setLoading]     = useState(false)
  const [settingDaily, setSettingDaily] = useState(false)
  const [publishDate, setPublishDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [questions, setQuestions] = useState<AdminQuestion[] | null>(null)
  const [error, setError]         = useState<string | null>(null)

  async function generate() {
    setLoading(true)
    setError(null)
    setQuestions(null)

    const { min, max } = RANGES[range] ?? RANGES['10-15']
    const params = new URLSearchParams({
      track: 'nbdhe',
      week: '20',
      min: String(min),
      max: String(max),
      difficulty,
      type: qType,
    })
    if (chapter !== 'all') params.set('chapter_tag', chapter)

    const res = await fetch(`/api/quiz/questions?${params}`)
    setLoading(false)
    if (!res.ok) {
      setError('No se pudieron cargar las preguntas. Verifica los filtros.')
      return
    }
    const data = await res.json()
    setQuestions(data)
  }

  async function setAsDailyQuiz() {
    if (!questions || questions.length === 0) return
    setSettingDaily(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/daily-quiz/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionIds: questions.map(q => q.id), date: publishDate }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        router.push(`/admin/quiz-preview?date=${publishDate}`)
        router.refresh()
      } else {
        setError(data.error ?? 'Error al establecer como Quiz del Día')
      }
    } catch (e) {
      console.error('Error setting daily quiz:', e)
      setError('Error de red al establecer como Quiz del Día')
    } finally {
      setSettingDaily(false)
    }
  }

  const sections = questions ? buildSections(questions) : []
  const totalCount = questions?.length ?? 0
  const caseCount = questions?.filter(q => q.question_type === 'case').length ?? 0
  const standaloneCount = totalCount - caseCount

  return (
    <div className="space-y-6">
      {/* Config card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
        <h2 className="font-semibold text-gray-700 text-sm">Parámetros del Quiz</h2>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <div>
            <Label className="text-xs text-gray-500 mb-1 block">¿Cuántas preguntas?</Label>
            <Select value={range} onValueChange={v => v && setRange(v)}>
              <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(RANGES).map(([key, r]) => (
                  <SelectItem key={key} value={key}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-gray-400 mt-1">El número exacto se ajusta según los grupos de casos.</p>
          </div>

          <div>
            <Label className="text-xs text-gray-500 mb-1 block">Capítulo</Label>
            <Select value={chapter} onValueChange={v => v && setChapter(v)}>
              <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los capítulos</SelectItem>
                {chapters.map(c => (
                  <SelectItem key={c} value={c}>{c.toUpperCase()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-gray-500 mb-1 block">Dificultad</Label>
            <Select value={difficulty} onValueChange={v => v && setDiff(v)}>
              <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mixed">Mixta</SelectItem>
                <SelectItem value="easy">Fácil</SelectItem>
                <SelectItem value="medium">Medio</SelectItem>
                <SelectItem value="hard">Difícil</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-gray-500 mb-1 block">Tipo de pregunta</Label>
            <Select value={qType} onValueChange={v => v && setQType(v)}>
              <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="both">Mixto</SelectItem>
                <SelectItem value="standalone">Solo individual</SelectItem>
                <SelectItem value="case">Solo casos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-gray-500 mb-1 block">Fecha de Publicación</Label>
            <input
              type="date"
              value={publishDate}
              onChange={e => setPublishDate(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            />
          </div>
        </div>

        <Button
          onClick={generate}
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 w-full sm:w-auto"
        >
          {loading ? 'Generando...' : '⚡ Generar Vista Previa'}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Preview */}
      {questions !== null && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-700">
                {totalCount} pregunta{totalCount !== 1 ? 's' : ''}
              </span>
              {caseCount > 0 && (
                <Badge className="bg-purple-100 text-purple-700 border-0 text-xs">
                  {caseCount} de caso
                </Badge>
              )}
              {standaloneCount > 0 && (
                <Badge className="bg-gray-100 text-gray-600 border-0 text-xs">
                  {standaloneCount} individual{standaloneCount !== 1 ? 'es' : ''}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                onClick={setAsDailyQuiz}
                disabled={settingDaily || loading}
                className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 h-8 flex items-center gap-1.5"
              >
                {settingDaily ? 'Estableciendo...' : '📅 Establecer como Quiz del Día'}
              </Button>
              <button
                onClick={generate}
                className="text-xs text-indigo-500 hover:text-indigo-700 font-medium"
              >
                ↻ Regenerar
              </button>
            </div>
          </div>

          {totalCount === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white py-12 text-center">
              <p className="text-gray-400 text-sm">No se encontraron preguntas con esos filtros.</p>
              <p className="text-gray-400 text-xs mt-1">Prueba cambiando el capítulo, la dificultad, o el tipo.</p>
            </div>
          ) : (
            <div>
              {sections.map((section, si) => {
                if (section.type === 'case_group') {
                  return (
                    <div key={`group-${si}`} className="mb-6">
                      <CaseHeader caseSet={section.caseSet} />
                      {section.questions.map((q, qi) => (
                        <QuestionCard key={q.id} q={q} index={section.startIndex + qi} />
                      ))}
                    </div>
                  )
                }
                return <QuestionCard key={section.question.id} q={section.question} index={section.index} />
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
