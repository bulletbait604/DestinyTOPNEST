import { discordPublicKey } from '@/discord/config'
import { verifyDiscordSignature } from '@/discord/verify'

export interface DiscordCommandContext {
  passport: (bungieName?: string) => Promise<string>
  clan: (clanName?: string) => Promise<string>
  lfg: () => Promise<string>
}

interface DiscordOption {
  name?: string
  value?: string
}

interface DiscordInteraction {
  type?: number
  data?: {
    name?: string
    options?: DiscordOption[]
  }
}

function optionValue(interaction: DiscordInteraction, name: string): string | undefined {
  const match = interaction.data?.options?.find((option) => option.name === name)
  return typeof match?.value === 'string' ? match.value : undefined
}

/**
 * Discord interaction HTTP handler. Missing public key or a bad signature
 * does not throw. Commands answer in chat text.
 */
export async function respondToDiscordInteraction(
  rawBody: string,
  signature: string | null,
  timestamp: string | null,
  context: DiscordCommandContext,
  publicKey = discordPublicKey()
): Promise<{ status: number; body: unknown }> {
  if (!publicKey) {
    return {
      status: 503,
      body: { error: 'Discord interactions are idle. Set DISCORD_PUBLIC_KEY and DISCORD_BOT_TOKEN.' },
    }
  }
  if (!signature || !timestamp || !verifyDiscordSignature(publicKey, signature, timestamp, rawBody)) {
    return { status: 401, body: { error: 'Invalid Discord signature.' } }
  }

  let interaction: DiscordInteraction
  try {
    interaction = JSON.parse(rawBody) as DiscordInteraction
  } catch {
    return { status: 400, body: { error: 'Invalid Discord interaction body.' } }
  }

  if (interaction.type === 1) return { status: 200, body: { type: 1 } }

  if (interaction.type !== 2) {
    return { status: 200, body: { type: 4, data: { content: 'Unsupported interaction.', flags: 64 } } }
  }

  const name = interaction.data?.name
  try {
    let content = 'Unknown command. Try /passport, /clan, or /lfg.'
    if (name === 'passport') content = await context.passport(optionValue(interaction, 'guardian'))
    else if (name === 'clan') content = await context.clan(optionValue(interaction, 'clan'))
    else if (name === 'lfg') content = await context.lfg()
    return { status: 200, body: { type: 4, data: { content } } }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Command failed'
    return {
      status: 200,
      body: { type: 4, data: { content: `Fireteam HQ could not answer that command. ${message}`, flags: 64 } },
    }
  }
}
