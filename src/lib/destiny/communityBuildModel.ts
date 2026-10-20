/**
 * Player-shared builds: plain-text sanitizing, input rules, and list filters.
 * Safe to import from client components — no Mongo or Bungie calls.
 */

import { ARMOR_STAT_ORDER, type ArmorStatKey } from '@/lib/destiny/armorStats'
import type { ArmorSlotLabel, BuildSnapshot, DestinyCharacterClass, DestinyIconRef } from '@/lib/destiny/types'

export const COMMUNITY_ACTIVITY_TAGS = [
  'raid',
  'dungeon',
  'gm',
  'nightfall',
  'pvp',
  'trials',
  'gambit',
  'pantheon',
  'general',
] as const

export type CommunityActivityTag = (typeof COMMUNITY_ACTIVITY_TAGS)[number]

export const COMMUNITY_ACTIVITY_TAG_OPTIONS: { id: CommunityActivityTag; label: string }[] = [
  { id: 'raid', label: 'Raid' },
  { id: 'dungeon', label: 'Dungeon' },
  { id: 'gm', label: 'Grandmaster' },
  { id: 'nightfall', label: 'Nightfall' },
  { id: 'pvp', label: 'PvP' },
  { id: 'trials', label: 'Trials' },
  { id: 'gambit', label: 'Gambit' },
  { id: 'pantheon', label: 'Pantheon' },
  { id: 'general', label: 'General' },
]

export const COMMUNITY_BUILD_SORTS = ['new', 'top', 'saved'] as const
export type CommunityBuildSort = (typeof COMMUNITY_BUILD_SORTS)[number]

export const COMMUNITY_BUILD_STATUSES = ['published', 'hidden', 'removed'] as const
export type CommunityBuildStatus = (typeof COMMUNITY_BUILD_STATUSES)[number]

export const COMMUNITY_CLASSES: DestinyCharacterClass[] = ['titan', 'hunter', 'warlock']

export interface CommunityBuildPlug {
  name: string
  hash?: number
  iconUrl?: string
}

export interface CommunityBuildContent {
  name: string
  characterClass: DestinyCharacterClass
  subclass: string
  subclassRef?: DestinyIconRef
  aspects: CommunityBuildPlug[]
  fragments: CommunityBuildPlug[]
  exoticArmor: string
  exoticArmorRef?: DestinyIconRef
  exoticWeapon: string
  exoticWeaponRef?: DestinyIconRef
  mods: CommunityBuildPlug[]
  statFocus: ArmorStatKey[]
  activityTags: CommunityActivityTag[]
  description: string
  source: 'manual' | 'equipped'
}

export interface CommunityBuildDraft extends CommunityBuildContent {
  characterId?: string
}

export interface CommunityBuildRecord extends CommunityBuildContent {
  id: string
  ownerUserId: string
  ownerDisplayName: string
  ownerEmblemUrl?: string
  status: CommunityBuildStatus
  moderationNote?: string
  upvoteCount: number
  saveCount: number
  commentCount: number
  createdAt: string
  updatedAt: string
  /** `featured` is a curated guide. Missing means a player post. */
  listing?: 'player' | 'featured'
  creditName?: string
  creditUrl?: string
  seedVersion?: string
  featuredRank?: number
}

export interface CommunityBuildPublic extends CommunityBuildContent {
  id: string
  ownerDisplayName: string
  ownerEmblemUrl?: string
  status: CommunityBuildStatus
  moderationNote?: string
  upvoteCount: number
  saveCount: number
  commentCount: number
  createdAt: string
  updatedAt: string
  canEdit: boolean
  canModerate: boolean
  viewerUpvoted: boolean
  viewerSaved: boolean
  listing: 'player' | 'featured'
  creditName?: string
  creditUrl?: string
}

export interface CommunityBuildCommentPublic {
  id: string
  authorDisplayName: string
  body: string
  createdAt: string
  status: 'visible' | 'hidden'
  viewerOwns: boolean
}

export interface CommunityBuildListQuery {
  q?: string
  characterClass?: DestinyCharacterClass
  tag?: CommunityActivityTag
  stat?: ArmorStatKey
  subclass?: string
  sort: CommunityBuildSort
  limit: number
  offset: number
  scope: 'public' | 'mine' | 'saved'
}

