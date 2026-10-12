/** Discord bot settings. Every value is optional; missing values keep the bot idle. */

export function discordBotToken(): string | undefined {
  const token = process.env.DISCORD_BOT_TOKEN?.trim()
  return token || undefined
}

export function discordPublicKey(): string | undefined {
  const key = process.env.DISCORD_PUBLIC_KEY?.trim()
  return key || undefined
}

export function discordApplicationId(): string | undefined {
  const id = process.env.DISCORD_APPLICATION_ID?.trim()
  return id || undefined
}

export function discordAnnounceChannelId(): string | undefined {
  const id = process.env.DISCORD_ANNOUNCE_CHANNEL_ID?.trim()
  return id || undefined
}

export function discordBotEnabled(): boolean {
  return Boolean(discordBotToken())
}

export interface DiscordBotStatus {
  enabled: boolean
  interactions: boolean
  announcements: boolean
  reason?: string
}

export function discordBotStatus(): DiscordBotStatus {
  const enabled = discordBotEnabled()
  if (!enabled) {
    return {
      enabled: false,
      interactions: false,
      announcements: false,
      reason: 'DISCORD_BOT_TOKEN is not set. The Discord bot is idle.',
    }
  }
  return {
    enabled: true,
    interactions: Boolean(discordPublicKey()),
    announcements: Boolean(discordAnnounceChannelId()),
    reason: discordPublicKey()
      ? undefined
      : 'Set DISCORD_PUBLIC_KEY to verify slash-command requests.',
  }
}
