import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized: No active session' }, { status: 401 })
    }
    
    if (user.user_metadata?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin role required' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const weekStr = searchParams.get('week')
    if (!weekStr) {
      return NextResponse.json({ error: 'Missing week parameter' }, { status: 400 })
    }
    const week = parseInt(weekStr, 10)

    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from('questions')
      .select(`
        *,
        case_study:case_studies (
          id,
          title,
          title_es,
          synopsis,
          synopsis_es
        )
      `)
      .eq('week_number', week)
      .order('chapter_tag', { ascending: true })
      .order('question_text', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized: No active session' }, { status: 401 })
    }
    
    if (user.user_metadata?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin role required' }, { status: 403 })
    }

    const { question_id, editForm, editCase } = await req.json()
    if (!question_id) {
      return NextResponse.json({ error: 'Missing question_id' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // 1. Update case study if present
    if (editCase && editCase.id) {
      const { error: csErr } = await adminClient
        .from('case_studies')
        .update({
          title_es: editCase.title_es || null,
          synopsis_es: editCase.synopsis_es || null
        })
        .eq('id', editCase.id)
        
      if (csErr) {
        return NextResponse.json({ error: `Case Study error: ${csErr.message}` }, { status: 500 })
      }
    }

    // 2. Update question translations, English originals, is_active & image url
    const { error: qErr } = await adminClient
      .from('questions')
      .update({
        // English fields
        question_text: editForm.question_text,
        option_a: editForm.option_a,
        option_b: editForm.option_b,
        option_c: editForm.option_c || null,
        option_d: editForm.option_d || null,
        option_e: editForm.option_e || null,
        option_f: editForm.option_f || null,
        explanation: editForm.explanation || null,
        is_active: editForm.is_active,
        // Spanish fields
        question_text_es: editForm.question_text_es || null,
        option_a_es: editForm.option_a_es || null,
        option_b_es: editForm.option_b_es || null,
        option_c_es: editForm.option_c_es || null,
        option_d_es: editForm.option_d_es || null,
        option_e_es: editForm.option_e_es || null,
        option_f_es: editForm.option_f_es || null,
        explanation_es: editForm.explanation_es || null,
        // Image
        image_url: (editForm.image_urls && editForm.image_urls.length > 0) ? editForm.image_urls[0] : (editForm.image_url || null),
        image_urls: editForm.image_urls || (editForm.image_url ? [editForm.image_url] : [])
      })
      .eq('id', question_id)

    if (qErr) {
      return NextResponse.json({ error: `Question error: ${qErr.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
