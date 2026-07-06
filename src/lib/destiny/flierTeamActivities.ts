import { ACTIVITY_CATALOG } from '@/lib/destiny/activityCatalog'
import { getWeeklyResetState } from '@/lib/destiny/weeklyRotation'

export type FlierTeamActivityKind = 'raid' | 'dungeon' | 'pantheon'

export interface FlierTeamEncounter {
  id: string
  name: string
}

export interface FlierTeamActivityOption {
  id: string
  name: string
  kind: FlierTeamActivityKind
  maxPlayers: number
  encounters: FlierTeamEncounter[]
}

const RAID_NAMES = [
  'Garden of Salvation',
  "King's Fall",
  'Root of Nightmares',
  'Deep Stone Crypt',
  'Vault of Glass',
  'Vow of the Disciple',
  'Last Wish',
  "Crota's End",
  "Salvation's Edge",
  'Crown of Sorrow',
]

const DUNGEON_NAMES = [
  'Spire of the Watcher',
  'Pit of Heresy',
  'Ghosts of the Deep',
  'Duality',
  'Shattered Throne',
  "Warlord's Ruin",
  'Grasp of Avarice',
  'Prophecy',
  "Vesper's Host",
  'Sundered Doctrine',
]

const RAID_ENCOUNTERS: Record<string, FlierTeamEncounter[]> = {
  'garden of salvation': [
    { id: 'full', name: 'Full raid' },
    { id: 'acquisition', name: 'Acquisition' },
    { id: 'consecrated', name: 'Consecrated Mind' },
    { id: 'sanctified', name: 'Sanctified Mind' },
    { id: 'final', name: 'Garden final' },
  ],
  "king's fall": [
    { id: 'full', name: 'Full raid' },
    { id: 'infusion', name: 'Infusion' },
    { id: 'warpriest', name: 'Warpriest' },
    { id: 'golgoroth', name: 'Golgoroth' },
    { id: 'daughters', name: 'Daughters' },
    { id: 'oryx', name: 'Oryx' },
  ],
  'root of nightmares': [
    { id: 'full', name: 'Full raid' },
    { id: 'cataclysm', name: 'Cataclysm' },
    { id: 'macrocosm', name: 'Macrocosm' },
    { id: 'nezerac', name: 'Nezarec' },
  ],
  'deep stone crypt': [
    { id: 'full', name: 'Full raid' },
    { id: 'crypt-security', name: 'Crypt Security' },
    { id: 'atraks', name: 'Atraks-1' },
    { id: 'descent', name: 'Descent' },
    { id: 'taniks', name: 'Taniks' },
  ],
  'vault of glass': [
    { id: 'full', name: 'Full raid' },
    { id: 'conflux', name: 'Conflux' },
    { id: 'oracles', name: 'Oracles' },
    { id: 'templar', name: 'Templar' },
    { id: 'gorgons', name: 'Gorgons' },
    { id: 'atheon', name: 'Atheon' },
  ],
  'vow of the disciple': [
    { id: 'full', name: 'Full raid' },
    { id: 'acquisition', name: 'Acquisition' },
    { id: 'collection', name: 'Collection' },
    { id: 'caretaker', name: 'Caretaker' },
    { id: 'exhibition', name: 'Exhibition' },
    { id: 'rhulk', name: 'Rhulk' },
  ],
  'last wish': [
    { id: 'full', name: 'Full raid' },
    { id: 'kalli', name: 'Kalli' },
    { id: 'shuro-chi', name: 'Shuro Chi' },
    { id: 'morgeth', name: 'Morgeth' },
    { id: 'vault', name: 'Vault' },
    { id: 'rivens', name: "Riven's Heart" },
  ],
  "crota's end": [
    { id: 'full', name: 'Full raid' },
    { id: 'abyss', name: 'Abyss' },
    { id: 'bridge', name: 'Bridge' },
    { id: 'ir-yut', name: 'Ir Yût' },
    { id: 'crota', name: 'Crota' },
  ],
  "salvation's edge": [
    { id: 'full', name: 'Full raid' },
    { id: 'submerged', name: 'Submerged' },
    { id: 'refracted', name: 'Refracted' },
    { id: 'final', name: 'Final stand' },
  ],
  'crown of sorrow': [
    { id: 'full', name: 'Full raid' },
    { id: 'arm-piercing', name: 'Arm Piercing' },
    { id: 'gahlran', name: 'Gahlran' },
    { id: 'deception', name: 'Deception' },
    { id: 'crown', name: 'Crown final' },
  ],
}

