export type AskSource = {
  title: string
  url: string
  snippet: string
  site: string
  /** Page or comment text for the model. Omitted from the client source pills. */
  excerpt?: string
}

/** Hosts we will cite. Anything else is dropped before the model sees it. */
export const TRUSTED_HOSTS = [
  'help.bungie.net',
  'www.bungie.net',
  'www.light.gg',
  'light.gg',
  'd2foundry.gg',
  'www.d2foundry.gg',
  'destiny.fandom.com',
  'www.blueberries.gg',
  'blueberries.gg',
  'www.reddit.com',
  'reddit.com',
  'old.reddit.com',
]

export const ASK_MODEL_ENV = 'AI_GATEWAY_MODEL'
export const ASK_KEY_ENV = 'AI_GATEWAY_API_KEY'
export const DEFAULT_ASK_MODEL = 'openai/gpt-5.4-mini'

export const UNCONFIGURED_MESSAGE =
  'Ask TopNest cannot write steps yet. Add GOOGLE_API or AI_GATEWAY_API_KEY on the server, then ask again. The links below are the pages we already found.'

export const REDDIT_MAX_AGE_SEC = 18 * 30 * 24 * 60 * 60

const VAULTED_TEXT =
  /red war|tangled shore|warmind cell|season of opulence|elemental well|charged with light|armor 2\.0|sunset quest|menagerie|leviathan|scourge of the past|crown of sorrow/i

export function questionMentionsVaulted(question: string): boolean {
  return VAULTED_TEXT.test(question)
}

export function textLooksVaulted(text: string): boolean {
  return VAULTED_TEXT.test(text)
}

export function redditPostIsFresh(createdUtc: number | undefined, nowSec: number, question: string): boolean {
  if (questionMentionsVaulted(question)) return true
  if (createdUtc == null || !Number.isFinite(createdUtc)) return true
  return nowSec - createdUtc <= REDDIT_MAX_AGE_SEC
}

export function hostAllowed(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase()
    return TRUSTED_HOSTS.some((item) => host === item || host.endsWith(`.${item}`))
  } catch {
    return false
  }
}

export function normalizeQuestion(raw: unknown): { ok: true; value: string } | { ok: false; error: string } {
  if (typeof raw !== 'string') return { ok: false, error: 'Type a question.' }
  const value = raw.replace(/\s+/g, ' ').trim()
  if (value.length < 8) return { ok: false, error: 'Ask a little more so the steps can be specific.' }
  if (value.length > 400) return { ok: false, error: 'Keep the question under 400 characters.' }
  return { ok: true, value }
}

export function askCacheKey(question: string, contextKey: string): string {
  const text = `${question.toLowerCase()}|${contextKey}`
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return `ask_v2_${(hash >>> 0).toString(16)}`
}

export function geminiApiKey(env: NodeJS.ProcessEnv = process.env): string {
  return env.GOOGLE_API?.trim() || env.GEMINI_API?.trim() || env.GOOGLE_API_KEY?.trim() || ''
}

export type AskProvider = 'gemini' | 'gateway' | 'none'

export function askProvider(env: NodeJS.ProcessEnv = process.env): AskProvider {
  if (geminiApiKey(env)) return 'gemini'
  if (env[ASK_KEY_ENV]?.trim() || env.OPENAI_API?.trim() || env.VERCEL_OIDC_TOKEN?.trim()) return 'gateway'
  return 'none'
}

export function askGatewayConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return askProvider(env) !== 'none'
}

export function askModelId(env: NodeJS.ProcessEnv = process.env): string {
  return env[ASK_MODEL_ENV]?.trim() || DEFAULT_ASK_MODEL
}

function clip(value: string, max: number): string {
  const clean = value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean
}

export function keepSource(source: AskSource): AskSource | null {
  if (!hostAllowed(source.url)) return null
  const title = clip(source.title, 140)
  if (!title) return null
  return {
    title,
    url: source.url,
    snippet: clip(source.snippet, 220),
    site: source.site,
  }
}

export function parseFandomSearch(payload: unknown): AskSource[] {
  const search = (payload as { query?: { search?: unknown } })?.query?.search
  if (!Array.isArray(search)) return []
  const sources: AskSource[] = []
  for (const row of search) {
    if (!row || typeof row !== 'object') continue
    const title = typeof (row as { title?: unknown }).title === 'string' ? (row as { title: string }).title : ''
    const snippet = typeof (row as { snippet?: unknown }).snippet === 'string' ? (row as { snippet: string }).snippet : ''
    if (!title) continue
    const slug = title.replace(/ /g, '_')
    const kept = keepSource({
      title,
      url: `https://destiny.fandom.com/wiki/${encodeURIComponent(slug)}`,
      snippet,
      site: 'Destiny wiki',
    })
    if (kept) sources.push(kept)
  }
  return sources
}

