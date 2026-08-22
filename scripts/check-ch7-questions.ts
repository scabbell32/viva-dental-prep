import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  const { data: ch7, error: err7 } = await supabase
    .from('questions')
    .select('is_legacy')
    .eq('chapter_tag', 'ch7')

  if (err7) {
    console.error('Error fetching ch7:', err7.message)
    return
  }

  const { data: ch8, error: err8 } = await supabase
    .from('questions')
    .select('is_legacy')
    .eq('chapter_tag', 'ch8')

  if (err8) {
    console.error('Error fetching ch8:', err8.message)
    return
  }

  console.log('ch7 is_legacy counts:')
  console.log('  true:', ch7?.filter(q => q.is_legacy === true).length)
  console.log('  false:', ch7?.filter(q => q.is_legacy === false).length)
  console.log('  null:', ch7?.filter(q => q.is_legacy === null).length)

  console.log('ch8 is_legacy counts:')
  console.log('  true:', ch8?.filter(q => q.is_legacy === true).length)
  console.log('  false:', ch8?.filter(q => q.is_legacy === false).length)
  console.log('  null:', ch8?.filter(q => q.is_legacy === null).length)
}

main().catch(console.error)
