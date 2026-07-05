import crypto from 'crypto'
import { getSessionSecret } from '@/lib/auth/sessionJwt'

export interface BungieOAuthStatePayload {
  userId: string
  redirectUri: string
  returnPath: string
  exp: number
  nonce: string
}

function base64urlEncode(buf: Buffer): string {
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function base64urlDecode(input: string): Buffer {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/')
  const padLen = (4 - (padded.length % 4)) % 4
  return Buffer.from(padded + '='.repeat(padLen), 'base64')
}

/** Signed OAuth state — works without MongoDB (serverless-safe). */
export function createSignedBungieOAuthState(input: {
  userId: string
  redirectUri: string
  returnPath: string
}): string {
  const secret = getSessionSecret()
  if (!secret) {
    throw new Error('SESSION_SECRET is not configured')
  }

  const payload: BungieOAuthStatePayload = {
    userId: input.userId.toLowerCase(),
    redirectUri: input.redirectUri,
    returnPath: input.returnPath,
    exp: Date.now() + 10 * 60 * 1000,
    nonce: crypto.randomBytes(12).toString('hex'),
  }

  const data = base64urlEncode(Buffer.from(JSON.stringify(payload), 'utf8'))
  const sig = base64urlEncode(crypto.createHmac('sha256', secret).update(data).digest())
  return `${data}.${sig}`
}

export function verifySignedBungieOAuthState(token: string): BungieOAuthStatePayload | null {
  const secret = getSessionSecret()
  if (!secret) return null

  const parts = token.split('.')
  if (parts.length !== 2) return null

  const [data, sig] = parts
  const expected = base64urlEncode(crypto.createHmac('sha256', secret).update(data).digest())
  if (expected !== sig) return null

  try {
    const payload = JSON.parse(base64urlDecode(data).toString('utf8')) as BungieOAuthStatePayload
    if (!payload?.userId || !payload.redirectUri || !payload.returnPath || !payload.exp) {
      return null
    }
    if (Date.now() > payload.exp) return null
    return payload
  } catch {
    return null
  }
}