const NAME_MIN = 3
const NAME_MAX = 60
const SUBCLASS_MAX = 48
const EXOTIC_MAX = 80
const DESCRIPTION_MAX = 2000
const PLUG_NAME_MAX = 64
const ASPECT_MAX = 3
const FRAGMENT_MAX = 6
/** Five armor pieces can hold several mods each, plus artifact plugs. */
const MOD_MAX = 30
const TAG_MAX = 4
const STAT_MAX = 3
const SEARCH_MAX = 80

const BLANK_GEAR = new Set([
  '',
  '—',
  '-',
  '–',
  'unknown',
  'subclass',
  'none',
  'n/a',
  'na',
])

export function isBlankGearName(value: string | undefined | null): boolean {
  const text = (value ?? '').trim().toLowerCase()
  if (!text || BLANK_GEAR.has(text)) return true
  return text.startsWith('unknown ')
}

/**
 * Empty sockets and cosmetic plugs that Bungie returns on a live loadout.
 * Real armor mods, aspects, and fragments stay.
 */
export function isIgnoredLoadoutSocketName(value: string | undefined | null): boolean {
  const text = (value ?? '').trim().toLowerCase()
  if (!text || isBlankGearName(text)) return true
  if (/^(empty|default|none|no|hidden|locked|classified)\b/.test(text)) return true
  if (/\b(shader|ornament|tracker|masterwork|intrinsic|emote|projection)\b/.test(text)) return true
  if (/mod socket|empty socket|weapon mod/.test(text)) return true
  if (
    /^(armor mod|combat style mod|general armor mod|legendary armor mod|enhanced armor mod|activity mod|raid mod|ghost mod)$/.test(
      text
    )
  ) {
    return true
  }
  return false
}

const ARMOR_SLOT_LABEL: Record<ArmorSlotLabel, string> = {
  helmet: 'Helmet',
  gauntlets: 'Gauntlets',
  chest: 'Chest',
  legs: 'Legs',
  class: 'Class item',
}

export function communityActivityTagLabel(tag: CommunityActivityTag): string {
  return COMMUNITY_ACTIVITY_TAG_OPTIONS.find((option) => option.id === tag)?.label ?? tag
}

export function communityClassLabel(characterClass: DestinyCharacterClass): string {
  if (characterClass === 'titan') return 'Titan'
  if (characterClass === 'hunter') return 'Hunter'
  return 'Warlock'
}

export function isCommunityActivityTag(value: string): value is CommunityActivityTag {
  return (COMMUNITY_ACTIVITY_TAGS as readonly string[]).includes(value)
}

export function isArmorStatKey(value: string): value is ArmorStatKey {
  return ARMOR_STAT_ORDER.some((stat) => stat.key === value)
}

export function isCommunityBuildId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

/** Strip tags, control characters, and unsafe whitespace. Does not enforce length. */
export function sanitizePlainText(value: unknown, options?: { multiline?: boolean; maxScan?: number }): string {
  if (typeof value !== 'string') return ''
  const maxScan = options?.maxScan ?? 8000
  let text = value.slice(0, maxScan)
  text = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
  text = text.replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF]/g, '')

  for (let pass = 0; pass < 3; pass += 1) {
    const decoded = decodeBasicEntities(text)
    const stripped = decoded.replace(/<[^>]*>/g, '')
    if (stripped === text) {
      text = stripped
      break
    }
    text = stripped
  }

  text = text.replace(/[<>]/g, '')

  if (options?.multiline) {
    text = text
      .replace(/\r\n?/g, '\n')
      .split('\n')
      .map((line) => line.replace(/[ \t]+/g, ' ').trim())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  } else {
    text = text.replace(/\s+/g, ' ').trim()
  }

  return text
}

function decodeBasicEntities(value: string): string {
  return value
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&amp;/gi, '&')
}

export function sanitizeIconUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const raw = value.trim()
  if (!raw || raw.length > 400) return undefined
  if (raw.startsWith('/common/') || raw.startsWith('/img/')) {
    if (raw.includes('..') || raw.includes('\\') || raw.includes('?') || raw.includes('#')) return undefined
    return raw
  }
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:') return undefined
    if (url.hostname !== 'www.bungie.net' && url.hostname !== 'bungie.net') return undefined
    if (url.username || url.password) return undefined
    return url.toString()
  } catch {
    return undefined
  }
}

