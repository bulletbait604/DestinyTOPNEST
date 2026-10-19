/**
 * Owner-edited site content. Weekly goals, events, and prize names live in
 * MongoDB so they can be changed from the admin console.
 * Built-in lists remain the fallback when nothing has been saved.
 */

import clientPromise from '@/lib/mongodb'
import { getMongoDbName } from '@/lib/database'
import { DESTINY_COLLECTIONS } from '@/lib/destiny/collections'
import { seasonPrizesEnabled } from '@/lib/destiny/featureFlags'
import { isNightOpsEvent, resolveNightOpsCatalog } from '@/lib/destiny/nightOps'
import {
  DEFAULT_SEASON_PRIZE_RULES,
  PRIZE_ELIGIBILITY,
  SEASON_PRIZE_TEXT,
} from '@/lib/destiny/seasonCatalog'
import { getSeasonData, saveSeasonData } from '@/lib/destiny/store'
import type { NightOpsEvent, WeeklyContractDefinition } from '@/lib/destiny/types'
import {
  DEFAULT_WEEKLY_CONTRACTS,
  isWeeklyContractDefinition,
  resolveWeeklyContractCatalog,
} from '@/lib/destiny/weeklyContractCatalog'

export interface PrizeCopy {
  physicalPrize: string
  giftCardPrize: string
  cardLabel: string
  firstPlace: string
}

export interface SiteContentRecord {
  contracts: WeeklyContractDefinition[] | null
  events: NightOpsEvent[]
  eventsCustomized: boolean
  prizesEnabled: boolean | null
  prizeCopy: PrizeCopy | null
  updatedAt?: string
}

export const DEFAULT_PRIZE_COPY: PrizeCopy = {
  physicalPrize: PRIZE_ELIGIBILITY.physicalPrize,
  giftCardPrize: PRIZE_ELIGIBILITY.giftCardPrize,
  cardLabel: 'Destiny 2 3D print · or Steam card (UK)',
  firstPlace: SEASON_PRIZE_TEXT,
}

const DOC_ID = 'live'
const MAX_GOALS = 8
const MAX_EVENTS = 30

export class SiteContentError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SiteContentError'
  }
}

function clip(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function httpsUrl(value: string): string | undefined {
  if (!value) return undefined
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new SiteContentError('Watch links must start with https://.')
  }
  if (url.protocol !== 'https:') throw new SiteContentError('Watch links must start with https://.')
  return url.toString()
}

export function normalizeWeeklyGoals(input: unknown): WeeklyContractDefinition[] {
  if (!Array.isArray(input) || input.length === 0) {
    throw new SiteContentError('Add at least one weekly goal, or restore the built-in goals.')
  }
  if (input.length > MAX_GOALS) {
    throw new SiteContentError(`Keep the weekly goals to ${MAX_GOALS} or fewer.`)
  }
  const used = new Set<string>()
  return input.map((raw, index) => {
    if (!raw || typeof raw !== 'object') throw new SiteContentError('One of the weekly goals is incomplete.')
    const row = raw as Partial<WeeklyContractDefinition> & { minNewGuardians?: number }
    const title = clip(row.title, 80)
    const description = clip(row.description, 280)
    if (!title) throw new SiteContentError(`Goal ${index + 1} needs a title.`)
    if (!description) throw new SiteContentError(`“${title}” needs a short description.`)
    const tierPoints = Number(row.tierPoints)
    if (!Number.isInteger(tierPoints) || tierPoints < 0 || tierPoints > 100) {
      throw new SiteContentError(`“${title}” needs whole tier points from 0 to 100.`)
    }
    const rule = row.rule
    let nextRule: WeeklyContractDefinition['rule']
    if (rule?.kind === 'featured_dungeon_new_guardians') {
      const min = Number(rule.minNewGuardians)
      if (!Number.isInteger(min) || min < 1 || min > 5) {
        throw new SiteContentError(`“${title}” needs 1 to 5 new Guardians.`)
      }
      nextRule = { kind: 'featured_dungeon_new_guardians', minNewGuardians: min }
    } else if (rule?.kind === 'raid_mixed_clan' || rule?.kind === 'help_first_timer') {
      nextRule = { kind: rule.kind }
    } else {
      throw new SiteContentError(`“${title}” needs a goal type.`)
    }
    const base =
      clip(row.id, 48).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '') ||
      title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) ||
      'goal'
    let id = base
    let n = 2
    while (used.has(id)) {
      id = `${base}-${n}`
      n += 1
    }
    used.add(id)
    const contract: WeeklyContractDefinition = { id, title, description, tierPoints, rule: nextRule }
    if (!isWeeklyContractDefinition(contract)) throw new SiteContentError(`“${title}” could not be saved.`)
    return contract
  })
}

