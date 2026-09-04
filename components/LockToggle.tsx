'use client'

import { useState } from 'react'
import { unlockEditMode, lockEditMode } from '@/app/actions'

type Props = {
  editMode: boolean
  onUnlock: () => void
  onLock: () => void
}

export default function LockToggle({ editMode, onUnlock, onLock }: Props) {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await unlockEditMode(password)
    setLoading(false)
    if (!result.ok) {
      setError('Fel lösenord')
      return
    }
    setPassword('')
    setOpen(false)
    onUnlock()
  }

  async function handleLock() {
    await lockEditMode()
    onLock()
  }

  if (editMode) {
    return (
      <button type="button" className="lock-toggle--active" onClick={handleLock}>
        Avsluta redigering
      </button>
    )
  }

  return (
    <div className="lock-toggle-wrap">
      <button
        type="button"
        className="lock-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-label="Redigera sidan"
      >
        🔒
      </button>
      {open && (
        <form className="lock-prompt" onSubmit={submit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Lösenord"
            autoFocus
          />
          {error && <p className="lock-error">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? 'Kollar…' : 'Lås upp'}
          </button>
        </form>
      )}
    </div>
  )
}