function sanitizeHash(value: unknown): number | undefined {
  const numeric =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && /^\d{1,12}$/.test(value.trim())
        ? Number(value.trim())
        : NaN
  if (!Number.isSafeInteger(numeric) || numeric <= 0) return undefined
  return numeric
}

function iconRef(name: string, source: unknown): DestinyIconRef | undefined {
  if (!source || typeof source !== 'object') return undefined
  const record = source as Record<string, unknown>
  const refName = sanitizePlainText(record.name)
  if (!refName || refName.toLowerCase() !== name.toLowerCase()) return undefined
  const iconUrl = sanitizeIconUrl(record.iconUrl)
  const hash = sanitizeHash(record.hash)
  const ref: DestinyIconRef = { name }
  if (hash) ref.hash = hash
  if (iconUrl) ref.iconUrl = iconUrl
  return ref
}

function sanitizePlugs(
  value: unknown,
  label: string,
  max: number
): { ok: true; plugs: CommunityBuildPlug[] } | { ok: false; error: string } {
  if (value == null) return { ok: true, plugs: [] }
  if (!Array.isArray(value)) return { ok: false, error: `${label} must be a list.` }
  if (value.length > max) return { ok: false, error: `${label} can include at most ${max} entries.` }

  const plugs: CommunityBuildPlug[] = []
  for (const entry of value) {
    const rawName =
      typeof entry === 'string' ? entry : entry && typeof entry === 'object' ? (entry as { name?: unknown }).name : ''
    const name = sanitizePlainText(rawName)
    if (!name || isBlankGearName(name)) continue
    if (name.length > PLUG_NAME_MAX) {
      return { ok: false, error: `${label} names must be ${PLUG_NAME_MAX} characters or fewer.` }
    }
    const plug: CommunityBuildPlug = { name }
    if (entry && typeof entry === 'object') {
      const hash = sanitizeHash((entry as { hash?: unknown }).hash)
      const iconUrl = sanitizeIconUrl((entry as { iconUrl?: unknown }).iconUrl)
      if (hash) plug.hash = hash
      if (iconUrl) plug.iconUrl = iconUrl
    }
    plugs.push(plug)
  }
  return { ok: true, plugs }
}

function unique<T extends string>(values: T[]): T[] {
  return Array.from(new Set(values))
}

