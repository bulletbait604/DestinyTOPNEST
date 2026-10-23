import { describe, expect, it } from 'vitest'
import { formatAskContext } from '@/lib/ask/askContext'
import { buildAskPrompt } from '@/lib/ask/askPrompt'
import { resetAskRateLimits, takeAskRateLimit } from '@/lib/ask/askRateLimit'
import { retrieveTrustedSources } from '@/lib/ask/askRetrieve'
import {
  UNCONFIGURED_MESSAGE,
  askCacheKey,
  askGatewayConfigured,
  hostAllowed,
  normalizeQuestion,
  parseFandomSearch,
  parseHtmlLinks,
  parseRedditSearch,
} from '@/lib/ask/askSources'
import { createAskStream, parseAskEvents } from '@/lib/ask/askStream'

describe('ask question rules', () => {
  it('rejects a short question and keeps a real one', () => {
    expect(normalizeQuestion('raid').ok).toBe(false)
    const parsed = normalizeQuestion('  How do I unlock   Weaver’s Call?  ')
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.value).toBe('How do I unlock Weaver’s Call?')
  })

  it('limits bursts per person and allows someone else', () => {
    resetAskRateLimits()
    const start = 1_700_000_000_000
    for (let i = 0; i < 8; i += 1) {
      expect(takeAskRateLimit({ actor: 'Ada', now: start + i }).ok).toBe(true)
    }
    const blocked = takeAskRateLimit({ actor: 'ada', now: start + 9 })
    expect(blocked.ok).toBe(false)
    expect(takeAskRateLimit({ actor: 'other', now: start }).ok).toBe(true)
  })

  it('keeps only trusted hosts', () => {
    expect(hostAllowed('https://www.light.gg/db/items/1')).toBe(true)
    expect(hostAllowed('https://destiny.fandom.com/wiki/Prismatic')).toBe(true)
    expect(hostAllowed('https://example.com/guide')).toBe(false)
  })
})

describe('ask source parsers', () => {
  it('reads wiki and reddit hits and drops other sites', () => {
    const wiki = parseFandomSearch({
      query: { search: [{ title: 'Weaver’s Call', snippet: 'Prismatic aspect for Warlocks.' }] },
    })
    expect(wiki[0]?.url).toContain('destiny.fandom.com/wiki/')
    expect(wiki[0]?.site).toBe('Destiny wiki')

    const reddit = parseRedditSearch({
      data: {
        children: [
          { data: { title: 'Prismatic unlock', permalink: '/r/DestinyTheGame/comments/abc/prismatic/', selftext: 'Do the quest on one character.' } },
        ],
      },
    })
    expect(reddit[0]?.url).toBe('https://www.reddit.com/r/DestinyTheGame/comments/abc/prismatic/')

    const html = parseHtmlLinks(
      '<a href="https://help.bungie.net/hc/en-us/articles/1">Campaign</a><a href="https://evil.example/phish">Nope</a>',
      'Bungie Help'
    )
    expect(html).toHaveLength(1)
    expect(html[0]?.title).toBe('Campaign')
  })

  it('retrieves with an injected fetch and ignores failed hosts', async () => {
    const sources = await retrieveTrustedSources('Weaver Call Warlock', async (url) => {
      if (String(url).includes('fandom')) {
        return new Response(JSON.stringify({ query: { search: [{ title: 'Prismatic', snippet: 'Aspect' }] } }), { status: 200 })
      }
      return new Response('nope', { status: 500 })
    })
    expect(sources).toHaveLength(1)
    expect(sources[0]?.title).toBe('Prismatic')
  })
})

describe('ask answers', () => {
  it('builds a prompt from the question, notes, and citations', () => {
    const prompt = buildAskPrompt(
      'How do I get Weaver’s Call on a second Warlock?',
      [{ title: 'Prismatic', url: 'https://destiny.fandom.com/wiki/Prismatic', snippet: 'Quest', site: 'Destiny wiki' }],
      formatAskContext({
        displayName: 'Ada',
        characters: [{ className: 'warlock', light: 200, subclass: 'Prismatic' }],
      })
    )
    expect(prompt).toContain('Weaver’s Call')
    expect(prompt).toContain('warlock')
    expect(prompt).toContain('destiny.fandom.com')
    expect(prompt).toContain('do not assume it')
  })

  it('streams a mocked model answer and cites sources first', async () => {
    const stream = createAskStream({
      question: 'How do I get Weaver’s Call?',
      sources: [{ title: 'Prismatic', url: 'https://www.bungie.net/en/News', snippet: 'Quest', site: 'Bungie' }],
      contextText: '',
      configured: true,
      answerId: 'live',
      complete: async function* () {
        yield '1. Finish the Prismatic quest. (Prismatic)'
      },
    })
    const body = await new Response(stream).text()
    const events = parseAskEvents(body)
    expect(events[0]?.type).toBe('meta')
    if (events[0]?.type === 'meta') expect(events[0].sources[0]?.url).toContain('bungie.net')
    expect(events.some((event) => event.type === 'delta' && event.text.includes('Prismatic'))).toBe(true)
    expect(events.at(-1)?.type).toBe('done')
  })

  it('returns a friendly message when the gateway key is missing', async () => {
    expect(askGatewayConfigured({} as unknown as NodeJS.ProcessEnv)).toBe(false)
    expect(askGatewayConfigured({ AI_GATEWAY_API_KEY: 'test' } as unknown as NodeJS.ProcessEnv)).toBe(true)
    const stream = createAskStream({
      question: 'How do I get Weaver’s Call?',
      sources: [],
      contextText: '',
      configured: false,
      answerId: askCacheKey('How do I get Weaver’s Call?', 'anon'),
    })
    const body = await new Response(stream).text()
    expect(body).toContain(UNCONFIGURED_MESSAGE)
    expect(body).toContain('AI_GATEWAY_API_KEY')
  })
})
