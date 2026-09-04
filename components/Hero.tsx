'use client'

import Image from 'next/image'
import EditableText from './EditableText'
import type { SiteContent } from '@/lib/db'

type Props = {
  content: SiteContent
  editMode: boolean
  saveField: (key: string) => (value: string) => Promise<void>
}

export default function Hero({ content, editMode, saveField }: Props) {
  const route = (content.hero_route ?? '')
    .split('·')
    .map((s) => s.trim())
    .filter(Boolean)

  return (
    <header className="hero">
      <div className="hero-inner">
        <Image className="logo" src="/logo.png" alt="qbox" width={120} height={34} />
        <EditableText
          as="p"
          className="hero-eyebrow"
          value={content.hero_eyebrow ?? ''}
          editMode={editMode}
          onSave={saveField('hero_eyebrow')}
        />
        <EditableText
          as="h1"
          className="hero-title"
          value={content.hero_title ?? ''}
          editMode={editMode}
          onSave={saveField('hero_title')}
        />
        <EditableText
          as="p"
          className="hero-dates"
          value={content.hero_dates ?? ''}
          editMode={editMode}
          onSave={saveField('hero_dates')}
        />
        {editMode ? (
          <EditableText
            as="p"
            className="hero-route"
            value={content.hero_route ?? ''}
            editMode={editMode}
            onSave={saveField('hero_route')}
          />
        ) : (
          <div className="hero-route">
            {route.map((stop, i) => (
              <span key={i} className="hero-route-stop">
                {i > 0 && <span className="dot" />}
                {stop}
              </span>
            ))}
          </div>
        )}
      </div>
    </header>
  )
}