const DUNGEON_ENCOUNTERS: Record<string, FlierTeamEncounter[]> = {
  'spire of the watcher': [
    { id: 'full', name: 'Full dungeon' },
    { id: 'traverse', name: 'Traverse' },
    { id: 'persys', name: 'Persys' },
    { id: 'final', name: 'Final boss' },
  ],
  'pit of heresy': [
    { id: 'full', name: 'Full dungeon' },
    { id: 'bone-orchard', name: 'Bone Orchard' },
    { id: 'cradle', name: 'Cradle' },
    { id: 'final', name: 'Final boss' },
  ],
  'ghosts of the deep': [
    { id: 'full', name: 'Full dungeon' },
    { id: 'deep', name: 'Deep descent' },
    { id: 'final', name: 'Final boss' },
  ],
  duality: [
    { id: 'full', name: 'Full dungeon' },
    { id: 'bell', name: 'Bell encounters' },
    { id: 'caiatl', name: 'Caiatl' },
  ],
  'shattered throne': [
    { id: 'full', name: 'Full dungeon' },
    { id: 'ascendant', name: 'Ascendant plane' },
    { id: 'final', name: 'Final boss' },
  ],
  "warlord's ruin": [
    { id: 'full', name: 'Full dungeon' },
    { id: 'traverse', name: 'Traverse' },
    { id: 'final', name: 'Final boss' },
  ],
  'grasp of avarice': [
    { id: 'full', name: 'Full dungeon' },
    { id: 'loot', name: 'Loot cave' },
    { id: 'final', name: 'Final boss' },
  ],
  prophecy: [
    { id: 'full', name: 'Full dungeon' },
    { id: 'spheres', name: 'Sphere encounters' },
    { id: 'final', name: 'Final boss' },
  ],
  "vesper's host": [
    { id: 'full', name: 'Full dungeon' },
    { id: 'traverse', name: 'Traverse' },
    { id: 'final', name: 'Final boss' },
  ],
  'sundered doctrine': [
    { id: 'full', name: 'Full dungeon' },
    { id: 'traverse', name: 'Traverse' },
    { id: 'final', name: 'Final boss' },
  ],
}

const PANTHEON_ENCOUNTERS: FlierTeamEncounter[] = [
  { id: 'full', name: 'Full Pantheon run' },
  { id: 'oryx', name: 'Oryx' },
  { id: 'atheon', name: 'Atheon' },
  { id: 'rhulk', name: 'Rhulk' },
  { id: 'gahlran', name: 'Gahlran' },
  { id: 'consecrated', name: 'Consecrated Mind' },
  { id: 'warpriest', name: 'Warpriest' },
  { id: 'taniks', name: 'Taniks' },
  { id: 'rivens', name: "Riven's Heart" },
  { id: 'weekly', name: 'Weekly featured boss' },
]

function normalizeKey(name: string): string {
  return name.trim().toLowerCase()
}

function defaultEncounters(kind: FlierTeamActivityKind): FlierTeamEncounter[] {
  if (kind === 'pantheon') return PANTHEON_ENCOUNTERS
  return [
    { id: 'full', name: kind === 'raid' ? 'Full raid' : 'Full dungeon' },
    { id: 'checkpoint', name: 'Checkpoint run' },
    { id: 'final', name: 'Final encounter' },
  ]
}

function encountersFor(name: string, kind: FlierTeamActivityKind): FlierTeamEncounter[] {
  const key = normalizeKey(name)
  if (kind === 'raid') return RAID_ENCOUNTERS[key] ?? defaultEncounters('raid')
  if (kind === 'dungeon') return DUNGEON_ENCOUNTERS[key] ?? defaultEncounters('dungeon')
  return PANTHEON_ENCOUNTERS
}

function catalogHas(name: string): boolean {
  return Boolean(ACTIVITY_CATALOG[normalizeKey(name)])
}

export function flierTeamActivitiesForKind(kind: FlierTeamActivityKind): FlierTeamActivityOption[] {
  const names =
    kind === 'raid'
      ? RAID_NAMES.filter(catalogHas)
      : kind === 'dungeon'
        ? DUNGEON_NAMES.filter(catalogHas)
        : ['Pantheon']

  const weekly = getWeeklyResetState()
  const featured =
    kind === 'raid'
      ? weekly.featuredRaids.map((r) => r.name)
      : kind === 'dungeon'
        ? weekly.featuredDungeons.map((d) => d.name)
        : weekly.pantheon
          ? [weekly.pantheon]
          : []

  const ordered = Array.from(new Set([...featured, ...names]))

  return ordered.map((name) => ({
    id: normalizeKey(name).replace(/\s+/g, '-'),
    name,
    kind,
    maxPlayers: kind === 'raid' ? 6 : 3,
    encounters: encountersFor(name, kind),
  }))
}

export function flierTeamActivityById(
  kind: FlierTeamActivityKind,
  activityId: string
): FlierTeamActivityOption | undefined {
  return flierTeamActivitiesForKind(kind).find((a) => a.id === activityId)
}

export function flierTeamEncounterLabel(
  kind: FlierTeamActivityKind,
  activityName: string,
  encounterId?: string
): string | undefined {
  if (!encounterId) return undefined
  const encounter = encountersFor(activityName, kind).find((e) => e.id === encounterId)
  return encounter?.name
}
