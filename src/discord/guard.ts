import { discordBotEnabled } from '@/discord/config'
import { cronSecret } from '@/lib/destiny/env'

export interface DiscordCronDecision {
  ok: boolean
  status: number
  reason?: string
}

/**
 * Announce and command registration stay idle without a bot token.
 * Once the token is set, CRON_SECRET is required so those routes are not public.
 * Slash-command interactions are not covered here; Discord signs those requests.
 */
export function authorizeDiscordCron(authorization: string | null): DiscordCronDecision {
  if (!discordBotEnabled()) {
    return {
      ok: false,
      status: 200,
      reason: 'The Discord bot is idle.',
    }
  }
  const secret = cronSecret()
  if (!secret) {
    return {
      ok: false,
      status: 503,
      reason: 'The Discord bot is not ready to post yet.',
    }
  }
  if (authorization !== `Bearer ${secret}`) {
    return { ok: false, status: 401, reason: 'Unauthorized' }
  }
  return { ok: true, status: 200 }
}
