import { describe, it, expect, vi } from 'vitest'
import * as db from '@/lib/db'
import type { SupabaseClient } from '@supabase/supabase-js'

function client(from: ReturnType<typeof vi.fn>) {
  return { from } as unknown as SupabaseClient
}

describe('getSiteContent', () => {
  it('turns key/value rows into a lookup object', async () => {
    const from = vi.fn(() => ({
      select: vi.fn().mockResolvedValue({
        data: [{ key: 'hero_title', value: 'Senja' }, { key: 'hero_dates', value: '16–20 september' }],
      }),
    }))
    const result = await db.getSiteContent(client(from))
    expect(result).toEqual({ hero_title: 'Senja', hero_dates: '16–20 september' })
    expect(from).toHaveBeenCalledWith('site_content')
  })

  it('returns an empty object when there are no rows', async () => {
    const from = vi.fn(() => ({ select: vi.fn().mockResolvedValue({ data: null }) }))
    const result = await db.getSiteContent(client(from))
    expect(result).toEqual({})
  })
})

describe('setSiteContent', () => {
  it('upserts key and value', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null })
    await db.setSiteContent(client(vi.fn(() => ({ upsert }))), 'hero_title', 'Senja')
    expect(upsert).toHaveBeenCalledWith({ key: 'hero_title', value: 'Senja' })
  })
})

describe('getScheduleDays', () => {
  it('nests entries under their day, both ordered by sort_order', async () => {
    const days = [
      { id: 'd1', day_name: 'Onsdag', day_tag: null, accent: 'rose', sort_order: 0 },
      { id: 'd2', day_name: 'Torsdag', day_tag: null, accent: 'violet', sort_order: 1 },
    ]
    const entries = [
      { id: 'e1', day_id: 'd1', time_label: '18.12', title: 'Tåg', note: null, photo_url: null, photo_caption: null, sort_order: 0 },
      { id: 'e2', day_id: 'd2', time_label: '05.42', title: 'Ankomst', note: null, photo_url: null, photo_caption: null, sort_order: 0 },
    ]
    const from = vi.fn((table: string) => {
      if (table === 'schedule_days') {
        return { select: vi.fn(() => ({ order: vi.fn().mockResolvedValue({ data: days }) })) }
      }
      return { select: vi.fn(() => ({ order: vi.fn().mockResolvedValue({ data: entries }) })) }
    })
    const result = await db.getScheduleDays(client(from))
    expect(result).toEqual([
      { ...days[0], entries: [entries[0]] },
      { ...days[1], entries: [entries[1]] },
    ])
  })
})

describe('addDay', () => {
  it('inserts and returns the created row', async () => {
    const day = { id: 'd3', day_name: 'Ny dag', day_tag: null, accent: 'rose', sort_order: 5 }
    const single = vi.fn().mockResolvedValue({ data: day, error: null })
    const select = vi.fn(() => ({ single }))
    const insert = vi.fn(() => ({ select }))
    const result = await db.addDay(client(vi.fn(() => ({ insert }))), {
      day_name: 'Ny dag', day_tag: null, accent: 'rose', sort_order: 5,
    })
    expect(insert).toHaveBeenCalledWith({ day_name: 'Ny dag', day_tag: null, accent: 'rose', sort_order: 5 })
    expect(result).toEqual(day)
  })

  it('throws when Supabase returns an error', async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } })
    const insert = vi.fn(() => ({ select: vi.fn(() => ({ single })) }))
    await expect(
      db.addDay(client(vi.fn(() => ({ insert }))), { day_name: 'x', day_tag: null, accent: 'rose', sort_order: 0 })
    ).rejects.toEqual({ message: 'boom' })
  })
})

describe('updateDay', () => {
  it('updates by id', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null })
    const update = vi.fn(() => ({ eq }))
    await db.updateDay(client(vi.fn(() => ({ update }))), 'd1', { day_name: 'Ny titel' })
    expect(update).toHaveBeenCalledWith({ day_name: 'Ny titel' })
    expect(eq).toHaveBeenCalledWith('id', 'd1')
  })
})

