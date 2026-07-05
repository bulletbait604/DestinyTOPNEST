import { createSignedBungieOAuthState } from '@/lib/destiny/bungieOAuthStateCookie'
import { createBungieOAuthState as persistBungieOAuthState } from '@/lib/destiny/bungieOAuthStateStore'

/** Create OAuth state for Bungie authorize URL (signed cookie; Mongo optional). */
export async function createBungieOAuthState(input: {
  userId: string
  redirectUri: string
  returnPath: string
}): Promise<string> {
  const state = createSignedBungieOAuthState(input)

  try {
    await persistBungieOAuthState({ ...input, stateOverride: state })
  } catch (error) {
    console.warn('[bungieOAuth] Mongo state persist failed (signed cookie still valid):', error)
  }

  return state
}

export { consumeBungieOAuthState } from '@/lib/destiny/bungieOAuthStateStore'
