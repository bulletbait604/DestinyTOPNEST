import { generateKeyPairSync, sign } from 'crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { postDiscordChannelMessage } from '@/discord/announce'
import { authorizeDiscordCron } from '@/discord/guard'
import { renderAnnouncement, renderClanCommand, renderLfgCommand, renderPassportCommand } from '@/discord/commands'
import { discordBotStatus } from '@/discord/config'
import { respondToDiscordInteraction } from '@/discord/interactions'
import { registerDiscordCommands } from '@/discord/register'
import { verifyDiscordSignature } from '@/discord/verify'
import type { ClanWarStanding, FireteamLobby, PassportProfile } from '@/lib/destiny/types'

const originalFetch = globalThis.fetch
const originalEnv = { ...process.env }

afterEach(() => {
  globalThis.fetch = originalFetch
  for (const key of ['DISCORD_BOT_TOKEN', 'DISCORD_PUBLIC_KEY', 'DISCORD_APPLICATION_ID', 'DISCORD_ANNOUNCE_CHANNEL_ID', 'CRON_SECRET']) {
    if (originalEnv[key] === undefined) delete process.env[key]
    else process.env[key] = originalEnv[key]
  }
})

function ed25519() {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519')
  const der = publicKey.export({ format: 'der', type: 'spki' })
  const raw = Buffer.from(der).subarray(Buffer.from(der).length - 32)
  return { publicKeyHex: raw.toString('hex'), privateKey }
}

describe('discord signature', () => {
  it('accepts a real ed25519 signature and rejects a tampered body', () => {
    const { publicKeyHex, privateKey } = ed25519()
    const timestamp = '1700000000'
    const body = JSON.stringify({ type: 1 })
    const signature = sign(null, Buffer.from(timestamp + body), privateKey).toString('hex')

    expect(verifyDiscordSignature(publicKeyHex, signature, timestamp, body)).toBe(true)
    expect(verifyDiscordSignature(publicKeyHex, signature, timestamp, `${body} `)).toBe(false)
    expect(verifyDiscordSignature('zz', signature, timestamp, body)).toBe(false)
  })
})

describe('discord commands', () => {
  it('renders passport, clan, lfg, and announcements without cash language', () => {
    const passport: PassportProfile = {
      clearStamps: 2,
      newGuardianStamps: 1,
      repeatTeammateCredit: 0.25,
      totalStamps: 3.25,
      distinctTeammates: 4,
      displayTitle: 'Stamped Guardian',
      titles: [],
      activities: [],
      recentStamps: [],
    }
    const standing: ClanWarStanding = {
      clanId: 'clan-a',
      clanName: 'Nest',
      weeklyPoints: 4,
      seasonPoints: 12,
      verifiedClears: 3,
      recruitBonuses: 1,
      division: 'Ash',
      rank: 1,
    }
    const lobby = {
      id: 'l1',
      hostUserId: 'u',
      hostDisplayName: 'Ada',
      activityType: 'raid',
      activityName: 'Vault of Glass',
      goal: 'teaching_run',
      tags: [],
      platform: 'crossplay',
      micRequired: false,
      scoringEligible: true,
      maxPlayers: 6,
      currentPlayers: 3,
      status: 'open',
      createdAt: '2026-10-11T18:00:00.000Z',
    } as FireteamLobby

    const passportText = renderPassportCommand({ displayName: 'Ada', passport })
    const clanText = renderClanCommand({ standing, weekLabel: 'Oct 6 – Oct 12' })
    const lfgText = renderLfgCommand([lobby])
    const announcement = renderAnnouncement({
      weekLabel: 'Oct 6 – Oct 12',
      contractLines: ['Help a first-timer (+20 tier pts)'],
      lfgLines: ['Vault of Glass · Ada · 3/6'],
      topClan: standing,
    })

    expect(passportText).toContain('Stamped Guardian')
    expect(passportText).toContain('no cash prizes')
    expect(clanText).toContain('Ash')
    expect(clanText).toContain('not prizes')
    expect(lfgText).toContain('teaching run')
    expect(announcement).toContain('Clan Wars')
    expect(announcement).toContain('badges, titles, frames')
  })

  it('says the bot is idle when the token is missing', () => {
    delete process.env.DISCORD_BOT_TOKEN
    expect(discordBotStatus()).toMatchObject({ enabled: false, interactions: false, announcements: false })
  })
})

describe('discord delivery', () => {
  it('does not call Discord when the token or channel is missing', async () => {
    delete process.env.DISCORD_BOT_TOKEN
    delete process.env.DISCORD_ANNOUNCE_CHANNEL_ID
    const fetchImpl = vi.fn() as unknown as typeof fetch
    const result = await postDiscordChannelMessage('hello', fetchImpl)
    expect(result.posted).toBe(false)
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('reports a Discord 429 without throwing', async () => {
    process.env.DISCORD_BOT_TOKEN = 'token'
    process.env.DISCORD_ANNOUNCE_CHANNEL_ID = '123'
    const fetchImpl = vi.fn(async () => new Response('', { status: 429 })) as unknown as typeof fetch
    const result = await postDiscordChannelMessage('hello', fetchImpl)
    expect(result.posted).toBe(false)
    expect(result.reason).toMatch(/rate limited/i)
  })

  it('registers slash commands only when token and application id are set', async () => {
    delete process.env.DISCORD_BOT_TOKEN
    delete process.env.DISCORD_APPLICATION_ID
    const idleFetch = vi.fn() as unknown as typeof fetch
    const idle = await registerDiscordCommands(idleFetch)
    expect(idle.registered).toBe(false)
    expect(idleFetch).not.toHaveBeenCalled()

    process.env.DISCORD_BOT_TOKEN = 'token'
    process.env.DISCORD_APPLICATION_ID = '1234567890'
    const fetchImpl = vi.fn(async () => new Response('[]', { status: 200 })) as unknown as typeof fetch
    const registered = await registerDiscordCommands(fetchImpl)
    expect(registered.registered).toBe(true)
    expect(fetchImpl).toHaveBeenCalledOnce()
  })

  it('keeps announce and registration idle without a token, and closed until CRON_SECRET is set', () => {
    delete process.env.DISCORD_BOT_TOKEN
    delete process.env.CRON_SECRET
    expect(authorizeDiscordCron(null)).toMatchObject({ ok: false, status: 200 })

    process.env.DISCORD_BOT_TOKEN = 'token'
    expect(authorizeDiscordCron(null)).toMatchObject({ ok: false, status: 503 })

    process.env.CRON_SECRET = 'cron'
    expect(authorizeDiscordCron('Bearer wrong').status).toBe(401)
    expect(authorizeDiscordCron('Bearer cron')).toEqual({ ok: true, status: 200 })
  })

  it('answers a signed ping and rejects a bad signature', async () => {
    const { publicKeyHex, privateKey } = ed25519()
    const body = JSON.stringify({ type: 1 })
    const timestamp = '1700000000'
    const signature = sign(null, Buffer.from(timestamp + body), privateKey).toString('hex')
    const context = {
      passport: async () => 'passport',
      clan: async () => 'clan',
      lfg: async () => 'lfg',
    }

    const ping = await respondToDiscordInteraction(body, signature, timestamp, context, publicKeyHex)
    expect(ping).toEqual({ status: 200, body: { type: 1 } })

    const rejected = await respondToDiscordInteraction(body, 'aa', timestamp, context, publicKeyHex)
    expect(rejected.status).toBe(401)

    const idle = await respondToDiscordInteraction(body, signature, timestamp, context, '')
    expect(idle.status).toBe(503)
  })
})
