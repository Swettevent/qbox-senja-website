import { getSupabaseServer } from '@/lib/supabase-server'
import * as db from '@/lib/db'
import { getEditMode } from '@/app/actions'
import HomePage from '@/components/HomePage'

export default async function Page() {
  const supabase = getSupabaseServer()
  const [content, days, packing, editMode] = await Promise.all([
    db.getSiteContent(supabase),
    db.getScheduleDays(supabase),
    db.getPackingItems(supabase),
    getEditMode(),
  ])

  return (
    <HomePage
      initialContent={content}
      initialDays={days}
      initialPacking={packing}
      initialEditMode={editMode}
    />
  )
}