export function validateCommunityBuildInput(
  body: unknown
): { ok: true; value: CommunityBuildContent } | { ok: false; error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'Build details must be an object.' }
  }
  const record = body as Record<string, unknown>

  const name = sanitizePlainText(record.name)
  if (name.length < NAME_MIN || name.length > NAME_MAX) {
    return { ok: false, error: `Name must be ${NAME_MIN}–${NAME_MAX} characters.` }
  }

  const characterClass = sanitizePlainText(record.characterClass).toLowerCase()
  if (!COMMUNITY_CLASSES.includes(characterClass as DestinyCharacterClass)) {
    return { ok: false, error: 'Class must be Titan, Hunter, or Warlock.' }
  }

  const subclass = sanitizePlainText(record.subclass)
  if (subclass.length < 2 || subclass.length > SUBCLASS_MAX || isBlankGearName(subclass)) {
    return { ok: false, error: `Subclass must be 2–${SUBCLASS_MAX} characters.` }
  }

  const exoticArmor = sanitizePlainText(record.exoticArmor)
  const exoticWeapon = sanitizePlainText(record.exoticWeapon)
  if (exoticArmor.length > EXOTIC_MAX || exoticWeapon.length > EXOTIC_MAX) {
    return { ok: false, error: `Exotic names must be ${EXOTIC_MAX} characters or fewer.` }
  }
  if (isBlankGearName(exoticArmor) && isBlankGearName(exoticWeapon)) {
    return { ok: false, error: 'Add an exotic armor piece or an exotic weapon.' }
  }

  const aspects = sanitizePlugs(record.aspects, 'Aspects', ASPECT_MAX)
  if (!aspects.ok) return aspects
  const fragments = sanitizePlugs(record.fragments, 'Fragments', FRAGMENT_MAX)
  if (!fragments.ok) return fragments
  const mods = sanitizePlugs(record.mods, 'Mods', MOD_MAX)
  if (!mods.ok) return mods

  if (!Array.isArray(record.statFocus) || record.statFocus.length === 0) {
    return { ok: false, error: 'Choose at least one stat focus.' }
  }
  if (record.statFocus.length > STAT_MAX) {
    return { ok: false, error: `Choose at most ${STAT_MAX} stat focuses.` }
  }
  const statFocus: ArmorStatKey[] = []
  for (const entry of record.statFocus) {
    const key = sanitizePlainText(entry)
    if (!isArmorStatKey(key)) return { ok: false, error: 'Stat focus must be a Destiny armor stat.' }
    statFocus.push(key)
  }

  if (!Array.isArray(record.activityTags) || record.activityTags.length === 0) {
    return { ok: false, error: 'Choose at least one activity tag.' }
  }
  if (record.activityTags.length > TAG_MAX) {
    return { ok: false, error: `Choose at most ${TAG_MAX} activity tags.` }
  }
  const activityTags: CommunityActivityTag[] = []
  for (const entry of record.activityTags) {
    const tag = sanitizePlainText(entry).toLowerCase()
    if (!isCommunityActivityTag(tag)) return { ok: false, error: 'Activity tag is not recognized.' }
    activityTags.push(tag)
  }

  const description = sanitizePlainText(record.description, { multiline: true })
  if (description.length > DESCRIPTION_MAX) {
    return { ok: false, error: `Description must be ${DESCRIPTION_MAX} characters or fewer.` }
  }

  const source = record.source === 'equipped' ? 'equipped' : 'manual'

  return {
    ok: true,
    value: {
      name,
      characterClass: characterClass as DestinyCharacterClass,
      subclass,
      subclassRef: iconRef(subclass, record.subclassRef),
      aspects: aspects.plugs,
      fragments: fragments.plugs,
      exoticArmor: isBlankGearName(exoticArmor) ? '' : exoticArmor,
      exoticArmorRef: isBlankGearName(exoticArmor) ? undefined : iconRef(exoticArmor, record.exoticArmorRef),
      exoticWeapon: isBlankGearName(exoticWeapon) ? '' : exoticWeapon,
      exoticWeaponRef: isBlankGearName(exoticWeapon) ? undefined : iconRef(exoticWeapon, record.exoticWeaponRef),
      mods: mods.plugs,
      statFocus: unique(statFocus),
      activityTags: unique(activityTags),
      description,
      source,
    },
  }
}

export function validateCommunityBuildComment(
  body: unknown
): { ok: true; text: string } | { ok: false; error: string } {
  const record = body && typeof body === 'object' && !Array.isArray(body) ? (body as { body?: unknown }) : null
  const text = sanitizePlainText(record?.body ?? body, { multiline: true })
  if (!text) return { ok: false, error: 'Comment cannot be empty.' }
  if (text.length > 500) return { ok: false, error: 'Comments must be 500 characters or fewer.' }
  return { ok: true, text }
}

