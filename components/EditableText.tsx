'use client'

import { useEffect, useRef, useState } from 'react'

type Props = {
  value: string
  editMode: boolean
  onSave: (value: string) => void | Promise<void>
  as?: 'span' | 'p' | 'h1' | 'h2'
  className?: string
  placeholder?: string
  multiline?: boolean
}

export default function EditableText({
  value,
  editMode,
  onSave,
  as: Tag = 'span',
  className,
  placeholder,
  multiline = false,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [prevValue, setPrevValue] = useState(value)
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null)

  if (value !== prevValue) {
    setPrevValue(value)
    setDraft(value)
  }

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  if (!editMode) {
    return <Tag className={className}>{value || placeholder}</Tag>
  }

  if (!editing) {
    return (
      <Tag
        className={`${className ?? ''} editable`.trim()}
        role="button"
        tabIndex={0}
        onClick={() => setEditing(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') setEditing(true)
        }}
      >
        {value || placeholder}
      </Tag>
    )
  }

  async function commit() {
    setEditing(false)
    if (draft !== value) await onSave(draft)
  }

  return multiline ? (
    <textarea
      ref={inputRef as React.RefObject<HTMLTextAreaElement>}
      className={`${className ?? ''} editable-input`.trim()}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      rows={3}
    />
  ) : (
    <input
      ref={inputRef as React.RefObject<HTMLInputElement>}
      className={`${className ?? ''} editable-input`.trim()}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit()
      }}
    />
  )
}
