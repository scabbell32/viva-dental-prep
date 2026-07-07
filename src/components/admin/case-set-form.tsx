'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { CaseType, Track } from '@/types/database'

const CHAPTERS = [
  'ch2','ch3','ch4','ch5','ch6','ch7','ch8','ch9','ch10',
  'ch11','ch12','ch13','ch14','ch15','ch16','ch17','ch18','ch19','ch20','ch21',
]

const PATIENT_FIELDS = [
  { key: 'age', label: 'Age' },
  { key: 'sex', label: 'Sex' },
  { key: 'height', label: 'Height' },
  { key: 'weight', label: 'Weight' },
  { key: 'bp', label: 'Blood Pressure' },
  { key: 'pulse', label: 'Pulse' },
  { key: 'respiration_rate', label: 'Respiration Rate' },
  { key: 'chief_complaint', label: 'Chief Complaint' },
  { key: 'medical_history', label: 'Medical History' },
  { key: 'dental_history', label: 'Dental History' },
  { key: 'current_medications', label: 'Current Medications' },
  { key: 'social_history', label: 'Social History' },
]

export function CaseSetForm() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    chapter_tag: 'ch6',
    week_number: '',
    track: 'nbdhe' as Track,
    case_label: '',
    case_type: 'figure' as CaseType,
    description: '',
  })
  const [patientData, setPatientData] = useState<Record<string, string>>(
    Object.fromEntries(PATIENT_FIELDS.map(f => [f.key, '']))
  )

  function set(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function setPatient(key: string, value: string) {
    setPatientData(d => ({ ...d, [key]: value }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const payload = {
      ...form,
      week_number: form.week_number ? parseInt(form.week_number) : null,
      description: form.description.trim() || null,
      patient_data: form.case_type === 'patient'
        ? Object.fromEntries(Object.entries(patientData).filter(([, v]) => v.trim()))
        : null,
    }

    const res = await fetch('/api/admin/case-sets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    setSaving(false)
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'Error saving')
      return
    }
    const created = await res.json()
    router.push(`/admin/case-sets/${created.id}`)
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <Label>Chapter</Label>
          <Select value={form.chapter_tag} onValueChange={v => v && set('chapter_tag', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CHAPTERS.map(c => (
                <SelectItem key={c} value={c}>{c.toUpperCase()}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Track</Label>
          <Select value={form.track} onValueChange={v => v && set('track', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="nbdhe">NBDHE</SelectItem>
              <SelectItem value="jurisprudence">Jurisprudencia</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Type</Label>
          <Select value={form.case_type} onValueChange={v => v && set('case_type', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="figure">Figure (image/X-ray)</SelectItem>
              <SelectItem value="patient">Patient (chart + scenario)</SelectItem>
              <SelectItem value="text">Text (paragraph only)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Week #</Label>
          <Input
            type="number" min={1} max={20} placeholder="optional"
            value={form.week_number}
            onChange={e => set('week_number', e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label>Case Label <span className="text-gray-400 font-normal">(e.g. "Case A", "Fig. 6.45")</span></Label>
        <Input
          required
          placeholder="Case A"
          value={form.case_label}
          onChange={e => set('case_label', e.target.value)}
        />
      </div>

      {/* Scenario / description — used for all types */}
      <div>
        <Label>
          {form.case_type === 'patient' ? 'Scenario paragraph' : 'Description / passage'}
          <span className="text-gray-400 font-normal ml-1">(optional for figure cases)</span>
        </Label>
        <Textarea
          rows={4}
          placeholder="Enter the case scenario or passage text..."
          value={form.description}
          onChange={e => set('description', e.target.value)}
        />
      </div>

      {/* Patient chart fields — only when type = patient */}
      {form.case_type === 'patient' && (
        <div className="border rounded-md p-4 space-y-3 bg-gray-50">
          <p className="text-sm font-semibold text-gray-700">Patient Chart Data</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PATIENT_FIELDS.map(f => (
              <div key={f.key}>
                <Label className="text-xs">{f.label}</Label>
                {f.key === 'medical_history' || f.key === 'dental_history' || f.key === 'current_medications' || f.key === 'social_history' ? (
                  <Textarea
                    rows={2}
                    className="text-sm"
                    value={patientData[f.key]}
                    onChange={e => setPatient(f.key, e.target.value)}
                  />
                ) : (
                  <Input
                    className="text-sm"
                    value={patientData[f.key]}
                    onChange={e => setPatient(f.key, e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <Button type="submit" disabled={saving} className="bg-teal-600 hover:bg-teal-700">
        {saving ? 'Guardando...' : 'Crear Case Set'}
      </Button>
    </form>
  )
}