export function normalizeEvents(input: unknown): NightOpsEvent[] {
  if (!Array.isArray(input)) throw new SiteContentError('The event list could not be read.')
  if (input.length > MAX_EVENTS) throw new SiteContentError(`Keep events to ${MAX_EVENTS} or fewer.`)
  const used = new Set<string>()
  return input.map((raw, index) => {
    if (!raw || typeof raw !== 'object') throw new SiteContentError('One of the events is incomplete.')
    const row = raw as Partial<NightOpsEvent>
    const title = clip(row.title, 80)
    const hostName = clip(row.hostName, 60)
    if (!title) throw new SiteContentError(`Event ${index + 1} needs a title.`)
    if (!hostName) throw new SiteContentError(`“${title}” needs a host.`)
    const startsAt = clip(row.startsAt, 40)
    const endsAt = clip(row.endsAt, 40)
    const start = Date.parse(startsAt)
    const end = Date.parse(endsAt)
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      throw new SiteContentError(`“${title}” needs a start and an end.`)
    }
    if (end < start) throw new SiteContentError(`“${title}” must end after it starts.`)
    const idBase = clip(row.id, 48).replace(/[^a-zA-Z0-9-]+/g, '') || `event-${index + 1}`
    let id = idBase
    let n = 2
    while (used.has(id)) {
      id = `${idBase}-${n}`
      n += 1
    }
    used.add(id)
    const event: NightOpsEvent = {
      id,
      title,
      hostName,
      startsAt: new Date(start).toISOString(),
      endsAt: new Date(end).toISOString(),
      activityName: clip(row.activityName, 80) || undefined,
      notes: clip(row.notes, 240) || undefined,
      twitchUrl: row.twitchUrl ? httpsUrl(clip(row.twitchUrl, 300)) : undefined,
      kickUrl: row.kickUrl ? httpsUrl(clip(row.kickUrl, 300)) : undefined,
    }
    if (!isNightOpsEvent(event)) throw new SiteContentError(`“${title}” could not be saved.`)
    return event
  })
}

export function normalizePrizeCopy(input: unknown): PrizeCopy {
  const row = input && typeof input === 'object' ? (input as Partial<PrizeCopy>) : {}
  const physicalPrize = clip(row.physicalPrize, 160)
  const giftCardPrize = clip(row.giftCardPrize, 160)
  const cardLabel = clip(row.cardLabel, 80)
  const firstPlace = clip(row.firstPlace, 160)
  if (!physicalPrize || !giftCardPrize || !cardLabel || !firstPlace) {
    throw new SiteContentError('Fill in the print prize, the gift card, the board label, and the first-place prize.')
  }
  return { physicalPrize, giftCardPrize, cardLabel, firstPlace }
}

function emptyRecord(): SiteContentRecord {
  return {
    contracts: null,
    events: [],
    eventsCustomized: false,
    prizesEnabled: null,
    prizeCopy: null,
  }
}

export async function readSiteContent(): Promise<SiteContentRecord | null> {
  if (!process.env.MONGODB_URI?.trim()) return null
  try {
    const client = await clientPromise
    const doc = await client.db(getMongoDbName()).collection(DESTINY_COLLECTIONS.siteContent).findOne({ _id: DOC_ID })
    if (!doc) return null
    const contracts = Array.isArray(doc.contracts) && doc.contracts.every(isWeeklyContractDefinition) ? doc.contracts : null
    const events = Array.isArray(doc.events) ? doc.events.filter(isNightOpsEvent) : []
    const prizeCopy =
      doc.prizeCopy && typeof doc.prizeCopy === 'object'
        ? {
            physicalPrize: clip(doc.prizeCopy.physicalPrize, 160) || DEFAULT_PRIZE_COPY.physicalPrize,
            giftCardPrize: clip(doc.prizeCopy.giftCardPrize, 160) || DEFAULT_PRIZE_COPY.giftCardPrize,
            cardLabel: clip(doc.prizeCopy.cardLabel, 80) || DEFAULT_PRIZE_COPY.cardLabel,
            firstPlace: clip(doc.prizeCopy.firstPlace, 160) || DEFAULT_PRIZE_COPY.firstPlace,
          }
        : null
    return {
      contracts,
      events,
      eventsCustomized: Boolean(doc.eventsCustomized),
      prizesEnabled: typeof doc.prizesEnabled === 'boolean' ? doc.prizesEnabled : null,
      prizeCopy,
      updatedAt: typeof doc.updatedAt === 'string' ? doc.updatedAt : undefined,
    }
  } catch (error) {
    console.warn('[site-content] read failed', error)
    return null
  }
}

