import { afterEach, describe, expect, it } from 'vitest'
import { isAllowlistedOwner } from './ownerAllowlist'

describe('isAllowlistedOwner', () => {
  afterEach(() => {
    delete process.env.OWNER_MEMBERSHIP_IDS
    delete process.env.OWNER_USERNAMES
  })
  it('rejects look-alike Bungie names with another #code', () => {
    expect(isAllowlistedOwner('4611686018400000001', 'Bulletbait604#1111')).toBe(false)
    expect(isAllowlistedOwner('4611686018400000001', 'Bulletbait604')).toBe(false)
  })
  it('accepts exact full Bungie name and legacy username', () => {
    expect(isAllowlistedOwner('x', 'Bulletbait604#0950')).toBe(true)
    expect(isAllowlistedOwner('bulletbait604')).toBe(true)
  })
  it('uses membership ids only when configured', () => {
    process.env.OWNER_MEMBERSHIP_IDS = '4611686018400000042'
    expect(isAllowlistedOwner('bulletbait604', 'Bulletbait604#0950')).toBe(false)
    expect(isAllowlistedOwner('bulletbait604', undefined, '4611686018400000042')).toBe(true)
    expect(isAllowlistedOwner('4611686018400000042')).toBe(true)
  })
})