export function validateModerationNote(value: unknown): string {
  return sanitizePlainText(value).slice(0, 200)
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function parseCommunityBuildListQuery(
  params: URLSearchParams
): { ok: true; query: CommunityBuildListQuery } | { ok: false; error: string } {
  const qRaw = sanitizePlainText(params.get('q') ?? '')
  if (qRaw.length > SEARCH_MAX) {
    return { ok: false, error: `Search must be ${SEARCH_MAX} characters or fewer.` }
  }

  const classRaw = sanitizePlainText(params.get('class') ?? '').toLowerCase()
  let characterClass: DestinyCharacterClass | undefined
  if (classRaw && classRaw !== 'all') {
    if (!COMMUNITY_CLASSES.includes(classRaw as DestinyCharacterClass)) {
      return { ok: false, error: 'Class filter is not recognized.' }
    }
    characterClass = classRaw as DestinyCharacterClass
  }

  const tagRaw = sanitizePlainText(params.get('tag') ?? '').toLowerCase()
  let tag: CommunityActivityTag | undefined
  if (tagRaw && tagRaw !== 'all') {
    if (!isCommunityActivityTag(tagRaw)) return { ok: false, error: 'Activity filter is not recognized.' }
    tag = tagRaw
  }

  const statRaw = sanitizePlainText(params.get('stat') ?? '')
  let stat: ArmorStatKey | undefined
  if (statRaw && statRaw.toLowerCase() !== 'all') {
    if (!isArmorStatKey(statRaw)) return { ok: false, error: 'Stat filter is not recognized.' }
    stat = statRaw
  }

  const subclassRaw = sanitizePlainText(params.get('subclass') ?? '')
  if (subclassRaw.length > SUBCLASS_MAX) {
    return { ok: false, error: `Subclass filter must be ${SUBCLASS_MAX} characters or fewer.` }
  }
  const subclass = subclassRaw && subclassRaw.toLowerCase() !== 'all' ? subclassRaw : undefined

  const sortRaw = sanitizePlainText(params.get('sort') ?? 'new').toLowerCase()
  if (!(COMMUNITY_BUILD_SORTS as readonly string[]).includes(sortRaw)) {
    return { ok: false, error: 'Sort must be new, top, or saved.' }
  }

  const scopeRaw = sanitizePlainText(params.get('scope') ?? 'public').toLowerCase()
  if (scopeRaw !== 'public' && scopeRaw !== 'mine' && scopeRaw !== 'saved') {
    return { ok: false, error: 'Scope must be public, mine, or saved.' }
  }

  const limit = clampInt(params.get('limit'), 12, 1, 24)
  const offset = clampInt(params.get('offset'), 0, 0, 500)

  return {
    ok: true,
    query: {
      q: qRaw || undefined,
      characterClass,
      tag,
      stat,
      subclass,
      sort: sortRaw as CommunityBuildSort,
      limit,
      offset,
      scope: scopeRaw,
    },
  }
}

function clampInt(value: string | null, fallback: number, min: number, max: number): number {
  if (!value || !/^\d+$/.test(value)) return fallback
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, parsed))
}

/** Mongo filter for a community-build listing. Saved scope still needs the viewer's saved ids. */
export function communityBuildListFilter(
  query: CommunityBuildListQuery,
  options: { ownerUserId?: string; savedIds?: string[] }
): Record<string, unknown> {
  const filter: Record<string, unknown> = {}

  if (query.scope === 'mine') {
    filter.ownerUserId = options.ownerUserId ?? '__none__'
  } else if (query.scope === 'saved') {
    filter.status = 'published'
    filter.id = { $in: options.savedIds ?? [] }
  } else {
    filter.status = 'published'
    filter.listing = { $ne: 'featured' }
  }

  if (query.characterClass) filter.characterClass = query.characterClass
  if (query.tag) filter.activityTags = query.tag
  if (query.stat) filter.statFocus = query.stat
  if (query.subclass) {
    filter.subclass = { $regex: `^${escapeRegExp(query.subclass)}$`, $options: 'i' }
  }

  if (query.q) {
    const pattern = escapeRegExp(query.q)
    const regex = { $regex: pattern, $options: 'i' }
    filter.$or = [
      { name: regex },
      { description: regex },
      { subclass: regex },
      { exoticArmor: regex },
      { exoticWeapon: regex },
      { 'aspects.name': regex },
      { 'fragments.name': regex },
      { 'mods.name': regex },
    ]
  }

  return filter
}

export function communityBuildSort(sort: CommunityBuildSort): Record<string, 1 | -1> {
  if (sort === 'top') return { upvoteCount: -1, createdAt: -1 }
  if (sort === 'saved') return { saveCount: -1, createdAt: -1 }
  return { createdAt: -1 }
}

export function toCommunityBuildPublic(
  build: CommunityBuildRecord,
  viewer: { userId?: string; staff?: boolean; upvoted?: boolean; saved?: boolean }
): CommunityBuildPublic {
  const featured = build.listing === 'featured'
  const owns = Boolean(viewer.userId && viewer.userId === build.ownerUserId)
  const canModerate = Boolean(viewer.staff)
  const canEdit = featured ? false : owns || canModerate
  return {
    id: build.id,
    ownerDisplayName: build.ownerDisplayName,
    ownerEmblemUrl: build.ownerEmblemUrl,
    name: build.name,
    characterClass: build.characterClass,
    subclass: build.subclass,
    subclassRef: build.subclassRef,
    aspects: build.aspects,
    fragments: build.fragments,
    exoticArmor: build.exoticArmor,
    exoticArmorRef: build.exoticArmorRef,
    exoticWeapon: build.exoticWeapon,
    exoticWeaponRef: build.exoticWeaponRef,
    mods: build.mods,
    statFocus: build.statFocus,
    activityTags: build.activityTags,
    description: build.description,
    source: build.source,
    status: build.status,
    moderationNote: canEdit ? build.moderationNote : undefined,
    upvoteCount: build.upvoteCount,
    saveCount: build.saveCount,
    commentCount: build.commentCount,
    createdAt: build.createdAt,
    updatedAt: build.updatedAt,
    canEdit,
    canModerate,
    viewerUpvoted: Boolean(viewer.upvoted),
    viewerSaved: Boolean(viewer.saved),
    listing: featured ? 'featured' : 'player',
    ...(build.creditName ? { creditName: build.creditName } : {}),
    ...(build.creditUrl ? { creditUrl: build.creditUrl } : {}),
  }
}

