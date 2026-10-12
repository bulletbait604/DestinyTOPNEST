import { discordApplicationId, discordBotToken } from '@/discord/config'

/** Slash commands the interactions route answers. Type 3 is a Discord string option. */
export const DISCORD_SLASH_COMMANDS = [
  {
    name: 'passport',
    description: 'Fireteam Passport stamps and sherpa rank for a linked Guardian',
    options: [
      {
        name: 'guardian',
        description: 'Bungie display name',
        type: 3,
        required: true,
      },
    ],
  },
  {
    name: 'clan',
    description: 'Clan Wars division and season standing',
    options: [
      {
        name: 'clan',
        description: 'Clan name. Omit for the current leader.',
        type: 3,
        required: false,
      },
    ],
  },
  {
    name: 'lfg',
    description: 'Open fireteams posted on Top Nest',
  },
] as const

export interface DiscordRegisterResult {
  registered: boolean
  reason?: string
}

/**
 * Upsert global slash commands. Missing token or application id is a no-op.
 * Discord errors are returned instead of thrown.
 */
export async function registerDiscordCommands(fetchImpl: typeof fetch = fetch): Promise<DiscordRegisterResult> {
  const token = discordBotToken()
  const applicationId = discordApplicationId()
  if (!token || !applicationId) {
    return {
      registered: false,
      reason: 'Slash-command registration is idle. Set DISCORD_BOT_TOKEN and DISCORD_APPLICATION_ID.',
    }
  }
  if (!/^\d{5,32}$/.test(applicationId)) {
    return { registered: false, reason: 'DISCORD_APPLICATION_ID must be a numeric application id.' }
  }

  try {
    const response = await fetchImpl(`https://discord.com/api/v10/applications/${applicationId}/commands`, {
      method: 'PUT',
      headers: {
        Authorization: `Bot ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(DISCORD_SLASH_COMMANDS),
    })
    if (response.status === 429) {
      return { registered: false, reason: 'Discord rate limited command registration. Try again later.' }
    }
    if (!response.ok) return { registered: false, reason: `Discord HTTP ${response.status}` }
    return { registered: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Discord request failed'
    return { registered: false, reason: message }
  }
}
