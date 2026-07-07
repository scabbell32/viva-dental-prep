import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { question_id } = await req.json()
  if (!question_id) return NextResponse.json({ error: 'question_id required' }, { status: 400 })

  const adminDb = createAdminClient()

  // Upsert — idempotent if already added
  const { data: item, error } = await adminDb
    .from('study_stack_items')
    .upsert({ candidate_id: user.id, question_id }, { onConflict: 'candidate_id,question_id', ignoreDuplicates: false })
    .select('id, status')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fire-and-forget teaching script generation if not already done
  if (item.status === 'pending') {
    generateScript(adminDb, item.id, question_id).catch(console.error)
  }

  return NextResponse.json({ ok: true, id: item.id })
}

async function generateScript(adminDb: ReturnType<typeof createAdminClient>, itemId: string, questionId: string) {
  try {
    // Fetch full question for context
    const { data: q } = await adminDb
      .from('questions')
      .select('question_text, option_a, option_b, option_c, option_d, correct_option, explanation, explanation_es, question_text_es, option_a_es, option_b_es, option_c_es, option_d_es')
      .eq('id', questionId)
      .single()

    if (!q) throw new Error('Question not found')

    const correctLetter = q.correct_option.toUpperCase()
    const correctText = q[`option_${q.correct_option}` as keyof typeof q] as string

    const prompt = `You are a bilingual dental hygiene NBDHE exam coach. Write a 3-4 sentence teaching explanation in English for the following exam question. Focus on WHY the answer is correct, the underlying clinical concept, and one memory tip. Be concise and direct — this will be read aloud.

Question: ${q.question_text}

Options:
A. ${q.option_a}
B. ${q.option_b}
C. ${q.option_c}
D. ${q.option_d}

Correct answer: ${correctLetter}. ${correctText}

Official explanation: ${q.explanation || 'N/A'}

Teaching script:`

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error('No Anthropic API key')

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) throw new Error(`Claude API error: ${res.status}`)
    const json = await res.json()
    const script = (json.content?.[0]?.text as string ?? '').trim()

    await adminDb
      .from('study_stack_items')
      .update({ teaching_script: script, status: 'ready' })
      .eq('id', itemId)
  } catch (err) {
    console.error('[study-stack] script generation failed:', err)
    await adminDb
      .from('study_stack_items')
      .update({ status: 'error' })
      .eq('id', itemId)
  }
}
