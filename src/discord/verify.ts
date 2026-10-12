import { createPublicKey, verify as cryptoVerify } from 'crypto'

const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex')

/** Verify a Discord interaction signature. Returns false for malformed keys instead of throwing. */
export function verifyDiscordSignature(
  publicKeyHex: string,
  signatureHex: string,
  timestamp: string,
  rawBody: string
): boolean {
  try {
    if (!/^[0-9a-fA-F]{64}$/.test(publicKeyHex) || !/^[0-9a-fA-F]+$/.test(signatureHex)) return false
    const key = createPublicKey({
      key: Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(publicKeyHex, 'hex')]),
      format: 'der',
      type: 'spki',
    })
    return cryptoVerify(null, Buffer.from(timestamp + rawBody), key, Buffer.from(signatureHex, 'hex'))
  } catch {
    return false
  }
}