export function parseRedditSearch(
  payload: unknown,
  options?: { nowSec?: number; question?: string }
): AskSource[] {
  const children = (payload as { data?: { children?: unknown } })?.data?.children
  if (!Array.isArray(children)) return []
  const nowSec = options?.nowSec ?? Math.floor(Date.now() / 1000)
  const question = options?.question ?? ''
  const sources: AskSource[] = []
  for (const child of children) {
    const data = (child as {
      data?: { title?: unknown; permalink?: unknown; selftext?: unknown; created_utc?: unknown }
    })?.data
    if (!data || typeof data.title !== 'string' || typeof data.permalink !== 'string') continue
    const created = typeof data.created_utc === 'number' ? data.created_utc : undefined
    if (!redditPostIsFresh(created, nowSec, question)) continue
    const snippet = typeof data.selftext === 'string' ? data.selftext : ''
    if (textLooksVaulted(`${data.title} ${snippet}`) && !questionMentionsVaulted(question)) continue
    const kept = keepSource({
      title: data.title,
      url: `https://www.reddit.com${data.permalink}`,
      snippet,
      site: 'r/DestinyTheGame',
    })
    if (kept) sources.push(kept)
  }
  return sources
}

export function wikitextToPlain(wikitext: string, max = 2500): string {
  let text = wikitext
  for (let i = 0; i < 24; i += 1) {
    const next = text.replace(/\{\{[^{}]*\}\}/g, ' ')
    if (next === text) break
    text = next
  }
  text = text
    .replace(/\[\[(?:File|Image):[^\]]+\]\]/gi, ' ')
    .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/<ref[\s\S]*?<\/ref>/gi, ' ')
    .replace(/'''|''/g, '')
    .replace(/={2,}/g, ' ')
  return clip(text, max)
}

export function fandomWikitextExcerpt(payload: unknown, max = 2500): string {
  const raw = (payload as { parse?: { wikitext?: { '*'?: unknown } } })?.parse?.wikitext?.['*']
  return typeof raw === 'string' ? wikitextToPlain(raw, max) : ''
}

export function extractArticleText(html: string, max = 2500): string {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
  const article =
    withoutScripts.match(/<article[\s\S]*?<\/article>/i)?.[0] ??
    withoutScripts.match(/<main[\s\S]*?<\/main>/i)?.[0] ??
    withoutScripts
  return clip(article, max)
}

export function redditThreadExcerpt(payload: unknown, max = 2500): string {
  if (!Array.isArray(payload)) return ''
  const post = (payload[0] as { data?: { children?: Array<{ data?: { selftext?: unknown } }> } })?.data?.children?.[0]?.data
  const selftext = typeof post?.selftext === 'string' ? post.selftext : ''
  const comments = (payload[1] as { data?: { children?: Array<{ data?: { body?: unknown } }> } })?.data?.children ?? []
  const lines = comments
    .map((child) => child?.data?.body)
    .filter((body): body is string => typeof body === 'string' && body.length > 0 && body !== '[deleted]' && body !== '[removed]')
    .slice(0, 5)
  return clip([selftext, ...lines].filter(Boolean).join('\n'), max)
}

export function parseGeminiChunk(payload: unknown): { text: string; sources: AskSource[] } {
  const candidate = (payload as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: unknown }> }
      groundingMetadata?: { groundingChunks?: Array<{ web?: { uri?: unknown; title?: unknown } }> }
    }>
  }).candidates?.[0]
  const text = (candidate?.content?.parts ?? [])
    .map((part) => (typeof part.text === 'string' ? part.text : ''))
    .join('')
  const sources: AskSource[] = []
  for (const chunk of candidate?.groundingMetadata?.groundingChunks ?? []) {
    const uri = chunk.web?.uri
    const title = chunk.web?.title
    if (typeof uri !== 'string' || typeof title !== 'string' || !uri.startsWith('http')) continue
    sources.push({ title: clip(title, 140), url: uri, snippet: '', site: 'Google Search' })
  }
  return { text, sources }
}

export function publicAskSources(sources: AskSource[]): AskSource[] {
  return sources.map((source) => ({
    title: source.title,
    url: source.url,
    snippet: clip(source.snippet, 220),
    site: source.site,
  }))
}

export function parseHtmlLinks(html: string, site: string): AskSource[] {
  const sources: AskSource[] = []
  const pattern = /<a[^>]+href="(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi
  let match = pattern.exec(html)
  while (match) {
    const kept = keepSource({
      title: match[2] ?? '',
      url: match[1] ?? '',
      snippet: '',
      site,
    })
    if (kept) sources.push(kept)
    match = pattern.exec(html)
  }
  return sources
}

export function dedupeSources(sources: AskSource[], limit = 6): AskSource[] {
  const seen = new Set<string>()
  const unique: AskSource[] = []
  for (const source of sources) {
    if (seen.has(source.url)) continue
    seen.add(source.url)
    unique.push(source)
    if (unique.length >= limit) break
  }
  return unique
}
