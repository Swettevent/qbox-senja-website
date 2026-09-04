'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { checkPassword, signSession, verifySession, COOKIE_NAME, MAX_AGE_SECONDS } from '@/lib/auth'
import { getSupabaseServer } from '@/lib/supabase-server'
import * as db from '@/lib/db'
import type { ScheduleDay, ScheduleEntry, PackingItem } from '@/lib/db'

export async function unlockEditMode(password: string): Promise<{ ok: boolean }> {
  const ok = checkPassword(password, process.env.ADMIN_PASSWORD ?? '')
  if (!ok) return { ok: false }
  const expiresAt = Date.now() + MAX_AGE_SECONDS * 1000
  const token = signSession(process.env.SESSION_SECRET ?? '', expiresAt)
  const store = await cookies()
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: MAX_AGE_SECONDS,
    path: '/',
  })
  return { ok: true }
}

export async function lockEditMode(): Promise<void> {
  const store = await cookies()
  store.delete(COOKIE_NAME)
}

export async function getEditMode(): Promise<boolean> {
  const store = await cookies()
  return verifySession(process.env.SESSION_SECRET ?? '', store.get(COOKIE_NAME)?.value)
}

async function requireEditMode() {
  if (!(await getEditMode())) throw new Error('Not in edit mode')
}

export async function updateContent(key: string, value: string): Promise<void> {
  await requireEditMode()
  await db.setSiteContent(getSupabaseServer(), key, value)
  revalidatePath('/')
}

export async function addScheduleDay(input: {
  day_name: string
  accent: string
  sort_order: number
}): Promise<ScheduleDay> {
  await requireEditMode()
  const day = await db.addDay(getSupabaseServer(), { ...input, day_tag: null })
  revalidatePath('/')
  return day
}

export async function updateScheduleDay(
  id: string,
  patch: { day_name?: string; day_tag?: string | null; accent?: string }
): Promise<void> {
  await requireEditMode()
  await db.updateDay(getSupabaseServer(), id, patch)
  revalidatePath('/')
}

export async function deleteScheduleDay(id: string): Promise<void> {
  await requireEditMode()
  await db.deleteDay(getSupabaseServer(), id)
  revalidatePath('/')
}

export async function addScheduleEntry(input: {
  day_id: string
  time_label: string
  title: string
  sort_order: number
}): Promise<ScheduleEntry> {
  await requireEditMode()
  const entry = await db.addEntry(getSupabaseServer(), input)
  revalidatePath('/')
  return entry
}

export async function updateScheduleEntry(
  id: string,
  patch: { time_label?: string; title?: string; note?: string | null; photo_caption?: string | null }
): Promise<void> {
  await requireEditMode()
  await db.updateEntry(getSupabaseServer(), id, patch)
  revalidatePath('/')
}

export async function deleteScheduleEntry(id: string): Promise<void> {
  await requireEditMode()
  await db.deleteEntry(getSupabaseServer(), id)
  revalidatePath('/')
}

export async function addPackingListItem(input: {
  section: 'general' | 'activities'
  text: string
  sort_order: number
}): Promise<PackingItem> {
  await requireEditMode()
  const item = await db.addPackingItem(getSupabaseServer(), input)
  revalidatePath('/')
  return item
}

export async function updatePackingListItem(id: string, text: string): Promise<void> {
  await requireEditMode()
  await db.updatePackingItem(getSupabaseServer(), id, text)
  revalidatePath('/')
}

export async function deletePackingListItem(id: string): Promise<void> {
  await requireEditMode()
  await db.deletePackingItem(getSupabaseServer(), id)
  revalidatePath('/')
}
