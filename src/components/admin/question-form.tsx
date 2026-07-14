'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, X, Plus } from 'lucide-react'
import type { Track, Difficulty, Option } from '@/types/database'

const WEEKS = Array.from({ length: 20 }, (_, i) => i + 1)

export function QuestionForm({ onSave }: { onSave?: () => void }) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [weeksData, setWeeksData] = useState<{ week_number: number; chapter_tags: string[] }[]>([])
  const [chapterTag, setChapterTag] = useState('')
  const [groups, setGroups] = useState<{ id: string; case_label: string; images?: { image_url: string }[] }[]>([])
  const [groupId, setGroupId] = useState('')
  const [newGroupName, setNewGroupName] = useState('')
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [manualLink, setManualLink] = useState('')
  const [uploading, setUploading] = useState(false)
  const [groupImages, setGroupImages] = useState<string[]>([])
  // Shared case text for the selected group (stored on case_sets.description)
  const [groupContextText, setGroupContextText] = useState('')

  const [form, setForm] = useState({
    track: 'nbdhe' as Track,
    week_number: 1,
    question_text: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    option_e: '',
    option_f: '',
    correct_option: 'a' as Option,
    explanation: '',
    context_text: '',
    difficulty: 'medium' as Difficulty,
  })

  // Load program weeks & chapters on mount
  useEffect(() => {
    async function loadWeeks() {
      const { data } = await supabase
        .from('program_weeks')
        .select('week_number, chapter_tags')
        .order('week_number')
      if (data) {
        setWeeksData(data)
        
        const savedTrack = sessionStorage.getItem('vdp_last_track') as Track | null
        const savedWeek = sessionStorage.getItem('vdp_last_week')
        const savedChapter = sessionStorage.getItem('vdp_last_chapter_tag')

        if (savedTrack) {
          setForm(f => ({ ...f, track: savedTrack }))
        }
        if (savedWeek) {
          setForm(f => ({ ...f, week_number: parseInt(savedWeek) }))
        }
        if (savedChapter) {
          setChapterTag(savedChapter)
        } else {
          const w1 = data.find(w => w.week_number === 1)
          if (w1?.chapter_tags?.length) {
            setChapterTag(w1.chapter_tags[0])
          }
        }
      }
    }
    loadWeeks()
  }, [])

  // Flat list of all unique chapters
  const allChapters = weeksData.reduce<{ tag: string; week: number }[]>((acc, curr) => {
    curr.chapter_tags.forEach(tag => {
      if (!acc.some(x => x.tag === tag)) {
        acc.push({ tag, week: curr.week_number })
      }
    })
    return acc
  }, [])

  function handleTrackChange(newTrack: Track) {
    set('track', newTrack)
    sessionStorage.setItem('vdp_last_track', newTrack)
  }

  function handleChapterChange(newTag: string) {
    setChapterTag(newTag)
    sessionStorage.setItem('vdp_last_chapter_tag', newTag)
    const match = allChapters.find(c => c.tag === newTag)
    if (match) {
      set('week_number', match.week)
      sessionStorage.setItem('vdp_last_week', String(match.week))
    }
  }

  function handleWeekChange(wNum: number) {
    set('week_number', wNum)
    sessionStorage.setItem('vdp_last_week', String(wNum))
    const selected = weeksData.find(w => w.week_number === wNum)
    if (selected?.chapter_tags?.length) {
      setChapterTag(selected.chapter_tags[0])
      sessionStorage.setItem('vdp_last_chapter_tag', selected.chapter_tags[0])
    }
  }

  function handleGroupChange(newGroupId: string) {
    setGroupId(newGroupId)
    sessionStorage.setItem('vdp_last_group_id', newGroupId)
  }

  // Load groups (case_sets) when chapter tag or track changes
  useEffect(() => {
    if (!chapterTag) {
      setGroups([])
      setGroupId('')
      return
    }
    async function loadGroups() {
      const { data } = await supabase
        .from('case_sets')
        .select('id, case_label, images:case_images(image_url)')
        .eq('chapter_tag', chapterTag)
        .eq('track', form.track)
        .eq('is_active', true)
        .order('case_label')
      if (data) {
        setGroups(data)
        const savedGroupId = sessionStorage.getItem('vdp_last_group_id') || ''
        if (savedGroupId && data.some(g => g.id === savedGroupId)) {
          setGroupId(savedGroupId)
        } else {
          setGroupId('')
        }
        setNewGroupName('')
      }
    }
    loadGroups()
  }, [chapterTag, form.track])

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

  function set(key: string, value: string | number) {
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

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      let finalGroupId = groupId
      let question_type = 'standalone'

      // 1. Create a new case set if needed
      if (groupId === 'new') {
        if (!newGroupName.trim()) {
          throw new Error('Por favor, ingresa un nombre para el nuevo grupo.')
        }

        // Check if group already exists in this chapter & track
        const { data: existingGroup } = await supabase
          .from('case_sets')
          .select('id')
          .eq('chapter_tag', chapterTag)
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
              chapter_tag: chapterTag,
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

      // 2. Determine type
      if (finalGroupId) {
        question_type = 'case'
      }

      // 3. Sequence order computation
      let sequence_order = null
      if (finalGroupId) {
        const { count } = await supabase
          .from('questions')
          .select('*', { count: 'exact', head: true })
          .eq('case_set_id', finalGroupId)
        sequence_order = (count ?? 0) + 1
      }

      // 4. Build and insert payload
      const payload = {
        track: form.track,
        week_number: form.week_number,
        chapter_tag: chapterTag || null,
        question_text: form.question_text,
        option_a: form.option_a,
        option_b: form.option_b,
        option_c: form.option_c.trim() || null,
        option_d: form.option_d.trim() || null,
        option_e: form.option_e.trim() || null,
        option_f: form.option_f.trim() || null,
        correct_option: form.correct_option,
        explanation: form.explanation.trim() || null,
        // Grouped questions use the shared case text on the case_set; only
        // standalone questions keep per-question text here.
        context_text: finalGroupId ? null : (form.context_text.trim() || null),
        difficulty: form.difficulty,
        image_url: imageUrls.length > 0 ? imageUrls[0] : null,
        image_urls: imageUrls,
        case_set_id: finalGroupId || null,
        question_type,
        sequence_order,
      }

      const { error: insertErr } = await supabase.from('questions').insert(payload)
      if (insertErr) throw insertErr

      // 5. Reset states and save selection keys in sessionStorage
      sessionStorage.setItem('vdp_last_track', form.track)
      sessionStorage.setItem('vdp_last_week', String(form.week_number))
      sessionStorage.setItem('vdp_last_chapter_tag', chapterTag)
      sessionStorage.setItem('vdp_last_group_id', finalGroupId || '')

      setForm({
        track: form.track, week_number: form.week_number, question_text: '',
        option_a: '', option_b: '', option_c: '', option_d: '', option_e: '', option_f: '',
        correct_option: 'a', explanation: '', context_text: '', difficulty: form.difficulty,
      })
      setImageUrls([])
      setGroupId('')
      setNewGroupName('')
      onSave?.()
      window.location.reload()
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Error al guardar la pregunta')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label>Track</Label>
          <Select value={form.track} onValueChange={v => v && handleTrackChange(v as Track)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="nbdhe">NBDHE</SelectItem>
              <SelectItem value="jurisprudence">Jurisprudencia</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Semana</Label>
          <Select value={String(form.week_number)} onValueChange={v => v && handleWeekChange(parseInt(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {WEEKS.map(w => <SelectItem key={w} value={String(w)}>Semana {w}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Dificultad</Label>
          <Select value={form.difficulty} onValueChange={v => v && set('difficulty', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="easy">Fácil</SelectItem>
              <SelectItem value="medium">Medio</SelectItem>
              <SelectItem value="hard">Difícil</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Capítulo</Label>
          <Select value={chapterTag} onValueChange={v => handleChapterChange(v || '')}>
            <SelectTrigger><SelectValue placeholder="Selecciona capítulo" /></SelectTrigger>
            <SelectContent>
              {allChapters.map(c => (
                <SelectItem key={c.tag} value={c.tag}>
                  {c.tag.toUpperCase()} (Semana {c.week})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Grupo / Case Set (opcional)</Label>
          <Select value={groupId} onValueChange={v => handleGroupChange(v || '')}>
            <SelectTrigger><SelectValue placeholder="Ninguno" /></SelectTrigger>
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
          <div className="text-xs text-teal-800 dark:text-teal-300 font-semibold flex items-center gap-1">
            <span>Grupo seleccionado:</span>
            <span className="font-bold">{groups.find(g => g.id === groupId)?.case_label}</span>
          </div>
          {groupImages.length > 0 ? (
            <div className="space-y-1.5">
              <span className="text-[10px] text-gray-500">Imágenes del grupo ({groupImages.length}):</span>
              <div className="flex gap-2 flex-wrap">
                {groupImages.map((url, index) => (
                  <div key={index} className="relative group w-16 h-16 border rounded bg-white overflow-hidden shadow-sm flex items-center justify-center">
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
        <div className="space-y-1 bg-teal-50/50 p-3 rounded-lg border border-teal-200">
          <Label className="text-teal-800 font-semibold">Nombre del nuevo grupo</Label>
          <Input 
            placeholder="ej. Grupo 2" 
            value={newGroupName} 
            onChange={e => setNewGroupName(e.target.value)} 
            required 
            className="bg-white border-teal-300"
          />
          <p className="text-[10px] text-teal-600">Este grupo se asociará automáticamente al capítulo seleccionado.</p>
        </div>
      )}

      <div>
        <Label>Pregunta</Label>
        <Textarea value={form.question_text} onChange={e => set('question_text', e.target.value)} required rows={3} />
      </div>

      {/* Required Options */}
      <div className="grid grid-cols-2 gap-3">
        {(['a', 'b'] as const).map(opt => (
          <div key={opt}>
            <Label>Opción {opt.toUpperCase()} *</Label>
            <Input value={form[`option_${opt}` as keyof typeof form] as string} onChange={e => set(`option_${opt}`, e.target.value)} required />
          </div>
        ))}
      </div>

      {/* Optional Options */}
      <div className="grid grid-cols-2 gap-3">
        {(['c', 'd', 'e', 'f'] as const).map(opt => (
          <div key={opt}>
            <Label>Opción {opt.toUpperCase()} (Opcional)</Label>
            <Input value={form[`option_${opt}` as keyof typeof form] as string} onChange={e => set(`option_${opt}`, e.target.value)} />
          </div>
        ))}
      </div>

      <div>
        <Label>Respuesta Correcta</Label>
        <Select value={form.correct_option} onValueChange={v => v && set('correct_option', v)}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(['a', 'b', 'c', 'd', 'e', 'f'] as Option[]).map(opt => (
              <SelectItem key={opt} value={opt}>{opt.toUpperCase()}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Case context text — shared across the group, or per-question for standalone */}
      <div className="space-y-1 p-4 bg-amber-50/40 border border-amber-200/60 rounded-lg dark:bg-amber-950/10">
        <Label className="font-semibold text-gray-800 dark:text-slate-200">
          {groupId ? 'Texto del caso (compartido con el grupo)' : 'Texto del caso (opcional)'}
        </Label>
        <p className="text-xs text-gray-500">
          {groupId
            ? 'Se muestra con TODAS las preguntas de este grupo, igual que las imágenes del grupo. Editarlo aquí lo cambia para todo el grupo.'
            : 'Un párrafo corto que se muestra con la pregunta. Úsalo para casos de solo texto, o junto con una imagen.'}
        </p>
        <Textarea
          value={groupId ? groupContextText : form.context_text}
          onChange={e => groupId ? setGroupContextText(e.target.value) : set('context_text', e.target.value)}
          rows={3}
          placeholder="Ej. Paciente de 45 años con antecedentes de diabetes tipo 2..."
          className="bg-white dark:bg-slate-900"
        />
      </div>

      {/* Image Upload Interface */}
      <div className="space-y-3 p-4 bg-gray-50 border rounded-lg dark:bg-slate-900/30">
        <Label className="font-semibold text-gray-800 dark:text-slate-200">Imágenes del Diagrama (múltiples opcionales)</Label>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* File Upload from PC */}
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-500">Subir desde la computadora</Label>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 px-3 py-2 bg-white border text-gray-700 rounded-md cursor-pointer hover:bg-gray-50 hover:text-gray-900 transition text-xs font-semibold shadow-sm">
                <Upload className="w-4 h-4 text-teal-600" />
                {uploading ? 'Subiendo...' : 'Seleccionar Archivos'}
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

          {/* External Link */}
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-500">O agregar enlace web</Label>
            <div className="flex gap-2">
              <Input 
                placeholder="https://..." 
                value={manualLink} 
                onChange={e => setManualLink(e.target.value)} 
                className="h-9 text-xs"
              />
              <Button 
                type="button" 
                size="sm" 
                onClick={addManualLink} 
                className="bg-gray-600 hover:bg-gray-700 text-white font-semibold h-9 px-3"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar
              </Button>
            </div>
          </div>
        </div>

        {/* Preview grid */}
        {imageUrls.length > 0 && (
          <div className="space-y-2 mt-2 pt-2 border-t">
            <Label className="text-xs text-gray-500 font-semibold">Imágenes agregadas ({imageUrls.length}):</Label>
            <div className="flex gap-3 flex-wrap">
              {imageUrls.map((url, index) => (
                <div key={index} className="relative group w-24 h-24 border rounded bg-white dark:bg-slate-900 overflow-hidden shadow-sm flex items-center justify-center">
                  <img src={url} alt={`Preview ${index + 1}`} className="max-w-full max-h-full object-contain" />
                  <button 
                    type="button"
                    onClick={() => setImageUrls(prev => prev.filter((_, i) => i !== index))}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 shadow opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Eliminar"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] text-center font-bold py-0.5">
                    #{index + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div>
        <Label>Explicación (opcional)</Label>
        <Textarea value={form.explanation} onChange={e => set('explanation', e.target.value)} rows={2} />
      </div>

      <Button type="submit" disabled={saving || uploading} className="bg-teal-600 hover:bg-teal-700 w-full text-white font-bold py-2">
        {saving ? 'Guardando...' : 'Guardar Pregunta'}
      </Button>
    </form>
  )
}
