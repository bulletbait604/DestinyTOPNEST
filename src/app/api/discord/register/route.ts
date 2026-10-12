import { NextRequest, NextResponse } from 'next/server'
import { discordBotStatus } from '@/discord/config'
import { authorizeDiscordCron } from '@/discord/guard'
import { registerDiscordCommands } from '@/discord/register'

export const dynamic = 'force-dynamic'

/** Reports whether the bot can register commands. Does not call Discord. */
export async function GET() {
  const status = discordBotStatus()
  return NextResponse.json({
    ...status,
    registration: Boolean(process.env.DISCORD_APPLICATION_ID?.trim()),
  })
}

/**
 * Register /passport, /clan, and /lfg with Discord.
 * Idle when DISCORD_BOT_TOKEN is unset.
 * Once the token is set, callers must send Authorization: Bearer <CRON_SECRET>.
 */
export async function POST(req: NextRequest) {
  const gate = authorizeDiscordCron(req.headers.get('authorization'))
  if (!gate.ok) {
    return NextResponse.json(
      { ok: gate.status === 200, registered: false, error: gate.status === 401 ? gate.reason : undefined, reason: gate.reason },
      { status: gate.status }
    )
  }

  const result = await registerDiscordCommands()
  return NextResponse.json({ ok: true, ...result })
}