describe('deleteDay', () => {
  it('deletes by id', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null })
    const del = vi.fn(() => ({ eq }))
    await db.deleteDay(client(vi.fn(() => ({ delete: del }))), 'd1')
    expect(eq).toHaveBeenCalledWith('id', 'd1')
  })
})

describe('addEntry', () => {
  it('inserts with null note/photo defaults and returns the created row', async () => {
    const entry = { id: 'e3', day_id: 'd1', time_label: '10.00', title: 'Ny punkt', note: null, photo_url: null, photo_caption: null, sort_order: 1 }
    const single = vi.fn().mockResolvedValue({ data: entry, error: null })
    const insert = vi.fn(() => ({ select: vi.fn(() => ({ single })) }))
    const result = await db.addEntry(client(vi.fn(() => ({ insert }))), {
      day_id: 'd1', time_label: '10.00', title: 'Ny punkt', sort_order: 1,
    })
    expect(insert).toHaveBeenCalledWith({
      day_id: 'd1', time_label: '10.00', title: 'Ny punkt', sort_order: 1,
      note: null, photo_url: null, photo_caption: null,
    })
    expect(result).toEqual(entry)
  })
})

describe('updateEntry', () => {
  it('updates by id', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null })
    const update = vi.fn(() => ({ eq }))
    await db.updateEntry(client(vi.fn(() => ({ update }))), 'e1', { title: 'Ny titel' })
    expect(update).toHaveBeenCalledWith({ title: 'Ny titel' })
    expect(eq).toHaveBeenCalledWith('id', 'e1')
  })
})

describe('deleteEntry', () => {
  it('deletes by id', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null })
    await db.deleteEntry(client(vi.fn(() => ({ delete: vi.fn(() => ({ eq })) }))), 'e1')
    expect(eq).toHaveBeenCalledWith('id', 'e1')
  })
})

describe('getPackingItems', () => {
  it('returns rows ordered by sort_order', async () => {
    const items = [{ id: 'p1', section: 'general', text: 'Dator', sort_order: 0 }]
    const from = vi.fn(() => ({ select: vi.fn(() => ({ order: vi.fn().mockResolvedValue({ data: items }) })) }))
    const result = await db.getPackingItems(client(from))
    expect(result).toEqual(items)
  })

  it('returns an empty array when there are no rows', async () => {
    const from = vi.fn(() => ({ select: vi.fn(() => ({ order: vi.fn().mockResolvedValue({ data: null }) })) }))
    const result = await db.getPackingItems(client(from))
    expect(result).toEqual([])
  })
})

describe('addPackingItem', () => {
  it('inserts and returns the created row', async () => {
    const item = { id: 'p1', section: 'general', text: 'Ny rad', sort_order: 3 }
    const single = vi.fn().mockResolvedValue({ data: item, error: null })
    const insert = vi.fn(() => ({ select: vi.fn(() => ({ single })) }))
    const result = await db.addPackingItem(client(vi.fn(() => ({ insert }))), {
      section: 'general', text: 'Ny rad', sort_order: 3,
    })
    expect(result).toEqual(item)
  })
})

describe('updatePackingItem', () => {
  it('updates text by id', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null })
    const update = vi.fn(() => ({ eq }))
    await db.updatePackingItem(client(vi.fn(() => ({ update }))), 'p1', 'Ny text')
    expect(update).toHaveBeenCalledWith({ text: 'Ny text' })
    expect(eq).toHaveBeenCalledWith('id', 'p1')
  })
})

describe('deletePackingItem', () => {
  it('deletes by id', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null })
    await db.deletePackingItem(client(vi.fn(() => ({ delete: vi.fn(() => ({ eq })) }))), 'p1')
    expect(eq).toHaveBeenCalledWith('id', 'p1')
  })
})
