import type { AskSource } from '@/lib/ask/askSources'

export const ASK_INSTRUCTIONS = [
  'You are Ask TopNest, a Destiny 2 guide.',
  'Write at most six short numbered steps.',
  'Use only the sources listed in the prompt. After a step, cite the source title in parentheses.',
  'If the sources do not answer the question, say that in one sentence and do not invent steps.',
  'If character notes are included, use only those characters. Do not assume a campaign is finished unless the notes say so.',
  'Plain sentences. No JSON.',
].join(' ')

export function buildAskPrompt(question: string, sources: AskSource[], contextText: string): string {
  const pages = sources.length
    ? sources.map((source, index) => `${index + 1}. ${source.title} (${source.site}) ${source.url}\n${source.snippet}`).join('\n')
    : 'No pages were retrieved.'
  const notes = contextText.trim() || 'No saved character notes.'
  return `Question: ${question}\n\nCharacter notes:\n${notes}\n\nSources:\n${pages}`
}
