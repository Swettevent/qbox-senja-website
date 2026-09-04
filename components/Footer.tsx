'use client'

import Image from 'next/image'
import EditableText from './EditableText'
import type { SiteContent } from '@/lib/db'

type Props = {
  content: SiteContent
  editMode: boolean
  saveField: (key: string) => (value: string) => Promise<void>
}

export default function Footer({ content, editMode, saveField }: Props) {
  return (
    <footer>
      <Image src="/logo.png" alt="qbox" width={90} height={20} />
      <p>
        <EditableText value={content.footer_text ?? ''} editMode={editMode} onSave={saveField('footer_text')} />
      </p>
    </footer>
  )
}
