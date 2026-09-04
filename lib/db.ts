import type { SupabaseClient } from '@supabase/supabase-js'

export type SiteContent = Record<string, string>

export type ScheduleEntry = {
  id: string
  day_id: string
  time_label: string
  title: string
  note: string | null
  photo_url: string | null
  photo_caption: string | null
  sort_order: number
}

export type ScheduleDay = {
  id: string
  day_name: string
  day_tag: string | null
  accent: 'rose' | 'violet' | 'teal'
  sort_order: number
}

export type DayWithEntries = ScheduleDay & { entries: ScheduleEntry[] }

export type PackingItem = {
  id: string
  section: 'general' | 'activities'
  text: string
  sort_order: number
}

export async function getSiteContent(supabase: SupabaseClient): Promise<SiteContent> {
  const { data } = await supabase.from('site_content').select('key, value')
  const result: SiteContent = {}
  for (const row of (data ?? []) as { key: string; value: string }[]) result[row.key] = row.value
  return result
}

export async function setSiteContent(supabase: SupabaseClient, key: string, value: string) {
  return supabase.from('site_content').upsert({ key, value })
}

export async function getScheduleDays(supabase: SupabaseClient): Promise<DayWithEntries[]> {
  const [{ data: days }, { data: entries }] = await Promise.all([
    supabase.from('schedule_days').select('*').order('sort_order', { ascending: true }),
    supabase.from('schedule_entries').select('*').order('sort_order', { ascending: true }),
  ])
  return ((days ?? []) as ScheduleDay[]).map((day) => ({
    ...day,
    entries: ((entries ?? []) as ScheduleEntry[]).filter((e) => e.day_id === day.id),
  }))
}

export async function addDay(
  supabase: SupabaseClient,
  data: { day_name: string; day_tag: string | null; accent: string; sort_order: number }
): Promise<ScheduleDay> {
  const { data: row, error } = await supabase.from('schedule_days').insert(data).select().single()
  if (error) throw error
  return row as ScheduleDay
}

export async function updateDay(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<Pick<ScheduleDay, 'day_name' | 'day_tag'>> & { accent?: string }
) {
  return supabase.from('schedule_days').update(patch).eq('id', id)
}

export async function deleteDay(supabase: SupabaseClient, id: string) {
  return supabase.from('schedule_days').delete().eq('id', id)
}

export async function addEntry(
  supabase: SupabaseClient,
  data: { day_id: string; time_label: string; title: string; sort_order: number }
): Promise<ScheduleEntry> {
  const { data: row, error } = await supabase
    .from('schedule_entries')
    .insert({ ...data, note: null, photo_url: null, photo_caption: null })
    .select()
    .single()
  if (error) throw error
  return row as ScheduleEntry
}

export async function updateEntry(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<Pick<ScheduleEntry, 'time_label' | 'title' | 'note' | 'photo_caption'>>
) {
  return supabase.from('schedule_entries').update(patch).eq('id', id)
}

export async function deleteEntry(supabase: SupabaseClient, id: string) {
  return supabase.from('schedule_entries').delete().eq('id', id)
}

export async function getPackingItems(supabase: SupabaseClient): Promise<PackingItem[]> {
  const { data } = await supabase.from('packing_items').select('*').order('sort_order', { ascending: true })
  return (data ?? []) as PackingItem[]
}

export async function addPackingItem(
  supabase: SupabaseClient,
  data: { section: 'general' | 'activities'; text: string; sort_order: number }
): Promise<PackingItem> {
  const { data: row, error } = await supabase.from('packing_items').insert(data).select().single()
  if (error) throw error
  return row as PackingItem
}

export async function updatePackingItem(supabase: SupabaseClient, id: string, text: string) {
  return supabase.from('packing_items').update({ text }).eq('id', id)
}

export async function deletePackingItem(supabase: SupabaseClient, id: string) {
  return supabase.from('packing_items').delete().eq('id', id)
}
