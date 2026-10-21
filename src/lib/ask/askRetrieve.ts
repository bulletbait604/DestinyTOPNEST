import { dedupeSources, parseFandomSearch, parseHtmlLinks, parseRedditSearch, type AskSource } from '@/lib/ask/askSources'

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

const TIMEOUT_MS = 4500

async function readText(fetchImpl: FetchLike, url: string): Promise<string | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const response = await fetchImpl(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json, text/html', 'User-Agent': 'TopNestAsk/1.0' },
    })
    if (!response.ok) return null
    return await response.text()
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

export async function retrieveTrustedSources(question: string, fetchImpl: FetchLike = fetch): Promise<AskSource[]> {
  const q = encodeURIComponent(question)
  const [fandom, reddit, help, light, berries, foundry] = await Promise.all([
    readText(fetchImpl, `https://destiny.fandom.com/api.php?action=query&list=search&srsearch=${q}&format=json&srlimit=3`),
    readText(fetchImpl, `https://www.reddit.com/r/DestinyTheGame/search.json?q=${q}&restrict_sr=1&sort=relevance&limit=3`),
    readText(fetchImpl, `https://help.bungie.net/hc/en-us/search?query=${q}`),
    readText(fetchImpl, `https://www.light.gg/db/search/?q=${q}`),
    readText(fetchImpl, `https://www.blueberries.gg/?s=${q}`),
    readText(fetchImpl, `https://d2foundry.gg/?q=${q}`),
  ])

  const sources: AskSource[] = []
  if (fandom) {
    try {
      sources.push(...parseFandomSearch(JSON.parse(fandom)))
    } catch {
      /* ignore malformed wiki payload */
    }
  }
  if (reddit) {
    try {
      sources.push(...parseRedditSearch(JSON.parse(reddit)))
    } catch {
      /* ignore malformed reddit payload */
    }
  }
  if (help) sources.push(...parseHtmlLinks(help, 'Bungie Help'))
  if (light) sources.push(...parseHtmlLinks(light, 'light.gg'))
  if (berries) sources.push(...parseHtmlLinks(berries, 'Blueberries'))
  if (foundry) sources.push(...parseHtmlLinks(foundry, 'd2foundry'))
  return dedupeSources(sources)
}
