import { describe, expect, it } from 'vitest'
import { formatAskContext } from '@/lib/ask/askContext'
import { ASK_INSTRUCTIONS, buildAskPrompt } from '@/lib/ask/askPrompt'
import { resetAskRateLimits, takeAskRateLimit } from '@/lib/ask/askRateLimit'
import { retrieveTrustedSources } from '@/lib/ask/askRetrieve'
import {
  UNCONFIGURED_MESSAGE,
  askCacheKey,
  askGatewayConfigured,
  askProvider,
  extractArticleText,
  wikitextToPlain,
  hostAllowed,
  normalizeQuestion,
  parseFandomSearch,
  parseGeminiChunk,
  parseHtmlLinks,
  parseRedditSearch,
  redditThreadExcerpt,
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
    expect(ASK_INSTRUCTIONS).toContain('Quick Answer:')
    expect(ASK_INSTRUCTIONS).toContain('Lost City')
    expect(ASK_INSTRUCTIONS).toContain('vaulted')
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
    expect(askCacheKey('How do I get Weaver’s Call?', 'anon').startsWith('ask_v2_')).toBe(true)
  })

  it('uses GOOGLE_API for Gemini before the gateway key', () => {
    const env = { GOOGLE_API: 'present', AI_GATEWAY_API_KEY: 'also' } as unknown as NodeJS.ProcessEnv
    expect(askProvider(env)).toBe('gemini')
    expect(askProvider({ GEMINI_API: 'present' } as unknown as NodeJS.ProcessEnv)).toBe('gemini')
    expect(askProvider({ OPENAI_API: 'present' } as unknown as NodeJS.ProcessEnv)).toBe('gateway')
    expect(askGatewayConfigured({ GOOGLE_API_KEY: 'present' } as unknown as NodeJS.ProcessEnv)).toBe(true)
  })

  it('reads Gemini text and Google Search grounding links', () => {
    const parsed = parseGeminiChunk({
      candidates: [
        {
          content: { parts: [{ text: 'Quick Answer: Run the Lost City adventures on this Warlock.' }] },
          groundingMetadata: {
            groundingChunks: [{ web: { uri: 'https://www.blueberries.gg/prismatic/', title: 'Prismatic unlock' } }],
          },
        },
      ],
    })
    expect(parsed.text).toContain('Quick Answer:')
    expect(parsed.sources[0]?.site).toBe('Google Search')
    expect(parsed.sources[0]?.url).toContain('blueberries.gg')
  })

  it('drops reddit posts older than 18 months and vaulted pages, and reads the article', () => {
    const nowSec = Math.floor(Date.parse('2026-10-23T00:00:00.000Z') / 1000)
    const reddit = parseRedditSearch(
      {
        data: {
          children: [
            {
              data: {
                title: 'Current Prismatic',
                permalink: '/r/DestinyTheGame/comments/new/prismatic/',
                selftext: 'Run the Lost City adventures.',
                created_utc: nowSec - 20 * 24 * 60 * 60,
              },
            },
            {
              data: {
                title: 'Old Red War guide',
                permalink: '/r/DestinyTheGame/comments/old/redwar/',
                selftext: 'Start the Red War campaign.',
                created_utc: nowSec - 40 * 24 * 60 * 60,
              },
            },
            {
              data: {
                title: 'Ancient thread',
                permalink: '/r/DestinyTheGame/comments/ancient/thread/',
                selftext: 'Still useful?',
                created_utc: nowSec - 800 * 24 * 60 * 60,
              },
            },
          ],
        },
      },
      { nowSec, question: 'How do I get Weaver’s Call on a second Warlock?' }
    )
    expect(reddit.map((source) => source.title)).toEqual(['Current Prismatic'])

    const article = extractArticleText(
      '<html><script>var old = "Red War"</script><article><p>Run Home Part I in the Lost City.</p></article></html>'
    )
    expect(article).toContain('Lost City')
    expect(article).not.toContain('Red War')

    const wiki = wikitextToPlain(
      '{{Infobox|name=Weaver}}\n==Unlock==\nRun [[Lost City|the Lost City]] adventures on this character. Not the [[Red War]].'
    )
    expect(wiki).toContain('Lost City adventures')
    expect(wiki).not.toContain('Infobox')

    const excerpt = redditThreadExcerpt([
      { data: { children: [{ data: { selftext: 'Do the six adventures on this character.' } }] } },
      { data: { children: [{ data: { body: 'Ghost vendor is after those missions.' } }, { data: { body: '[deleted]' } }] } },
    ])
    expect(excerpt).toContain('six adventures')
    expect(excerpt).toContain('Ghost vendor')
    expect(excerpt).not.toContain('[deleted]')
  })

  it('reads the wiki article body instead of an empty search snippet', async () => {
    const fetchImpl = async (url: string) => {
      if (url.includes('action=query&list=search')) {
        return new Response(
          JSON.stringify({ query: { search: [{ title: "Weaver's Call", snippet: '' }] } })
        )
      }
      if (url.includes('action=parse')) {
        return new Response(
          JSON.stringify({
            parse: {
              wikitext: {
                '*': '==Unlock==\nOn this Warlock, run the Lost City Replayable Adventures: Home Part I and Home Part II.',
              },
            },
          })
        )
      }
      return new Response('', { status: 404 })
    }
    const sources = await retrieveTrustedSources("How do I get Weaver's Call on this Warlock?", fetchImpl)
    expect(sources[0]?.excerpt).toContain('Lost City Replayable Adventures')
    expect(sources[0]?.excerpt).toContain('Home Part II')
  })
})
