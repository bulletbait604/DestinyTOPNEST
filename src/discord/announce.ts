import { discordAnnounceChannelId, discordBotToken } from '@/discord/config'

export interface DiscordPostResult {
  posted: boolean
  reason?: string
}

/**
 * Post a channel message when the bot token and announce channel are set.
 * Missing config or Discord errors return a result instead of throwing.
 */
export async function postDiscordChannelMessage(
  content: string,
  fetchImpl: typeof fetch = fetch
): Promise<DiscordPostResult> {
  const token = discordBotToken()
  const channelId = discordAnnounceChannelId()
  if (!token || !channelId) {
    return {
      posted: false,
      reason: 'Discord announcements are idle. Set DISCORD_BOT_TOKEN and DISCORD_ANNOUNCE_CHANNEL_ID.',
    }
  }
  if (!content.trim()) return { posted: false, reason: 'Nothing to announce.' }

  try {
    const response = await fetchImpl(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    })
    if (response.status === 429) {
      return { posted: false, reason: 'Discord rate limited the bot. Try again after the reset window.' }
    }
    if (!response.ok) return { posted: false, reason: `Discord HTTP ${response.status}` }
    return { posted: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Discord request failed'
    return { posted: false, reason: message }
  }
}
