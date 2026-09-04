import { describe, it, expect } from 'vitest'
import { checkPassword, signSession, verifySession } from '@/lib/auth'

describe('checkPassword', () => {
  it('returns true for matching passwords', () => {
    expect(checkPassword('Kristoffer123', 'Kristoffer123')).toBe(true)
  })
  it('returns false for a wrong password', () => {
    expect(checkPassword('wrong', 'Kristoffer123')).toBe(false)
  })
  it('returns false when lengths differ', () => {
    expect(checkPassword('short', 'muchlongerpassword')).toBe(false)
  })
})

describe('signSession / verifySession', () => {
  const secret = 'test-secret'

  it('verifies a freshly signed, non-expired token', () => {
    const token = signSession(secret, Date.now() + 10_000)
    expect(verifySession(secret, token)).toBe(true)
  })

  it('rejects an expired token', () => {
    const token = signSession(secret, Date.now() - 1000)
    expect(verifySession(secret, token)).toBe(false)
  })

  it('rejects a tampered token', () => {
    const token = signSession(secret, Date.now() + 10_000)
    const tampered = token.slice(0, -1) + (token.endsWith('a') ? 'b' : 'a')
    expect(verifySession(secret, tampered)).toBe(false)
  })

  it('rejects a token signed with a different secret', () => {
    const token = signSession('other-secret', Date.now() + 10_000)
    expect(verifySession(secret, token)).toBe(false)
  })

  it('rejects an undefined token', () => {
    expect(verifySession(secret, undefined)).toBe(false)
  })

  it('rejects a malformed token', () => {
    expect(verifySession(secret, 'not-a-real-token')).toBe(false)
  })
})
