import type { CommunityBuildPublic } from '@/lib/destiny/communityBuildModel'
import type { BuildSnapshot } from '@/lib/destiny/types'

export interface LoadoutSide {
  id: string
  title: string
  source: 'shared' | 'equipped'
  ownerName: string
  likes?: number
  characterClass: string
  subclass: string
  exoticArmor: string
  exoticWeapon: string
  aspects: string
  fragments: string
  mods: string
  statFocus: string
  tags: string
  weapons: string
}

export const COMPARE_PIN_KEY = 'topnest-compare-side'

export function readPinnedLoadout(): LoadoutSide | null {
  if (typeof window === 'undefined') return null
  const raw = window.sessionStorage.getItem(COMPARE_PIN_KEY)
  if (!raw) return null
  window.sessionStorage.removeItem(COMPARE_PIN_KEY)
  try {
    const side = JSON.parse(raw) as Partial<LoadoutSide>
    if (!side || (side.source !== 'shared' && side.source !== 'equipped') || !side.title || !side.id) return null
    return {
      id: side.id,
      title: side.title,
      source: side.source,
      ownerName: side.ownerName || 'Guardian',
      likes: typeof side.likes === 'number' ? side.likes : undefined,
      characterClass: side.characterClass || '—',
      subclass: side.subclass || '—',
      exoticArmor: side.exoticArmor || '—',
      exoticWeapon: side.exoticWeapon || '—',
      aspects: side.aspects || '—',
      fragments: side.fragments || '—',
      mods: side.mods || '—',
      statFocus: side.statFocus || '—',
      tags: side.tags || '—',
      weapons: side.weapons || '—',
    }
  } catch {
    return null
  }
}

export function pinLoadoutForCompare(side: LoadoutSide) {
  window.sessionStorage.setItem(COMPARE_PIN_KEY, JSON.stringify(side))
}

export interface CompareRow {
  label: string
  left: string
  right: string
  same: boolean
}

function list(values: string[] | undefined): string {
  const cleaned = (values ?? []).map((value) => value.trim()).filter(Boolean)
  return cleaned.length ? cleaned.join(', ') : '—'
}

export function loadoutSideFromCommunityBuild(build: CommunityBuildPublic): LoadoutSide {
  return {
    id: build.id,
    title: build.name,
    source: 'shared',
    ownerName: build.ownerDisplayName,
    likes: build.upvoteCount,
    characterClass: build.characterClass,
    subclass: build.subclass || '—',
    exoticArmor: build.exoticArmor || '—',
    exoticWeapon: build.exoticWeapon || '—',
    aspects: list(build.aspects.map((plug) => plug.name)),
    fragments: list(build.fragments.map((plug) => plug.name)),
    mods: list(build.mods.map((plug) => plug.name)),
    statFocus: list(build.statFocus),
    tags: list(build.activityTags),
    weapons: '—',
  }
}

export function loadoutSideFromSnapshot(snapshot: BuildSnapshot, ownerName: string): LoadoutSide {
  const exoticWeapon =
    snapshot.exoticWeapon ||
    [snapshot.kineticWeapon, snapshot.energyWeapon, snapshot.powerWeapon].find((name) =>
      name.toLowerCase().includes('exotic')
    ) ||
    '—'
  return {
    id: snapshot.id || `equipped-${snapshot.characterClass}`,
    title: `${snapshot.subclass} ${snapshot.characterClass}`.trim(),
    source: 'equipped',
    ownerName,
    characterClass: snapshot.characterClass,
    subclass: snapshot.subclass || '—',
    exoticArmor: snapshot.exoticArmor || '—',
    exoticWeapon,
    aspects: list(snapshot.aspects),
    fragments: list(snapshot.fragments),
    mods: list(snapshot.armorMods),
    statFocus: '—',
    tags: snapshot.activityName || '—',
    weapons: list([snapshot.kineticWeapon, snapshot.energyWeapon, snapshot.powerWeapon]),
  }
}

const FIELDS: { key: keyof LoadoutSide; label: string }[] = [
  { key: 'characterClass', label: 'Class' },
  { key: 'subclass', label: 'Subclass' },
  { key: 'exoticArmor', label: 'Exotic armor' },
  { key: 'exoticWeapon', label: 'Exotic weapon' },
  { key: 'weapons', label: 'Weapons' },
  { key: 'aspects', label: 'Aspects' },
  { key: 'fragments', label: 'Fragments' },
  { key: 'mods', label: 'Mods' },
  { key: 'statFocus', label: 'Stat focus' },
  { key: 'tags', label: 'Activity' },
]

/** Side-by-side rows. Matching values are marked so the table can quiet them. */
export function compareLoadoutSides(left: LoadoutSide, right: LoadoutSide): CompareRow[] {
  return FIELDS.map((field) => {
    const leftValue = String(left[field.key] || '—')
    const rightValue = String(right[field.key] || '—')
    return {
      label: field.label,
      left: leftValue,
      right: rightValue,
      same: leftValue.trim().toLowerCase() === rightValue.trim().toLowerCase(),
    }
  })
}
