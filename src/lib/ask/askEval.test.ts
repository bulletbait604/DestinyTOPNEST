import { describe, expect, it } from 'vitest'
import { ASK_INSTRUCTIONS } from '@/lib/ask/askPrompt'
import { askProvider, askTopic, TRUSTED_HOSTS } from '@/lib/ask/askSources'

/** Realistic questions. Live model calls run only when an existing Ask key is set. */
export const ASK_EVAL_CASES = [
  { id: 'exotic', question: 'How do I unlock the Gjallarhorn catalyst in Destiny 2?', topic: 'destiny' as const },
  { id: 'raid-week', question: 'What is the weekly raid rotation this week?', topic: 'destiny' as const },
  { id: 'aspect', question: 'How do I unlock a Prismatic aspect on a second character?', topic: 'destiny' as const },
  { id: 'build', question: 'What is a solid solar hunter build for a nightfall right now?', topic: 'destiny' as const },
  { id: 'quest', question: 'I am stuck on a quest step after the campaign. What should I do next?', topic: 'destiny' as const },
  { id: 'dungeon', question: 'How do I start the weekly featured dungeon?', topic: 'destiny' as const },
  { id: 'lost-sector', question: 'Where is the legend lost sector today and what exotic can it drop?', topic: 'destiny' as const },
  { id: 'vaulted', question: 'Can I still play the Leviathan raid for Calus tokens?', topic: 'destiny' as const },
  { id: 'mod', question: 'How do armor mods work after Armor 3.0?', topic: 'destiny' as const },
  { id: 'divinity', question: 'How do I get Divinity from Garden of Salvation?', topic: 'destiny' as const },
  { id: 'power', question: 'What power level do I need for a grandmaster nightfall?', topic: 'destiny' as const },
  { id: 'unsure', question: 'Did Bungie change the weekly story mission reward yesterday?', topic: 'destiny' as const },
  { id: 'off-topic', question: 'What is the weather forecast and the stock price of a recipe for homework?', topic: 'off_topic' as const },
]

describe('ask eval set', () => {
  it('covers realistic Destiny questions and refuses a non-Destiny one', () => {
    expect(ASK_EVAL_CASES.length).toBeGreaterThanOrEqual(12)
    expect(ASK_EVAL_CASES.length).toBeLessThanOrEqual(15)
    for (const item of ASK_EVAL_CASES) {
      expect(askTopic(item.question)).toBe(item.topic)
    }
  })

  it('tells the model to use short steps, real sources, and to admit uncertainty', () => {
    expect(ASK_INSTRUCTIONS).toContain('Quick Answer:')
    expect(ASK_INSTRUCTIONS).toContain('Step-by-Step:')
    expect(ASK_INSTRUCTIONS).toContain("I'm not sure")
    expect(ASK_INSTRUCTIONS).toContain('Never invent a URL')
    expect(ASK_INSTRUCTIONS).toContain('Today in Destiny')
    expect(ASK_INSTRUCTIONS).toContain('light.gg')
    expect(ASK_INSTRUCTIONS).toContain('D2 Foundry')
    expect(ASK_INSTRUCTIONS).toContain('vaulted')
    expect(ASK_INSTRUCTIONS).toContain('Update 9.7.0')
    expect(ASK_INSTRUCTIONS).toContain('only answers Destiny 2')
    for (const host of ['www.bungie.net', 'destiny.fandom.com', 'www.light.gg', 'd2foundry.gg', 'www.todayindestiny.com']) {
      expect(TRUSTED_HOSTS).toContain(host)
    }
  })

  it('names the provider from existing env vars and does not add new ones', () => {
    expect(['gemini', 'gateway', 'none']).toContain(askProvider(process.env))
  })
})
