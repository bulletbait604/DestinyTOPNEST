'use client'

import { useEffect, useState } from 'react'
import type { DestinyTopNestTab } from '@/lib/destiny/types'
import { navigateDestinyTab } from '@/lib/routing/tabUrl'

export const GUIDE_STORAGE_KEY = 'topnest-guide-dismissed'

export const HOW_STEPS = [
  {
    title: 'Play with new friends',
    body: 'Join an open fireteam, or sign in and post a raid or dungeon.',
  },
  {
    title: 'Earn points',
    body: 'A verified clear adds points. A bond is extra points for someone you have not cleared with before.',
  },
  {
    title: 'Climb the season boards',
    body: 'US and Canada leaders can win a Destiny 2 3D print. UK leaders can win a $50 CAD Steam gift card.',
  },
] as const

export const GLOSSARY = [
  { word: 'Points', meaning: 'Score from a verified raid or dungeon clear.' },
  { word: 'Bonds', meaning: 'Extra points for clearing with someone new to you.' },
  { word: 'MVP', meaning: 'Your vote for the most helpful teammate. It does not change board points.' },
  { word: 'Kudos', meaning: 'A thank-you on a profile. It does not change board points.' },
  { word: 'Sherpa', meaning: 'A sherpa is a player who already cleared an activity and helps someone get their first clear.' },
  {
    word: 'Hall of Fame',
    meaning: 'The top three on each season prize board. #1 can win the prize. It is not the teachers list.',
  },
  {
    word: 'Featured build',
    meaning: 'A curated loadout from a build site, with a link to the source. It is not a player post.',
  },
] as const

export const MAIN_NAV: { href: string; label: string; icon: 'home' | 'play' | 'people' | 'boards' | 'ask' }[] = [
  { href: '/', label: 'Home', icon: 'home' },
  { href: '/score', label: 'Score a Run', icon: 'play' },
  { href: '/rate', label: 'Vote MVP', icon: 'people' },
  { href: '/boards', label: 'Leaderboards', icon: 'boards' },
  { href: '/ask', label: 'Ask AI', icon: 'ask' },
]

export const PRIMARY_NAV: { id: DestinyTopNestTab; label: string; hint: string }[] = [
  { id: 'overview', label: 'Home', hint: 'Score a run, vote MVP, and see how TopNest works.' },
  { id: 'leaderboards', label: 'Leaderboards', hint: 'Season rankings. Leaders can win a 3D print.' },
  { id: 'ask', label: 'Ask AI', hint: 'Current step-by-step Destiny answers.' },
]

export const GEAR_NAV: { id: DestinyTopNestTab; label: string; hint: string }[] = [
  { id: 'loadouts', label: 'Shared builds', hint: 'Featured guides from build sites, plus gear players post.' },
  { id: 'compare', label: 'Compare', hint: 'Two builds side by side.' },
  { id: 'lookup', label: 'Find a build', hint: 'Search builds or the gear someone has equipped.' },
  { id: 'quests', label: 'Quests', hint: 'Quests, pursuits, and catalysts.' },
]

export const MORE_NAV: { id: DestinyTopNestTab; label: string; hint: string }[] = [
  { id: 'fireteam', label: 'Find a fireteam', hint: 'Open raids and dungeons you can join.' },
  { id: 'guardians', label: 'People', hint: 'Find a Guardian and vote them MVP.' },
  { id: 'contracts', label: 'Weekly goals', hint: 'Three goals that reset Tuesday. They do not change board points.' },
  { id: 'sherpas', label: 'Teachers', hint: 'Sherpas: players who guided a first clear.' },
  { id: 'clans', label: 'Clans', hint: 'Standings when clanmates clear together.' },
  { id: 'events', label: 'Events', hint: 'Scheduled community sessions.' },
  { id: 'season', label: 'Prize rules', hint: 'The Season Hall of Fame, and who can win the 3D print or Steam card.' },
]

const GEAR_TABS = new Set<DestinyTopNestTab>(['loadouts', 'builds', 'compare', 'lookup', 'quests'])

