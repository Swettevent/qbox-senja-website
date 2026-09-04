'use client'

import EditableText from './EditableText'
import type { PackingItem } from '@/lib/db'
import { addPackingListItem, updatePackingListItem, deletePackingListItem } from '@/app/actions'

type Props = {
  items: PackingItem[]
  editMode: boolean
  onChange: (items: PackingItem[]) => void
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path className="stroke" d="M2 8.5L6 12.5L14 3.5" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function PackingList({ items, editMode, onChange }: Props) {
  const general = items.filter((i) => i.section === 'general')
  const activities = items.filter((i) => i.section === 'activities')

  async function handleAdd(section: 'general' | 'activities') {
    const group = section === 'general' ? general : activities
    const sortOrder = group.length ? Math.max(...group.map((i) => i.sort_order)) + 1 : 0
    const item = await addPackingListItem({ section, text: 'Ny rad', sort_order: sortOrder })
    onChange([...items, item])
  }

  async function handleUpdate(id: string, text: string) {
    onChange(items.map((i) => (i.id === id ? { ...i, text } : i)))
    await updatePackingListItem(id, text)
  }

  async function handleDelete(id: string) {
    if (!confirm('Ta bort raden?')) return
    onChange(items.filter((i) => i.id !== id))
    await deletePackingListItem(id)
  }

  function renderGroup(group: PackingItem[]) {
    return (
      <div className="packing-list">
        {group.map((item) => (
          <div key={item.id} className={`packing-item${editMode ? ' packing-item--editable' : ''}`}>
            <CheckIcon />
            <EditableText value={item.text} editMode={editMode} onSave={(v) => handleUpdate(item.id, v)} multiline />
            {editMode && (
              <button type="button" className="remove-btn" onClick={() => handleDelete(item.id)} aria-label="Ta bort rad">
                🗑
              </button>
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <section className="packing">
      <h2>Packlista</h2>
      {renderGroup(general)}
      {editMode && (
        <button type="button" className="add-btn" onClick={() => handleAdd('general')}>
          + Lägg till rad
        </button>
      )}
      <div className="packing-sub">
        <p className="packing-sub-title">Till aktiviteterna</p>
        {renderGroup(activities)}
        {editMode && (
          <button type="button" className="add-btn" onClick={() => handleAdd('activities')}>
            + Lägg till rad
          </button>
        )}
      </div>
    </section>
  )
}