function plugFromRef(ref: DestinyIconRef | undefined, fallbackName?: string): CommunityBuildPlug | null {
  const name = sanitizePlainText(ref?.name ?? fallbackName ?? '')
  if (!name || isIgnoredLoadoutSocketName(name)) return null
  const trimmed = name.length > PLUG_NAME_MAX ? name.slice(0, PLUG_NAME_MAX).trim() : name
  if (!trimmed || isIgnoredLoadoutSocketName(trimmed)) return null
  const plug: CommunityBuildPlug = { name: trimmed }
  if (ref?.hash && Number.isSafeInteger(ref.hash) && ref.hash > 0) plug.hash = ref.hash
  const iconUrl = sanitizeIconUrl(ref?.iconUrl)
  if (iconUrl) plug.iconUrl = iconUrl
  return plug
}

function plugsFrom(refs: DestinyIconRef[] | undefined, names: string[] | undefined, max: number): CommunityBuildPlug[] {
  const source: CommunityBuildPlug[] = []
  const refPlugs = (refs ?? [])
    .map((ref) => plugFromRef(ref))
    .filter((plug): plug is CommunityBuildPlug => Boolean(plug))
  if (refPlugs.length) {
    source.push(...refPlugs)
  } else {
    for (const name of names ?? []) {
      const plug = plugFromRef(undefined, name)
      if (plug) source.push(plug)
    }
  }

  const seen = new Set<string>()
  const unique: CommunityBuildPlug[] = []
  for (const plug of source) {
    const key = plug.name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(plug)
    if (unique.length >= max) break
  }
  return unique
}

function labeledModName(slotLabel: string | undefined, name: string): string {
  if (!slotLabel) return name
  const labeled = `${slotLabel}: ${name}`
  return labeled.length <= PLUG_NAME_MAX ? labeled : name
}

function coversRawModName(mods: CommunityBuildPlug[], rawName: string): boolean {
  const key = rawName.toLowerCase()
  return mods.some((mod) => {
    const name = mod.name.toLowerCase()
    return name === key || name.endsWith(`: ${key}`)
  })
}

/** Armor mods grouped by piece, then artifact plugs. Junk sockets and duplicates are dropped. */
function modsFromSnapshot(build: BuildSnapshot): CommunityBuildPlug[] {
  const mods: CommunityBuildPlug[] = []
  const slotOrder = Object.keys(ARMOR_SLOT_LABEL) as ArmorSlotLabel[]
  const pieces = [...(build.armorPieces ?? [])].sort(
    (a, b) => slotOrder.indexOf(a.slot) - slotOrder.indexOf(b.slot)
  )

  const push = (raw: DestinyIconRef | string | undefined, slotLabel?: string, skipIfCovered = false) => {
    if (mods.length >= MOD_MAX) return
    const base = plugFromRef(typeof raw === 'string' ? undefined : raw, typeof raw === 'string' ? raw : raw?.name)
    if (!base) return
    if (skipIfCovered && coversRawModName(mods, base.name)) return
    const name = labeledModName(slotLabel, base.name)
    if (mods.some((mod) => mod.name.toLowerCase() === name.toLowerCase())) return
    mods.push({ ...base, name })
  }

  if (pieces.length) {
    for (const piece of pieces) {
      const slotLabel = ARMOR_SLOT_LABEL[piece.slot]
      for (const mod of piece.mods ?? []) push(mod, slotLabel)
    }
  }

  for (const perk of build.artifactPerks ?? []) push(perk, 'Artifact')

  if (!pieces.length) {
    const refs = build.armorModRefs ?? []
    if (refs.length) {
      for (const mod of refs) push(mod)
    } else {
      for (const mod of build.armorMods ?? []) push(mod)
    }
  } else {
    for (const mod of build.armorMods ?? []) push(mod, undefined, true)
  }

  return mods.slice(0, MOD_MAX)
}

