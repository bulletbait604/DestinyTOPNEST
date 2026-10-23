export type AskSource = {
  title: string
  url: string
  snippet: string
  site: string
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
  'Ask TopNest cannot write steps yet. Add AI_GATEWAY_API_KEY on the server, then ask again. The links below are the pages we already found.'

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
  return `ask_${(hash >>> 0).toString(16)}`
}

export function askGatewayConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env[ASK_KEY_ENV]?.trim() || env.VERCEL_OIDC_TOKEN?.trim())
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

export function parseRedditSearch(payload: unknown): AskSource[] {
  const children = (payload as { data?: { children?: unknown } })?.data?.children
  if (!Array.isArray(children)) return []
  const sources: AskSource[] = []
  for (const child of children) {
    const data = (child as { data?: { title?: unknown; permalink?: unknown; selftext?: unknown } })?.data
    if (!data || typeof data.title !== 'string' || typeof data.permalink !== 'string') continue
    const kept = keepSource({
      title: data.title,
      url: `https://www.reddit.com${data.permalink}`,
      snippet: typeof data.selftext === 'string' ? data.selftext : '',
      site: 'r/DestinyTheGame',
    })
    if (kept) sources.push(kept)
  }
  return sources
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
