import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'

/** AES-256-GCM encryption for OAuth tokens stored at rest in MongoDB. */
const PREFIX = 'enc:v1:'

function key(): Buffer | null {
  const raw = (process.env.TOKEN_ENCRYPTION_KEY || process.env.SESSION_SECRET || process.env.JWT_SECRET || '').trim()
  if (!raw) return null
  return createHash('sha256').update(`topnest-token-key:${raw}`).digest()
}

export function isEncryptedToken(value: string | undefined | null): boolean {
  return typeof value === 'string' && value.startsWith(PREFIX)
}

export function encryptToken(value: string): string {
  if (!value || isEncryptedToken(value)) return value
  const k = key()
  if (!k) throw new Error('TOKEN_ENCRYPTION_KEY or SESSION_SECRET is required to store OAuth tokens')
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', k, iv)
  const data = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return PREFIX + Buffer.concat([iv, tag, data]).toString('base64url')
}

/** Decrypts an encrypted token; legacy plaintext values pass through unchanged. */
export function decryptToken(value: string): string {
  if (!isEncryptedToken(value)) return value
  const k = key()
  if (!k) throw new Error('TOKEN_ENCRYPTION_KEY or SESSION_SECRET is required to read OAuth tokens')
  const buf = Buffer.from(value.slice(PREFIX.length), 'base64url')
  const decipher = createDecipheriv('aes-256-gcm', k, buf.subarray(0, 12))
  decipher.setAuthTag(buf.subarray(12, 28))
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString('utf8')
}

export interface TokenPair {
  accessToken: string
  refreshToken?: string
}

export function encryptTokenPair<T extends TokenPair>(tokens: T): T {
  return {
    ...tokens,
    accessToken: encryptToken(tokens.accessToken),
    refreshToken: tokens.refreshToken ? encryptToken(tokens.refreshToken) : tokens.refreshToken,
  }
}

export function decryptTokenPair<T extends TokenPair>(tokens: T): T {
  return {
    ...tokens,
    accessToken: decryptToken(tokens.accessToken),
    refreshToken: tokens.refreshToken ? decryptToken(tokens.refreshToken) : tokens.refreshToken,
  }
}
