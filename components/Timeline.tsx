'use client'

import { Fragment } from 'react'
import Image from 'next/image'
import EditableText from './EditableText'
import type { DayWithEntries } from '@/lib/db'
import {
  addScheduleDay,
  updateScheduleDay,
  deleteScheduleDay,
  addScheduleEntry,
  updateScheduleEntry,
  deleteScheduleEntry,
} from '@/app/actions'

type Props = {
  days: DayWithEntries[]
  editMode: boolean
  onChange: (days: DayWithEntries[]) => void
}

const ACCENTS = ['rose', 'violet', 'teal'] as const

export default function Timeline({ days, editMode, onChange }: Props) {
  async function handleAddDay() {
    const sortOrder = days.length ? Math.max(...days.map((d) => d.sort_order)) + 1 : 0
    const accent = ACCENTS[days.length % ACCENTS.length]
    const day = await addScheduleDay({ day_name: 'Ny dag', accent, sort_order: sortOrder })
    onChange([...days, { ...day, entries: [] }])
  }

  async function handleUpdateDayName(dayId: string, value: string) {
    onChange(days.map((d) => (d.id === dayId ? { ...d, day_name: value } : d)))
    await updateScheduleDay(dayId, { day_name: value })
  }

  async function handleDeleteDay(dayId: string) {
    if (!confirm('Ta bort hela dagen?')) return
    onChange(days.filter((d) => d.id !== dayId))
    await deleteScheduleDay(dayId)
  }

  async function handleAddEntry(dayId: string) {
    const day = days.find((d) => d.id === dayId)
    if (!day) return
    const sortOrder = day.entries.length ? Math.max(...day.entries.map((e) => e.sort_order)) + 1 : 0
    const entry = await addScheduleEntry({ day_id: dayId, time_label: '00.00', title: 'Ny punkt', sort_order: sortOrder })
    onChange(days.map((d) => (d.id === dayId ? { ...d, entries: [...d.entries, entry] } : d)))
  }

  async function handleUpdateEntry(
    dayId: string,
    entryId: string,
    patch: { time_label?: string; title?: string; note?: string | null; photo_caption?: string | null }
  ) {
    onChange(
      days.map((d) =>
        d.id === dayId
          ? { ...d, entries: d.entries.map((e) => (e.id === entryId ? { ...e, ...patch } : e)) }
          : d
      )
    )
    await updateScheduleEntry(entryId, patch)
  }

  async function handleDeleteEntry(dayId: string, entryId: string) {
    if (!confirm('Ta bort punkten?')) return
    onChange(days.map((d) => (d.id === dayId ? { ...d, entries: d.entries.filter((e) => e.id !== entryId) } : d)))
    await deleteScheduleEntry(entryId)
  }

  return (
    <section className="timeline">
      {days.map((day) => (
        <article key={day.id} className="day" style={{ ['--accent' as string]: `var(--${day.accent})` }}>
          <div className="day-head">
            <h2 className="day-name">
              <EditableText
                value={day.day_name}
                editMode={editMode}
                onSave={(v) => handleUpdateDayName(day.id, v)}
              />
            </h2>
            <div className="day-head-right">
              {day.day_tag && <span className="day-tag">{day.day_tag}</span>}
              {editMode && (
                <button type="button" className="remove-btn" onClick={() => handleDeleteDay(day.id)} aria-label="Ta bort dag">
                  🗑
                </button>
              )}
            </div>
          </div>
          <div className="entries">
            {day.entries.map((entry) => (
              <Fragment key={entry.id}>
                <div className={`entry${editMode ? ' entry--editable' : ''}`}>
                  <div className="entry-time">
                    <EditableText
                      value={entry.time_label}
                      editMode={editMode}
                      onSave={(v) => handleUpdateEntry(day.id, entry.id, { time_label: v })}
                    />
                  </div>
                  <div className="entry-body">
                    <p className="entry-title">
                      <EditableText
                        value={entry.title}
                        editMode={editMode}
                        onSave={(v) => handleUpdateEntry(day.id, entry.id, { title: v })}
                      />
                    </p>
                    {(entry.note || editMode) && (
                      <p className="entry-note">
                        <EditableText
                          value={entry.note ?? ''}
                          editMode={editMode}
                          onSave={(v) => handleUpdateEntry(day.id, entry.id, { note: v })}
                          placeholder="Lägg till anteckning…"
                          multiline
                        />
                      </p>
                    )}
                  </div>
                  {editMode && (
                    <button
                      type="button"
                      className="remove-btn remove-btn--entry"
                      onClick={() => handleDeleteEntry(day.id, entry.id)}
                      aria-label="Ta bort punkt"
                    >
                      🗑
                    </button>
                  )}
                </div>
                {entry.photo_url && (
                  <>
                    <div className="photo-break">
                      <Image src={entry.photo_url} alt={entry.photo_caption ?? ''} width={1400} height={950} />
                    </div>
                    <p className="photo-caption">
                      <EditableText
                        value={entry.photo_caption ?? ''}
                        editMode={editMode}
                        onSave={(v) => handleUpdateEntry(day.id, entry.id, { photo_caption: v })}
                      />
                    </p>
                  </>
                )}
              </Fragment>
            ))}
          </div>
          {editMode && (
            <button type="button" className="add-btn" onClick={() => handleAddEntry(day.id)}>
              + Lägg till punkt
            </button>
          )}
        </article>
      ))}
      {editMode && (
        <button type="button" className="add-btn add-btn--day" onClick={handleAddDay}>
          + Lägg till dag
        </button>
      )}
    </section>
  )
}
