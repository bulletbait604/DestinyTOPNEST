import type { GuardianDossier } from '@/lib/destiny/characterSnapshot'
import { reputationBadges } from '@/lib/destiny/reputation'
import { sherpaTitleForPoints } from '@/lib/destiny/sherpaRanks'
import type { DestinyCharacterClass, ReputationReview } from '@/lib/destiny/types'

export type GuardianListingStatus = 'member' | 'pending' | 'bungie'

export interface GuardianDirectoryCard {
  membershipId: string
  membershipType?: number
  displayName: string
  status: GuardianListingStatus
  platform?: string
  characterClass?: string
  emblemUrl?: string
  clanTag?: string
  mvpCount: number
  kudosCount: number
  badges: string[]
}

export interface GuardianRecentActivity {
  id: string
  activityName: string
  type: string
  completedAt: string
  difficulty?: string
}

export interface GuardianCharacterCard {
  characterId: string
  className: string
  power?: number
  emblemUrl?: string
  lastPlayed?: string
}

export interface GuardianGearHighlight {
  name: string
  iconUrl?: string
  source: 'equipped' | 'vault'
}

export interface GuardianPublicProfile {
  card: GuardianDirectoryCard
  guardianRank?: number
  powerLevel?: number
  reputationScore: number
  reviewCount: number
  teammateTitle: string
  teammateScore: number
  teammateReviews: number
  sherpaTitle: string
  sherpaPoints: number
  sherpaGuided: number
  sherpaMarks: number
  recentActivities: GuardianRecentActivity[]
  characters: GuardianCharacterCard[]
  vaultHighlights: GuardianGearHighlight[]
  equippedHighlights: GuardianGearHighlight[]
  stats: { label: string; value: string }[]
  /** Daily character history captured while this Guardian was signed in. */
  dossier?: GuardianDossier
}

const CLASS_LABEL: Record<string, string> = {
  titan: 'Titan',
  hunter: 'Hunter',
  warlock: 'Warlock',
}

export function classLabel(value?: string): string {
  if (!value) return 'Guardian'
  return CLASS_LABEL[value.toLowerCase()] ?? value
}

/** True when a directory row matches a Bungie name, with or without the # code. */
export function guardianNameMatches(displayName: string, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return false
  const name = displayName.trim().toLowerCase()
  if (!name) return false
  if (name.includes(q)) return true
  const hash = q.indexOf('#')
  if (hash > 0) {
    const base = q.slice(0, hash)
    const code = q.slice(hash + 1)
    return name.includes(base) && name.includes(`#${code}`)
  }
  return false
}

function matchScore(displayName: string, query: string): number {
  const name = displayName.trim().toLowerCase()
  const q = query.trim().toLowerCase()
  if (name === q) return 100
  if (name.startsWith(q)) return 80
  if (name.includes(q)) return 50
  return 0
}

export function sortGuardianCards(cards: GuardianDirectoryCard[], query: string): GuardianDirectoryCard[] {
  const rank: Record<GuardianListingStatus, number> = { member: 0, pending: 1, bungie: 2 }
  return [...cards].sort((a, b) => {
    const score = matchScore(b.displayName, query) - matchScore(a.displayName, query)
    if (score !== 0) return score
    if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status]
    return a.displayName.localeCompare(b.displayName)
  })
}

export function splitBungieNameQuery(query: string): { displayName: string; code: number } | null {
  const match = query.trim().match(/^([^#]{1,32})#(\d{1,4})$/)
  if (!match) return null
  const code = Number(match[2])
  if (!Number.isFinite(code)) return null
  return { displayName: match[1].trim(), code }
}

export function isMembershipId(value: string): boolean {
  return /^\d{1,22}$/.test(value.trim())
}

export function guardianBadges(input: {
  status: GuardianListingStatus
  verifiedClears: number
  mvpCount: number
  kudosCount: number
  reviews?: ReputationReview[]
  sherpaPoints?: number
}): string[] {
  const badges = reputationBadges(input.reviews ?? [], input.verifiedClears)
  if (input.status === 'pending') badges.unshift('Awaiting sign-in')
  if (input.status === 'bungie') badges.unshift('Not on Top Nest yet')
  if (input.mvpCount >= 1) badges.push(input.mvpCount === 1 ? '1 MVP' : `${input.mvpCount} MVPs`)
  if (input.kudosCount >= 1) badges.push(input.kudosCount === 1 ? '1 kudos' : `${input.kudosCount} kudos`)
  const title = sherpaTitleForPoints(input.sherpaPoints ?? 0)
  if (title !== 'Unranked') badges.push(title)
  return Array.from(new Set(badges)).slice(0, 6)
}

export function isDestinyCharacterClass(value: string | undefined): value is DestinyCharacterClass {
  return value === 'titan' || value === 'hunter' || value === 'warlock'
}
