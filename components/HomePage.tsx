'use client'

import { useState } from 'react'
import Hero from './Hero'
import Timeline from './Timeline'
import PackingList from './PackingList'
import Footer from './Footer'
import LockToggle from './LockToggle'
import EditableText from './EditableText'
import { updateContent } from '@/app/actions'
import type { SiteContent, DayWithEntries, PackingItem } from '@/lib/db'

type Props = {
  initialContent: SiteContent
  initialDays: DayWithEntries[]
  initialPacking: PackingItem[]
  initialEditMode: boolean
}

export default function HomePage({ initialContent, initialDays, initialPacking, initialEditMode }: Props) {
  const [editMode, setEditMode] = useState(initialEditMode)
  const [content, setContent] = useState(initialContent)
  const [days, setDays] = useState(initialDays)
  const [packing, setPacking] = useState(initialPacking)

  function saveField(key: string) {
    return async (value: string) => {
      setContent((c) => ({ ...c, [key]: value }))
      await updateContent(key, value)
    }
  }

  return (
    <>
      <Hero content={content} editMode={editMode} saveField={saveField} />
      <main className="wrap">
        <section className="intro">
          <EditableText
            as="p"
            className="intro-text"
            value={content.intro_text ?? ''}
            editMode={editMode}
            onSave={saveField('intro_text')}
            multiline
          />
        </section>
        <Timeline days={days} editMode={editMode} onChange={setDays} />
        <PackingList items={packing} editMode={editMode} onChange={setPacking} />
        <Footer content={content} editMode={editMode} saveField={saveField} />
      </main>
      <LockToggle editMode={editMode} onUnlock={() => setEditMode(true)} onLock={() => setEditMode(false)} />
    </>
  )
}