export function isGearTab(tab: DestinyTopNestTab): boolean {
  return GEAR_TABS.has(tab)
}

export function navHint(tab: DestinyTopNestTab): string {
  if (tab === 'builds') return GEAR_NAV[0].hint
  const gear = GEAR_NAV.find((item) => item.id === tab)
  if (gear) return gear.hint
  const primary = PRIMARY_NAV.find((item) => item.id === tab)
  if (primary) return primary.hint
  const more = MORE_NAV.find((item) => item.id === tab)
  if (more) return more.hint
  if (tab === 'ask') return 'Step-by-step answers with source links.'
  if (tab === 'profile') return 'Your Guardian, stamps, and weekly goals after you sign in.'
  return 'TopNest helps you play with new friends and climb the season boards.'
}

type GuideStorage = {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
}

export function isGuideDismissed(storage: GuideStorage): boolean {
  try {
    return storage.getItem(GUIDE_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function dismissGuide(storage: GuideStorage) {
  storage.setItem(GUIDE_STORAGE_KEY, '1')
}

export function HowItWorks({ onLogin }: { onLogin: () => void }) {
  return (
    <section className="gh-card gh-how" aria-labelledby="gh-what">
      <h2 id="gh-what">What is TopNest?</h2>
      <p className="gh-lede">
        A fan-made Destiny 2 site for playing with new friends, earning points, and climbing season boards.
      </p>
      <ol className="gh-how-steps">
        {HOW_STEPS.map((step, index) => (
          <li key={step.title}>
            <strong>
              {index + 1}. {step.title}
            </strong>
            <span>{step.body}</span>
          </li>
        ))}
      </ol>
      <dl className="gh-glossary">
        {GLOSSARY.map((item) => (
          <div key={item.word}>
            <dt>{item.word}</dt>
            <dd>{item.meaning}</dd>
          </div>
        ))}
      </dl>
      <SignInPrompt
        onLogin={onLogin}
        reason="Sign in so a verified clear can earn points, you can vote MVP for a teammate, and you can share the build you are wearing."
      />
    </section>
  )
}

export function SignInPrompt({ onLogin, reason }: { onLogin?: () => void; reason: string }) {
  return (
    <aside className="gh-signin">
      <p>{reason}</p>
      {onLogin ? (
        <button type="button" className="gh-btn gh-btn-primary" onClick={onLogin}>
          Sign in with Bungie
        </button>
      ) : null}
    </aside>
  )
}

export function NextStep({
  title,
  body,
  actions,
  alert = false,
}: {
  title: string
  body: string
  actions?: { label: string; onClick: () => void }[]
  alert?: boolean
}) {
  return (
    <div className={alert ? 'gh-alert' : 'gh-empty'} role={alert ? 'alert' : undefined}>
      <p className="gh-card-title">{title}</p>
      <p className="gh-muted">{body}</p>
      {actions && actions.length > 0 ? (
        <div className="gh-actions">
          {actions.map((action) => (
            <button key={action.label} type="button" className="gh-btn gh-btn-ghost" onClick={action.onClick}>
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function FirstTimeGuide() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(!isGuideDismissed(window.localStorage))
  }, [])

  if (!open) return null

  return (
    <section className="gh-guide" aria-labelledby="gh-guide-title">
      <div>
        <p className="gh-kicker">First visit</p>
        <h2 id="gh-guide-title">New to TopNest?</h2>
        <p className="gh-lede">Play with new friends, earn points, and climb the season boards.</p>
      </div>
      <div className="gh-actions">
        <button
          type="button"
          className="gh-btn gh-btn-primary"
          onClick={() => {
            dismissGuide(window.localStorage)
            setOpen(false)
          }}
        >
          Got it
        </button>
        <button
          type="button"
          className="gh-btn gh-btn-ghost"
          onClick={() => {
            dismissGuide(window.localStorage)
            setOpen(false)
            navigateDestinyTab('leaderboards')
          }}
        >
          Show the boards
        </button>
      </div>
    </section>
  )
}
