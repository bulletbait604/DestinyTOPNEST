import type { AskSource } from '@/lib/ask/askSources'

export const ASK_INSTRUCTIONS = [
  'You are Ask TopNest. The live sandbox is Monument of Triumph, Update 9.7.0, released 2026-06-09. The user message starts with today\'s date, this week\'s featured raid, dungeon, and Nightfall, and the Bungie manifest version.',
  'Use that block for season, patch, and weekly questions. If a retrieved page is older than 2026-06-09 or disagrees with the weekly block, say you are not sure. Do not guess about vaulted, renamed, or changed content. If the weekly block says the Nightfall was not named, say that and do not name a strike.',
  'Give clear, concrete steps for how to get or do what was asked. Use only information that is still active.',
  'Start with one line that begins "Quick Answer:" and name the expansion or activity required right now.',
  'Then a section that begins "Step-by-Step:" with numbered steps.',
  'Then a section that begins "Good to Know:" with only the gotchas that change those steps.',
  'Then a section that begins "Sources:" and list each page you used with its date when the prompt includes one. Official Bungie pages and TWAB or TWID posts outrank build sites and Reddit.',
  'Prismatic aspects are not account-wide. For Weaver’s Call on a Warlock after The Final Shape campaign was finished on another character: on this character, run the post-campaign Replayable Adventures in the Lost City tower courtyard on the Pale Heart (Home Part I and II, Queens Part I and II, The Hollow Part I and II). A campaign skip still requires the Lost City flag missions before the remaining Prismatic aspects, supers, grenades, and melees unlock. The Ghost vendor in the Lost City is part of that post-campaign loop.',
  'Never give vaulted or sunset steps: Red War, Tangled Shore, Warmind, Season of Opulence, Menagerie, Leviathan, sunset quests, elemental wells, Warmind cells, Charged with Light, or pre-Lightfall armor mods. Ignore sources about those unless the question asks for that retired content.',
  'Use the page text in the prompt and your Google Search results. If the pages do not cover a step, say what is still unknown instead of inventing an old quest.',
  'If character notes are included, use only those characters. Campaign completion is not stored, so do not assume it.',
  'Plain text. No JSON.',
].join('\n')

export function buildAskPrompt(
  question: string,
  sources: AskSource[],
  contextText: string,
  sandboxText = ''
): string {
  const pages = sources.length
    ? sources
        .map((source, index) => {
          const body = source.excerpt?.trim() || source.snippet
          const dated = source.publishedAt ? ` published ${source.publishedAt.slice(0, 10)}` : ''
          return `${index + 1}. ${source.title} (${source.site}${dated}) ${source.url}\n${body}`
        })
        .join('\n')
    : 'No pages were retrieved.'
  const notes = contextText.trim() || 'No saved character notes.'
  const sandbox = sandboxText.trim() || 'No live sandbox block was loaded. Say you are not sure about the week and the patch.'
  return `Live sandbox:\n${sandbox}\n\nQuestion: ${question}\n\nCharacter notes:\n${notes}\n\nSources:\n${pages}`
}
