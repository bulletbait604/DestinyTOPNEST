import { normalizeActivityKey } from '@/lib/destiny/activityIconPaths'

export interface ActivityWalkthrough {
  url: string
  label: string
  duration?: string
}

/** Verified concise walkthroughs — prefer shorter complete guides when available. */
export const ACTIVITY_WALKTHROUGH_URLS: Record<string, ActivityWalkthrough> = {
  pantheon: {
    url: 'https://www.youtube.com/watch?v=N08MMZXaGHA',
    label: 'Pantheon 2.0 — boss mechanics recap',
    duration: '~18 min',
  },
  "king's fall": {
    url: 'https://www.youtube.com/watch?v=oW1c6pBs_a4',
    label: "King's Fall — complete raid in 6 minutes",
    duration: '~6 min',
  },
  'vault of glass': {
    url: 'https://www.youtube.com/watch?v=o4Ac6s2OA3g',
    label: 'Vault of Glass — full raid walkthrough',
    duration: '~25 min',
  },
  'deep stone crypt': {
    url: 'https://www.youtube.com/results?search_query=destiny+2+deep+stone+crypt+raid+guide+complete',
    label: 'Deep Stone Crypt — YouTube walkthrough',
  },
  'root of nightmares': {
    url: 'https://www.youtube.com/results?search_query=destiny+2+root+of+nightmares+raid+guide+complete',
    label: 'Root of Nightmares — YouTube walkthrough',
  },
  'vow of the disciple': {
    url: 'https://www.youtube.com/results?search_query=destiny+2+vow+of+the+disciple+raid+guide+complete',
    label: 'Vow of the Disciple — YouTube walkthrough',
  },
  'last wish': {
    url: 'https://www.youtube.com/results?search_query=destiny+2+last+wish+raid+guide+complete',
    label: 'Last Wish — YouTube walkthrough',
  },
  "crota's end": {
    url: 'https://www.youtube.com/results?search_query=destiny+2+crota%27s+end+raid+guide+complete',
    label: "Crota's End — YouTube walkthrough",
  },
  'garden of salvation': {
    url: 'https://www.youtube.com/results?search_query=destiny+2+garden+of+salvation+raid+guide+complete',
    label: 'Garden of Salvation — YouTube walkthrough',
  },
  "salvation's edge": {
    url: 'https://www.youtube.com/results?search_query=destiny+2+salvation%27s+edge+raid+guide+complete',
    label: "Salvation's Edge — YouTube walkthrough",
  },
  'crown of sorrow': {
    url: 'https://www.youtube.com/watch?v=kftwS8zi0iU',
    label: 'Crown of Sorrow (Pantheon) — Gahlran guide',
    duration: '~20 min',
  },
  'spire of the watcher': {
    url: 'https://www.youtube.com/watch?v=zz8kKQoymYE',
    label: 'Spire of the Watcher — complete dungeon guide',
    duration: '~22 min',
  },
  'ghosts of the deep': {
    url: 'https://www.youtube.com/results?search_query=destiny+2+ghosts+of+the+deep+dungeon+guide+complete',
    label: 'Ghosts of the Deep — YouTube walkthrough',
  },
  duality: {
    url: 'https://www.youtube.com/watch?v=KW1e6__AFT8',
    label: 'Duality — dungeon walkthrough',
    duration: '~35 min',
  },
  'shattered throne': {
    url: 'https://www.youtube.com/results?search_query=destiny+2+shattered+throne+dungeon+guide+complete',
    label: 'Shattered Throne — YouTube walkthrough',
  },
  "warlord's ruin": {
    url: 'https://www.youtube.com/results?search_query=destiny+2+warlord%27s+ruin+dungeon+guide+complete',
    label: "Warlord's Ruin — YouTube walkthrough",
  },
  'grasp of avarice': {
    url: 'https://www.youtube.com/results?search_query=destiny+2+grasp+of+avarice+dungeon+guide+complete',
    label: 'Grasp of Avarice — YouTube walkthrough',
  },
  prophecy: {
    url: 'https://www.youtube.com/results?search_query=destiny+2+prophecy+dungeon+guide+complete',
    label: 'Prophecy — YouTube walkthrough',
  },
  'pit of heresy': {
    url: 'https://www.youtube.com/results?search_query=destiny+2+pit+of+heresy+dungeon+guide+complete',
    label: 'Pit of Heresy — YouTube walkthrough',
  },
  "vesper's host": {
    url: 'https://www.youtube.com/results?search_query=destiny+2+vesper%27s+host+dungeon+guide+complete',
    label: "Vesper's Host — YouTube walkthrough",
  },
  'sundered doctrine': {
    url: 'https://www.youtube.com/results?search_query=destiny+2+sundered+doctrine+dungeon+guide+complete',
    label: 'Sundered Doctrine — YouTube walkthrough',
  },
}

function youtubeSearchUrl(activityName: string): string {
  const q = encodeURIComponent(`Destiny 2 ${activityName} complete guide walkthrough`)
  return `https://www.youtube.com/results?search_query=${q}`
}

export function activityWalkthroughUrl(name: string): ActivityWalkthrough {
  const key = normalizeActivityKey(name)
  const hit = ACTIVITY_WALKTHROUGH_URLS[key]
  if (hit) return hit

  const display = name.replace(/:\s*master$/i, '').trim()
  return {
    url: youtubeSearchUrl(display),
    label: `${display} — find a walkthrough on YouTube`,
  }
}

export function activityWalkthroughLinkTitle(name: string): string {
  const w = activityWalkthroughUrl(name)
  return `Watch ${w.label}${w.duration ? ` (${w.duration})` : ''}`
}