function gearRef(name: string, ref: DestinyIconRef | undefined): DestinyIconRef | undefined {
  if (!name || !ref) return undefined
  return iconRef(name, ref)
}

export function statFocusFromSnapshot(stats: Record<string, number> | undefined, limit = 2): ArmorStatKey[] {
  const totals = new Map<ArmorStatKey, number>()
  for (const [raw, value] of Object.entries(stats ?? {})) {
    if (!Number.isFinite(value) || value <= 0) continue
    const match = ARMOR_STAT_ORDER.find((stat) => stat.key === raw || stat.legacyKey === raw || stat.label === raw)
    if (!match) continue
    totals.set(match.key, (totals.get(match.key) ?? 0) + value)
  }
  return Array.from(totals.entries())
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1]
      const aIndex = ARMOR_STAT_ORDER.findIndex((stat) => stat.key === a[0])
      const bIndex = ARMOR_STAT_ORDER.findIndex((stat) => stat.key === b[0])
      return aIndex - bIndex
    })
    .slice(0, limit)
    .map(([key]) => key)
}

export function inferActivityTags(activityName: string, difficulty?: string): CommunityActivityTag[] {
  const text = `${activityName} ${difficulty ?? ''}`.toLowerCase()
  if (!text.trim() || text.includes('currently equipped')) return []
  const tags: CommunityActivityTag[] = []
  if (/grandmaster|\bgm\b/.test(text)) tags.push('gm')
  else if (text.includes('nightfall')) tags.push('nightfall')
  if (text.includes('pantheon')) tags.push('pantheon')
  if (text.includes('raid')) tags.push('raid')
  if (text.includes('dungeon')) tags.push('dungeon')
  if (text.includes('trials')) tags.push('trials')
  else if (/crucible|\bpvp\b|iron banner/.test(text)) tags.push('pvp')
  if (text.includes('gambit')) tags.push('gambit')
  return tags.slice(0, TAG_MAX)
}

function fitField(value: string, max: number): string {
  return value.length > max ? value.slice(0, max).trim() : value
}

/** Map a live equipped (or saved) Bungie loadout into a share form draft. */
export function communityBuildDraftFromSnapshot(build: BuildSnapshot, characterId?: string): CommunityBuildDraft {
  const subclassRaw = isBlankGearName(build.subclass) ? '' : sanitizePlainText(build.subclass)
  const subclass = fitField(subclassRaw, SUBCLASS_MAX)
  const exoticArmor = fitField(isBlankGearName(build.exoticArmor) ? '' : sanitizePlainText(build.exoticArmor), EXOTIC_MAX)
  const exoticWeapon = fitField(
    isBlankGearName(build.exoticWeapon) ? '' : sanitizePlainText(build.exoticWeapon ?? ''),
    EXOTIC_MAX
  )
  const classLabel = communityClassLabel(build.characterClass)
  const name = subclass ? fitField(`${subclass} ${classLabel}`, NAME_MAX) : ''

  return {
    name,
    characterClass: build.characterClass,
    subclass,
    subclassRef: subclass ? gearRef(subclass, build.subclassRef) : undefined,
    aspects: plugsFrom(build.aspectRefs, build.aspects, ASPECT_MAX),
    fragments: plugsFrom(build.fragmentRefs, build.fragments, FRAGMENT_MAX),
    exoticArmor,
    exoticArmorRef: gearRef(exoticArmor, build.exoticArmorRef),
    exoticWeapon,
    exoticWeaponRef: gearRef(exoticWeapon, build.exoticWeaponRef),
    mods: modsFromSnapshot(build),
    statFocus: statFocusFromSnapshot(build.stats).slice(0, STAT_MAX),
    activityTags: inferActivityTags(build.activityName, build.difficulty).slice(0, TAG_MAX),
    description: '',
    source: 'equipped',
    characterId,
  }
}
