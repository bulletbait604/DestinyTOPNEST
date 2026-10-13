import { describe, expect, it, beforeEach } from 'vitest'
import { decryptToken, encryptToken, isEncryptedToken, encryptTokenPair, decryptTokenPair } from './tokenCrypto'

describe('tokenCrypto', () => {
  beforeEach(() => {
    process.env.TOKEN_ENCRYPTION_KEY = 'test-key-123'
  })
  it('round-trips and hides plaintext', () => {
    const enc = encryptToken('secret-access-token')
    expect(isEncryptedToken(enc)).toBe(true)
    expect(enc).not.toContain('secret-access-token')
    expect(decryptToken(enc)).toBe('secret-access-token')
  })
  it('uses a random IV', () => {
    expect(encryptToken('a')).not.toBe(encryptToken('a'))
  })
  it('passes legacy plaintext through', () => {
    expect(decryptToken('legacy')).toBe('legacy')
  })
  it('is idempotent on encrypted input', () => {
    const enc = encryptToken('x')
    expect(encryptToken(enc)).toBe(enc)
  })
  it('rejects tampering', () => {
    const enc = encryptToken('value')
    const bad = enc.slice(0, -2) + (enc.endsWith('A') ? 'BB' : 'AA')
    expect(() => decryptToken(bad)).toThrow()
  })
  it('handles pairs', () => {
    const pair = encryptTokenPair({ accessToken: 'a', refreshToken: 'r', expiresIn: 1 })
    expect(decryptTokenPair(pair)).toEqual({ accessToken: 'a', refreshToken: 'r', expiresIn: 1 })
  })
})