async function writeSiteContent(patch: Partial<SiteContentRecord>): Promise<SiteContentRecord> {
  if (!process.env.MONGODB_URI?.trim()) {
    throw new SiteContentError('The database is not connected, so this could not be saved.')
  }
  const current = (await readSiteContent()) ?? emptyRecord()
  const next: SiteContentRecord = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  }
  const client = await clientPromise
  await client
    .db(getMongoDbName())
    .collection(DESTINY_COLLECTIONS.siteContent)
    .updateOne({ _id: DOC_ID }, { $set: { ...next } }, { upsert: true })
  return next
}

export async function loadWeeklyGoals(): Promise<WeeklyContractDefinition[]> {
  const saved = (await readSiteContent())?.contracts
  if (saved?.length) return resolveWeeklyContractCatalog(saved)
  return resolveWeeklyContractCatalog()
}

export async function loadNightOpsEvents(): Promise<NightOpsEvent[]> {
  const saved = await readSiteContent()
  if (saved?.eventsCustomized) return resolveNightOpsCatalog(saved.events)
  return resolveNightOpsCatalog()
}

export async function resolvePrizesEnabled(): Promise<boolean> {
  const saved = await readSiteContent()
  if (typeof saved?.prizesEnabled === 'boolean') return saved.prizesEnabled
  return seasonPrizesEnabled()
}

export async function loadPrizeCopy(): Promise<PrizeCopy> {
  const saved = await readSiteContent()
  return saved?.prizeCopy ?? DEFAULT_PRIZE_COPY
}

export async function saveWeeklyGoals(input: unknown): Promise<WeeklyContractDefinition[]> {
  const contracts = normalizeWeeklyGoals(input)
  await writeSiteContent({ contracts })
  return contracts
}

export async function resetWeeklyGoals(): Promise<WeeklyContractDefinition[]> {
  await writeSiteContent({ contracts: null })
  return DEFAULT_WEEKLY_CONTRACTS
}

export async function saveEvents(input: unknown): Promise<NightOpsEvent[]> {
  const events = normalizeEvents(input)
  await writeSiteContent({ events, eventsCustomized: true })
  return events
}

export async function savePrizeSettings(input: { prizesEnabled?: unknown; prizeCopy?: unknown }): Promise<{
  prizesEnabled: boolean
  prizeCopy: PrizeCopy
}> {
  const prizesEnabled = input.prizesEnabled === true
  const prizeCopy = normalizePrizeCopy(input.prizeCopy)
  await writeSiteContent({ prizesEnabled, prizeCopy })
  try {
    const season = await getSeasonData()
    const place = (bucket: { first: string; second: string; thirdToFifth: string; participation: string }) => ({
      ...bucket,
      first: prizeCopy.firstPlace,
    })
    await saveSeasonData({
      ...season,
      prizeRulesEdited: true,
      prizeRules: {
        raid: place(DEFAULT_SEASON_PRIZE_RULES.raid),
        dungeon: place(DEFAULT_SEASON_PRIZE_RULES.dungeon),
        newBonds: place(DEFAULT_SEASON_PRIZE_RULES.newBonds!),
      },
    })
  } catch (error) {
    console.warn('[site-content] prize names saved; season row was not updated', error)
  }
  return { prizesEnabled, prizeCopy }
}

export function publicPrizeView(copy: PrizeCopy, prizesEnabled: boolean) {
  return {
    prizesEnabled,
    physicalPrize: copy.physicalPrize,
    giftCardPrize: copy.giftCardPrize,
    cardLabel: copy.cardLabel,
    firstPlace: copy.firstPlace,
  }
}
