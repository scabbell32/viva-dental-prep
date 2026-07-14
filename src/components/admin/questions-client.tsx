'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, X, Plus } from 'lucide-react'
import type { Track, Difficulty, Option } from '@/types/database'

type Question = {
  id: string
  track: string
  week_number: number | null
  chapter_tag: string | null
  question_text: string
  option_a: string; option_b: string; option_c: string | null; option_d: string | null; option_e: string | null; option_f: string | null
  correct_option: string
  explanation: string | null
  difficulty: string
  is_active: boolean
  is_legacy: boolean
  image_url: string | null
  image_urls: string[] | null
  context_text: string | null
  case_set_id: string | null
  sequence_order: number | null
  case_set?: { id: string; case_label: string; images?: { image_url: string }[] } | null
}

const WEEKS = Array.from({ length: 20 }, (_, i) => i + 1)
const OPTIONS = ['a', 'b', 'c', 'd', 'e', 'f'] as const

function EditForm({ question, onDone }: { question: Question; onDone: (updated: Question) => void }) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [weeksData, setWeeksData] = useState<{ week_number: number; chapter_tags: string[] }[]>([])
  const [groups, setGroups] = useState<{ id: string; case_label: string; images?: { image_url: string }[] }[]>([])
  const [groupId, setGroupId] = useState(question.case_set_id ?? '')
  const [newGroupName, setNewGroupName] = useState('')
  const [imageUrls, setImageUrls] = useState<string[]>(
    question.image_urls || (question.image_url ? [question.image_url] : [])
  )
  const [manualLink, setManualLink] = useState('')
  const [uploading, setUploading] = useState(false)
  const [groupImages, setGroupImages] = useState<string[]>([])
  // Shared case text for the selected group (stored on case_sets.description)
  const [groupContextText, setGroupContextText] = useState('')

  const [form, setForm] = useState({
    track: question.track as Track,
    week_number: question.week_number ?? 1,
    chapter_tag: question.chapter_tag ?? '',
    question_text: question.question_text,
    option_a: question.option_a,
    option_b: question.option_b,
    option_c: question.option_c ?? '',
    option_d: question.option_d ?? '',
    option_e: question.option_e ?? '',
    option_f: question.option_f ?? '',
    correct_option: question.correct_option as Option,
    explanation: question.explanation ?? '',
    context_text: question.context_text ?? '',
    difficulty: question.difficulty as Difficulty,
    is_active: question.is_active,
    is_legacy: question.is_legacy,
  })

  // Fetch weeks and chapters
  useEffect(() => {
    async function loadWeeks() {
      const { data } = await supabase
        .from('program_weeks')
        .select('week_number, chapter_tags')
        .order('week_number')
      if (data) {
        setWeeksData(data)
      }
    }
    loadWeeks()
  }, [])

  // Flat list of unique chapters
  const allChapters = weeksData.reduce<{ tag: string; week: number }[]>((acc, curr) => {
    curr.chapter_tags.forEach(tag => {
      if (!acc.some(x => x.tag === tag)) {
        acc.push({ tag, week: curr.week_number })
      }
    })
    return acc
  }, [])

  function handleChapterChange(newTag: string) {
    set('chapter_tag', newTag)
    const match = allChapters.find(c => c.tag === newTag)
    if (match) {
      set('week_number', match.week)
    }
  }

  function handleWeekChange(wNum: number) {
    set('week_number', wNum)
    const selected = weeksData.find(w => w.week_number === wNum)
    if (selected?.chapter_tags?.length) {
      set('chapter_tag', selected.chapter_tags[0])
    }
  }

  // Load groups (case_sets) when chapter tag or track changes
  useEffect(() => {
    if (!form.chapter_tag) {
      setGroups([])
      return
    }
    async function loadGroups() {
      const { data } = await supabase
        .from('case_sets')
        .select('id, case_label, images:case_images(image_url)')
        .eq('chapter_tag', form.chapter_tag)
        .eq('track', form.track)
        .eq('is_active', true)
        .order('case_label')
      if (data) {
        setGroups(data)
      }
    }
    loadGroups()
  }, [form.chapter_tag, form.track])

  // Load case images and shared case text when groupId changes
  useEffect(() => {
    if (!groupId || groupId === 'new') {
      setGroupImages([])
      setGroupContextText('')
      return
    }
    async function loadGroupData() {
      const { data: imgs } = await supabase
        .from('case_images')
        .select('image_url')
        .eq('case_set_id', groupId)
        .order('display_order')
      if (imgs) setGroupImages(imgs.map(img => img.image_url))
      const { data: cs } = await supabase
        .from('case_sets')
        .select('description')
        .eq('id', groupId)
        .maybeSingle()
      setGroupContextText(cs?.description ?? '')
    }
    loadGroupData()
  }, [groupId])

  async function handleDeleteGroupImage(url: string) {
    if (!groupId) return
    const confirmed = window.confirm('¿Seguro que deseas eliminar esta imagen de este grupo? Se eliminará del grupo y afectará a todas las preguntas que lo compartan.')
    if (!confirmed) return

    const { error } = await supabase
      .from('case_images')
      .delete()
      .eq('case_set_id', groupId)
      .eq('image_url', url)

    if (error) {
      alert(`Error al eliminar imagen: ${error.message}`)
    } else {
      setGroupImages(prev => prev.filter(imgUrl => imgUrl !== url))
      setGroups(prev => prev.map(g => {
        if (g.id === groupId) {
          return {
            ...g,
            images: g.images?.filter(img => img.image_url !== url)
          }
        }
        return g
      }))
    }
  }

  function set(key: string, value: string | number | boolean) {
    setForm(f => ({ ...f, [key]: value }))
  }

  // Handle local computer uploads
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    const newUrls = [...imageUrls]

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`
      const filePath = `questions/${fileName}`

      const { data, error } = await supabase.storage
        .from('question-images')
        .upload(filePath, file)

      if (error) {
        console.error('Error uploading file:', error.message)
        alert(`Error al subir imagen: ${error.message}`)
        continue
      }

      const { data: { publicUrl } } = supabase.storage
        .from('question-images')
        .getPublicUrl(filePath)

      newUrls.push(publicUrl)
    }

    setImageUrls(newUrls)
    setUploading(false)
  }

  function addManualLink() {
    if (!manualLink.trim()) return
    setImageUrls(prev => [...prev, manualLink.trim()])
    setManualLink('')
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      let finalGroupId = groupId
      let question_type = question.case_set_id ? 'case' : 'standalone'

      // 1. Create new case set if needed
      if (groupId === 'new') {
        if (!newGroupName.trim()) {
          throw new Error('Por favor, ingresa un nombre para el nuevo grupo.')
        }

        // Check if group already exists in this chapter & track
        const { data: existingGroup } = await supabase
          .from('case_sets')
          .select('id')
          .eq('chapter_tag', form.chapter_tag)
          .eq('track', form.track)
          .eq('case_label', newGroupName.trim())
          .eq('is_active', true)
          .maybeSingle()

        if (existingGroup) {
          finalGroupId = existingGroup.id
        } else {
          const { data: newGroup, error: groupErr } = await supabase
            .from('case_sets')
            .insert({
              chapter_tag: form.chapter_tag,
              week_number: form.week_number,
              track: form.track,
              case_label: newGroupName.trim(),
              case_type: 'figure',
            })
            .select('id')
            .single()

          if (groupErr) throw groupErr
          finalGroupId = newGroup.id
        }
        question_type = 'case'
      } else if (!groupId) {
        question_type = 'standalone'
      } else {
        question_type = 'case'
      }

      // If we have a group and we have uploaded images, ensure they are inserted in case_images
      if (finalGroupId && imageUrls.length > 0) {
        const { data: existingImages } = await supabase
          .from('case_images')
          .select('image_url')
          .eq('case_set_id', finalGroupId)

        const existingUrls = new Set(existingImages?.map(i => i.image_url) ?? [])
        const newImagesToInsert = imageUrls.filter(url => !existingUrls.has(url))

        if (newImagesToInsert.length > 0) {
          const { data: lastImage } = await supabase
            .from('case_images')
            .select('display_order')
            .eq('case_set_id', finalGroupId)
            .order('display_order', { ascending: false })
            .limit(1)
            .maybeSingle()
          
          let nextOrder = (lastImage?.display_order ?? 0) + 1

          const caseImagesPayload = newImagesToInsert.map((url) => ({
            case_set_id: finalGroupId,
            image_url: url,
            display_order: nextOrder++,
          }))

          const { error: imagesErr } = await supabase
            .from('case_images')
            .insert(caseImagesPayload)

          if (imagesErr) {
            console.error('Error inserting case images:', imagesErr)
          }
        }
      }

      // Shared case text lives on the case_set (like group images), so it shows
      // on every question in the group.
      if (finalGroupId) {
        const { error: descErr } = await supabase
          .from('case_sets')
          .update({ description: groupContextText.trim() || null })
          .eq('id', finalGroupId)
        if (descErr) console.error('Error saving case text:', descErr)
      }

      // 2. Compute sequence order if group changes
      let sequence_order: number | null = finalGroupId === question.case_set_id ? question.sequence_order : null
      if (finalGroupId && finalGroupId !== question.case_set_id) {
        const { count } = await supabase
          .from('questions')
          .select('*', { count: 'exact', head: true })
          .eq('case_set_id', finalGroupId)
        sequence_order = (count ?? 0) + 1
      }

      const payload = {
        track: form.track,
        week_number: form.week_number,
        chapter_tag: form.chapter_tag.trim() || null,
        question_text: form.question_text,
        option_a: form.option_a,
        option_b: form.option_b,
        option_c: form.option_c.trim() || null,
        option_d: form.option_d.trim() || null,
        option_e: form.option_e.trim() || null,
        option_f: form.option_f.trim() || null,
        correct_option: form.correct_option as Option,
        explanation: form.explanation.trim() || null,
        // Grouped questions use the shared case text on the case_set; only
        // standalone questions keep per-question text here.
        context_text: finalGroupId ? null : (form.context_text.trim() || null),
        difficulty: form.difficulty as Difficulty,
        is_active: form.is_active,
        is_legacy: form.is_legacy,
        image_url: imageUrls.length > 0 ? imageUrls[0] : null,
        image_urls: imageUrls,
        case_set_id: finalGroupId || null,
        question_type,
        sequence_order,
      }

      // Use Server API proxy or direct client update
      const { error: updateErr } = await supabase
        .from('questions')
        .update(payload)
        .eq('id', question.id)

      if (updateErr) throw updateErr

      setSaving(false)
      onDone({ ...question, ...payload })
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Error al guardar cambios')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="mt-4 pt-4 border-t space-y-4">
      <div className="grid grid-cols-5 gap-3">
        <div>
          <Label className="text-xs">Track</Label>
          <Select value={form.track} onValueChange={v => v && set('track', v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="nbdhe">NBDHE</SelectItem>
              <SelectItem value="jurisprudence">Jurisprudencia</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Semana</Label>
          <Select value={String(form.week_number)} onValueChange={v => v && handleWeekChange(parseInt(v))}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {WEEKS.map(w => <SelectItem key={w} value={String(w)}>Sem. {w}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Dificultad</Label>
          <Select value={form.difficulty} onValueChange={v => v && set('difficulty', v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="easy">Fácil</SelectItem>
              <SelectItem value="medium">Medio</SelectItem>
              <SelectItem value="hard">Difícil</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Activa</Label>
          <Select value={form.is_active ? 'true' : 'false'} onValueChange={v => set('is_active', v === 'true')}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Sí</SelectItem>
              <SelectItem value="false">No</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Legacy / Importada</Label>
          <Select value={form.is_legacy ? 'true' : 'false'} onValueChange={v => set('is_legacy', v === 'true')}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Sí</SelectItem>
              <SelectItem value="false">No</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Capítulo</Label>
          <Select value={form.chapter_tag} onValueChange={v => handleChapterChange(v || '')}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
            <SelectContent>
              {allChapters.map(c => (
                <SelectItem key={c.tag} value={c.tag}>{c.tag.toUpperCase()} (Semana {c.week})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs">Grupo / Case Set (opcional)</Label>
          <Select value={groupId} onValueChange={v => setGroupId(v || '')}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Ninguno" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">Ninguno</SelectItem>
              {groups.map(g => {
                const imgCount = g.images?.length ?? 0
                return (
                  <SelectItem key={g.id} value={g.id}>
                    {g.case_label} {imgCount > 0 ? `🖼️ (${imgCount})` : '(sin imagen)'}
                  </SelectItem>
                )
              })}
              <SelectItem value="new">+ Crear nuevo grupo...</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {groupId && groupId !== 'new' && (
        <div className="space-y-2 p-3 bg-teal-50/20 border border-teal-200/50 rounded-lg dark:bg-teal-950/20">
          <div className="text-xs text-teal-800 dark:text-teal-300 font-semibold flex items-center justify-between">
            <span className="flex items-center gap-1">
              <span>Grupo seleccionado:</span>
              <span className="font-bold">{groups.find(g => g.id === groupId)?.case_label}</span>
            </span>
          </div>
          {groupImages.length > 0 ? (
            <div className="space-y-1.5">
              <span className="text-[10px] text-gray-500">Imágenes del grupo ({groupImages.length}):</span>
              <div className="flex gap-2 flex-wrap">
                {groupImages.map((url, index) => (
                  <div key={index} className="relative group w-14 h-14 border rounded bg-white overflow-hidden shadow-sm flex items-center justify-center">
                    <img src={url} alt={`Group view ${index + 1}`} className="max-w-full max-h-full object-contain" />
                    <button 
                      type="button"
                      onClick={() => handleDeleteGroupImage(url)}
                      className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 shadow opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Eliminar de todo el grupo"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <span className="text-[10px] text-amber-600 font-medium">⚠️ Este grupo no tiene imágenes asociadas todavía.</span>
          )}
        </div>
      )}

      {groupId === 'new' && (
        <div className="space-y-1 bg-teal-50/50 p-2 rounded border border-teal-200">
          <Label className="text-xs text-teal-850 font-semibold">Nombre del nuevo grupo</Label>
          <Input 
            placeholder="ej. Grupo 2" 
            value={newGroupName} 
            onChange={e => setNewGroupName(e.target.value)} 
            required 
            className="h-8 text-xs bg-white"
          />
        </div>
      )}

      <div>
        <Label className="text-xs">Pregunta</Label>
        <Textarea value={form.question_text} onChange={e => set('question_text', e.target.value)} required rows={3} className="text-sm" />
      </div>

      {/* Case context text — shared across the group, or per-question for standalone */}
      <div className="space-y-1 p-3 bg-amber-50/40 border border-amber-200/60 rounded-lg dark:bg-amber-950/10">
        <Label className="text-xs font-semibold text-gray-800 dark:text-slate-200">
          {groupId ? 'Texto del caso (compartido con el grupo)' : 'Texto del caso (opcional)'}
        </Label>
        <p className="text-[10px] text-gray-500">
          {groupId
            ? 'Se muestra con TODAS las preguntas de este grupo, igual que las imágenes del grupo. Editarlo aquí lo cambia para todo el grupo.'
            : 'Un párrafo corto que se muestra con la pregunta. Úsalo para casos de solo texto, o junto con una imagen.'}
        </p>
        <Textarea
          value={groupId ? groupContextText : form.context_text}
          onChange={e => groupId ? setGroupContextText(e.target.value) : set('context_text', e.target.value)}
          rows={3}
          placeholder="Ej. Paciente de 45 años con antecedentes de diabetes tipo 2..."
          className="text-sm bg-white dark:bg-slate-900"
        />
      </div>

      {/* Image Upload Interface */}
      <div className="space-y-3 p-3 bg-gray-50 border rounded-lg">
        <Label className="text-xs font-semibold text-gray-800">Imágenes del Diagrama (múltiples opcionales)</Label>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-[10px] text-gray-500">Subir desde la computadora</Label>
            <div className="flex items-center">
              <label className="flex items-center gap-1 px-2.5 py-1.5 bg-white border text-gray-700 rounded cursor-pointer hover:bg-gray-50 transition text-xs font-semibold shadow-sm">
                <Upload className="w-3.5 h-3.5 text-teal-600" />
                {uploading ? 'Subiendo...' : 'Subir Imagen'}
                <input 
                  type="file" 
                  multiple 
                  accept="image/*" 
                  onChange={handleFileUpload} 
                  disabled={uploading} 
                  className="hidden" 
                />
              </label>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] text-gray-500">Agregar enlace web</Label>
            <div className="flex gap-1.5">
              <Input 
                placeholder="https://..." 
                value={manualLink} 
                onChange={e => setManualLink(e.target.value)} 
                className="h-8 text-xs"
              />
              <Button 
                type="button" 
                size="sm" 
                onClick={addManualLink} 
                className="bg-gray-600 hover:bg-gray-700 text-white font-semibold h-8 px-2.5 text-xs"
              >
                <Plus className="w-3 h-3" /> Add
              </Button>
            </div>
          </div>
        </div>

        {imageUrls.length > 0 && (
          <div className="space-y-1.5 mt-1.5 pt-1.5 border-t">
            <Label className="text-[10px] text-gray-500 font-semibold font-mono">Imágenes ({imageUrls.length}):</Label>
            <div className="flex gap-2 flex-wrap">
              {imageUrls.map((url, index) => (
                <div key={index} className="relative group w-16 h-16 border rounded bg-white overflow-hidden shadow-sm flex items-center justify-center">
                  <img src={url} alt={`Preview ${index + 1}`} className="max-w-full max-h-full object-contain" />
                  <button 
                    type="button"
                    onClick={() => setImageUrls(prev => prev.filter((_, i) => i !== index))}
                    className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 shadow opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                  <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] text-center font-bold py-0.2">
                    #{index + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Required Options */}
      <div className="grid grid-cols-2 gap-3">
        {(['a', 'b'] as const).map(opt => (
          <div key={opt}>
            <Label className="text-xs">Opción {opt.toUpperCase()} *</Label>
            <Input className="h-8 text-xs" value={form[`option_${opt}` as keyof typeof form] as string} onChange={e => set(`option_${opt}`, e.target.value)} required />
          </div>
        ))}
      </div>

      {/* Optional Options */}
      <div className="grid grid-cols-2 gap-3">
        {(['c', 'd', 'e', 'f'] as const).map(opt => (
          <div key={opt}>
            <Label className="text-xs">Opción {opt.toUpperCase()} (Opcional)</Label>
            <Input className="h-8 text-xs" value={form[`option_${opt}` as keyof typeof form] as string ?? ''} onChange={e => set(`option_${opt}`, e.target.value)} />
          </div>
        ))}
      </div>

      <div>
        <Label className="text-xs">Respuesta correcta</Label>
        <Select value={form.correct_option} onValueChange={v => v && set('correct_option', v)}>
          <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {OPTIONS.map(opt => <SelectItem key={opt} value={opt}>{opt.toUpperCase()}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs">Explicación (opcional)</Label>
        <Textarea value={form.explanation} onChange={e => set('explanation', e.target.value)} rows={2} className="text-sm" />
      </div>

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={saving || uploading} className="bg-teal-600 hover:bg-teal-700 text-xs text-white font-semibold">
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </Button>
        <Button type="button" size="sm" variant="outline" className="text-xs" onClick={() => onDone(question)}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}

const REPORT_REASON_LABELS: Record<string, string> = {
  garbled: 'Texto confuso',
  wrong_answer: 'Respuesta incorrecta',
  duplicate_options: 'Opciones repetidas',
  other: 'Otro',
}

type ReportInfo = { count: number; reasons: string[] }

export function QuestionsClient({ questions: initial, reports = {} }: { questions: Question[]; reports?: Record<string, ReportInfo> }) {
  const supabase = createClient()
  const [questions, setQuestions] = useState(initial)
  const [reportMap, setReportMap] = useState(reports)
  const [editing, setEditing] = useState<string | null>(null)
  const [filter, setFilter] = useState('')
  const [weekFilter, setWeekFilter] = useState<string>('all')
  const [legacyFilter, setLegacyFilter] = useState<string>('all')
  const [reportedOnly, setReportedOnly] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [resolving, setResolving] = useState<string | null>(null)

  async function resolveReports(questionId: string) {
    setResolving(questionId)
    await supabase
      .from('question_reports')
      .update({ status: 'resolved' })
      .eq('question_id', questionId)
      .eq('status', 'open')
    setReportMap(prev => {
      const next = { ...prev }
      delete next[questionId]
      return next
    })
    setResolving(null)
  }

  function applyEdit(updated: Question) {
    setQuestions(prev => prev.map(q => q.id === updated.id ? updated : q))
    setEditing(null)
  }

  async function del(id: string) {
    if (!confirm('¿Eliminar esta pregunta permanentemente?')) return
    setDeleting(id)
    await supabase.from('questions').delete().eq('id', id)
    setQuestions(prev => prev.filter(q => q.id !== id))
    setDeleting(null)
  }

  const totalReported = Object.keys(reportMap).length

  const filtered = questions.filter(q => {
    const matchesWeek = weekFilter === 'all' || String(q.week_number) === weekFilter
    const matchesLegacy = legacyFilter === 'all' ||
      (legacyFilter === 'legacy' && q.is_legacy) ||
      (legacyFilter === 'new' && !q.is_legacy)
    const matchesReported = !reportedOnly || Boolean(reportMap[q.id])
    const search = filter.toLowerCase()
    const matchesSearch = !search ||
      q.question_text.toLowerCase().includes(search) ||
      (q.chapter_tag ?? '').toLowerCase().includes(search) ||
      q.option_a.toLowerCase().includes(search)
    return matchesWeek && matchesLegacy && matchesReported && matchesSearch
  })

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Input
          placeholder="Buscar pregunta..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="max-w-xs h-8 text-sm"
        />
        <Select value={weekFilter} onValueChange={v => setWeekFilter(v ?? 'all')}>
          <SelectTrigger className="w-36 h-8 text-sm"><SelectValue placeholder="Semana" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las semanas</SelectItem>
            {WEEKS.map(w => <SelectItem key={w} value={String(w)}>Semana {w}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={legacyFilter} onValueChange={v => setLegacyFilter(v ?? 'all')}>
          <SelectTrigger className="w-44 h-8 text-sm"><SelectValue placeholder="Procedencia" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas (Nuevas y Legacy)</SelectItem>
            <SelectItem value="new">Solo Nuevas / Verificadas</SelectItem>
            <SelectItem value="legacy">Solo Legacy (Importadas)</SelectItem>
          </SelectContent>
        </Select>
        <Button
          type="button"
          size="sm"
          variant={reportedOnly ? 'default' : 'outline'}
          onClick={() => setReportedOnly(v => !v)}
          className={`h-8 text-xs ${reportedOnly ? 'bg-red-600 hover:bg-red-700 text-white' : totalReported > 0 ? 'border-red-300 text-red-700' : ''}`}
          disabled={totalReported === 0 && !reportedOnly}
        >
          🚩 Reportadas{totalReported > 0 ? ` (${totalReported})` : ''}
        </Button>
        <span className="text-sm text-gray-500 self-center">{filtered.length} pregunta{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Question list */}
      <div className="space-y-2">
        {filtered.map(q => {
          const groupImages = q.case_set?.images?.map((img: any) => img.image_url) ?? []
          const questionImages = (q.image_urls && q.image_urls.length > 0) ? q.image_urls : (q.image_url ? [q.image_url] : [])
          const currentImages = [...questionImages, ...groupImages]

          return (
            <div key={q.id} className={`rounded-lg border bg-white p-4 ${!q.is_active ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex gap-2 flex-wrap items-center">
                    <Badge variant="outline" className="text-xs">{q.track.toUpperCase()}</Badge>
                    {q.week_number && <Badge variant="secondary" className="text-xs">Sem. {q.week_number}</Badge>}
                    <Badge variant="secondary" className="text-xs capitalize">{q.difficulty}</Badge>
                    {q.is_legacy && <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">Legacy</Badge>}
                    {reportMap[q.id] && (
                      <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-300">
                        🚩 Reportada ({reportMap[q.id].count}){reportMap[q.id].reasons.length > 0 ? `: ${reportMap[q.id].reasons.map(r => REPORT_REASON_LABELS[r] ?? r).join(', ')}` : ''}
                      </Badge>
                    )}
                    {q.case_set && (
                      <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                        Grupo: {q.case_set.case_label}
                      </Badge>
                    )}
                    {groupImages.length > 0 && (
                      <Badge variant="outline" className="text-xs text-indigo-600 border-indigo-200 bg-indigo-50/50">
                        🖼️ {groupImages.length} del grupo
                      </Badge>
                    )}
                    {questionImages.length > 0 && (
                      <Badge variant="outline" className="text-xs text-blue-600 border-blue-200 bg-blue-50/50">
                        🖼️ {questionImages.length} de preg.
                      </Badge>
                    )}
                    {q.chapter_tag && <span className="text-xs text-gray-400">{q.chapter_tag}</span>}
                    {!q.is_active && <Badge variant="destructive" className="text-xs">Inactiva</Badge>}
                  </div>

                  {/* Image thumbnails */}
                  {currentImages.length > 0 && (
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {currentImages.map((url, imgIdx) => (
                        <div key={imgIdx} className="relative group max-h-20 rounded border overflow-hidden bg-white">
                          <img src={url} alt={`Diagrama ${imgIdx + 1}`} className="max-h-20 object-contain" />
                          <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] text-center py-0.5">
                            {imgIdx < questionImages.length ? 'Pregunta' : 'Grupo'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {q.context_text && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-1 whitespace-pre-wrap">
                      📝 {q.context_text}
                    </p>
                  )}
                  <p className="font-medium text-sm mt-1">{q.question_text}</p>
                  <div className="text-xs text-gray-500 space-y-0.5">
                    {OPTIONS.filter(opt => opt === 'a' || opt === 'b' || Boolean(q[`option_${opt}` as keyof typeof q])).map(opt => (
                      <p key={opt} className={opt === q.correct_option ? 'text-green-600 font-semibold' : ''}>
                        {opt.toUpperCase()}. {q[`option_${opt}` as keyof typeof q] as string}
                        {opt === q.correct_option && ' ✓'}
                      </p>
                    ))}
                  </div>
                  {q.explanation && <p className="text-xs text-blue-600 italic mt-1">{q.explanation}</p>}
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  {reportMap[q.id] && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7 border-green-300 text-green-700"
                      disabled={resolving === q.id}
                      onClick={() => resolveReports(q.id)}
                      title="Marcar los reportes de esta pregunta como resueltos"
                    >
                      {resolving === q.id ? '...' : '✓ Resolver'}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7"
                    onClick={() => setEditing(editing === q.id ? null : q.id)}
                  >
                    {editing === q.id ? 'Cerrar' : 'Editar'}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="text-xs h-7"
                    disabled={deleting === q.id}
                    onClick={() => del(q.id)}
                  >
                    {deleting === q.id ? '...' : 'Eliminar'}
                  </Button>
                </div>
              </div>

              {editing === q.id && (
                <EditForm question={q} onDone={applyEdit} />
              )}
            </div>
          )
        })}

        {filtered.length === 0 && (
          <p className="text-gray-400 text-center py-8">No se encontraron preguntas.</p>
        )}
      </div>
    </div>
  )
}
