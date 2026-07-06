export interface FlierTeamRequirementOption {
  id: string
  label: string
}

export interface FlierTeamRequirementCategory {
  id: string
  label: string
  description?: string
  multiSelect: boolean
  options: FlierTeamRequirementOption[]
}

export interface FlierTeamRequirementSelection {
  categoryId: string
  optionIds: string[]
}

/** Destiny 2 Fireteam Finder–inspired requirement categories. */
export const FLIER_TEAM_REQUIREMENT_CATEGORIES: FlierTeamRequirementCategory[] = [
  {
    id: 'experience',
    label: 'Experience',
    description: 'How familiar the fireteam should be',
    multiSelect: false,
    options: [
      { id: 'kwtd', label: 'KWTD — Know What To Do' },
      { id: 'experienced', label: 'Experienced — cleared before' },
      { id: 'first-time-ok', label: 'First-timers welcome' },
      { id: 'speedrun', label: 'Speedrun / world-first pace' },
      { id: 'day-one', label: 'Day-one ready' },
      { id: 'master', label: 'Master difficulty ready' },
    ],
  },
  {
    id: 'playstyle',
    label: 'Playstyle',
    multiSelect: true,
    options: [
      { id: 'chill', label: 'Chill run' },
      { id: 'serious', label: 'Serious / focused' },
      { id: 'meta', label: 'Meta loadouts' },
      { id: 'off-meta', label: 'Off-meta fun' },
      { id: 'scoring', label: 'Competitive scoring' },
      { id: 'flawless', label: 'Flawless attempt' },
      { id: 'farm', label: 'Loot farm' },
      { id: 'triumph', label: 'Triumph / seal chase' },
    ],
  },
  {
    id: 'communication',
    label: 'Communication',
    multiSelect: false,
    options: [
      { id: 'mic-required', label: 'Mic required' },
      { id: 'mic-preferred', label: 'Mic preferred' },
      { id: 'no-mic', label: 'No mic OK' },
      { id: 'discord', label: 'Discord required' },
      { id: 'game-chat', label: 'In-game chat only' },
      { id: 'ping-only', label: 'Ping system only' },
    ],
  },
  {
    id: 'power',
    label: 'Power level',
    multiSelect: false,
    options: [
      { id: 'pl-2000', label: '2000+ Power' },
      { id: 'pl-2010', label: '2010+ Power' },
      { id: 'pl-2020', label: '2020+ Power' },
      { id: 'pl-2030', label: '2030+ Power' },
      { id: 'pl-2040', label: '2040+ Power' },
      { id: 'at-level', label: 'At-level only' },
      { id: 'overlevel', label: 'Over-leveled preferred' },
    ],
  },
  {
    id: 'guardian_rank',
    label: 'Guardian Rank',
    multiSelect: false,
    options: [
      { id: 'gr-any', label: 'Any GR' },
      { id: 'gr-5', label: 'GR 5+' },
      { id: 'gr-10', label: 'GR 10+' },
      { id: 'gr-15', label: 'GR 15+' },
      { id: 'gr-20', label: 'GR 20+' },
    ],
  },
  {
    id: 'roles',
    label: 'Roles needed',
    multiSelect: true,
    options: [
      { id: 'well-lock', label: 'Well Warlock' },
      { id: 'bonk-titan', label: 'Bonk Titan' },
      { id: 'banner-dps', label: 'Banner DPS Titan' },
      { id: 'starfire', label: 'Starfire Fusion Hunter' },
      { id: 'arc-hunter', label: 'Arc Hunter DPS' },
      { id: 'void-lock', label: 'Void Warlock support' },
      { id: 'solar-lock', label: 'Solar Warlock' },
      { id: 'stasis-titan', label: 'Stasis Titan' },
      { id: 'strand-hunter', label: 'Strand Hunter' },
      { id: 'flex', label: 'Flex / any class' },
    ],
  },
  {
    id: 'subclass',
    label: 'Subclass / element',
    multiSelect: true,
    options: [
      { id: 'arc', label: 'Arc' },
      { id: 'solar', label: 'Solar' },
      { id: 'void', label: 'Void' },
      { id: 'strand', label: 'Strand' },
      { id: 'stasis', label: 'Stasis' },
      { id: 'prismatic', label: 'Prismatic' },
    ],
  },
  {
    id: 'build',
    label: 'Build requirements',
    multiSelect: true,
    options: [
      { id: 'divinity', label: 'Divinity' },
      { id: 'gally', label: 'Gjallarhorn' },
      { id: 'lament', label: 'Lament' },
      { id: 'sword', label: 'Heavy sword' },
      { id: 'rocket', label: 'Cluster rocket' },
      { id: 'trace', label: 'Trace rifle' },
      { id: 'surge-match', label: 'Surge-matched elements' },
      { id: 'champion-coverage', label: 'Champion coverage' },
    ],
  },
  {
    id: 'checkpoint',
    label: 'Checkpoint',
    multiSelect: false,
    options: [
      { id: 'fresh', label: 'Fresh run only' },
      { id: 'cp-ok', label: 'Checkpoint OK' },
      { id: 'cp-required', label: 'Checkpoint required' },
      { id: 'last-boss', label: 'Last boss only' },
    ],
  },
  {
    id: 'time',
    label: 'Time commitment',
    multiSelect: false,
    options: [
      { id: 'quick', label: 'Under 45 minutes' },
      { id: 'standard', label: 'Standard clear (1–2 hrs)' },
      { id: 'long', label: 'Long session OK' },
      { id: 'multiple', label: 'Multiple attempts' },
    ],
  },
  {
    id: 'platform',
    label: 'Platform preference',
    multiSelect: true,
    options: [
      { id: 'crossplay', label: 'Crossplay OK' },
      { id: 'pc-only', label: 'PC only' },
      { id: 'console-only', label: 'Console only' },
      { id: 'same-platform', label: 'Same platform preferred' },
    ],
  },
  {
    id: 'language',
    label: 'Language',
    multiSelect: true,
    options: [
      { id: 'english', label: 'English' },
      { id: 'spanish', label: 'Spanish' },
      { id: 'french', label: 'French' },
      { id: 'german', label: 'German' },
      { id: 'portuguese', label: 'Portuguese' },
      { id: 'japanese', label: 'Japanese' },
    ],
  },
  {
    id: 'age',
    label: 'Fireteam vibe',
    multiSelect: true,
    options: [
      { id: '18-plus', label: '18+' },
      { id: 'family-friendly', label: 'Family friendly' },
      { id: 'lgbtq-friendly', label: 'LGBTQ+ friendly' },
      { id: 'sherpa', label: 'Sherpa / teaching run' },
      { id: 'lfg-newbie', label: 'New LFG players welcome' },
    ],
  },
]

export function flierTeamRequirementLabels(
  selections: FlierTeamRequirementSelection[]
): string[] {
  const labels: string[] = []
  for (const sel of selections) {
    const cat = FLIER_TEAM_REQUIREMENT_CATEGORIES.find((c) => c.id === sel.categoryId)
    if (!cat) continue
    for (const optId of sel.optionIds) {
      const opt = cat.options.find((o) => o.id === optId)
      if (opt) labels.push(opt.label)
    }
  }
  return labels
}

export function flierTeamCategoryById(id: string): FlierTeamRequirementCategory | undefined {
  return FLIER_TEAM_REQUIREMENT_CATEGORIES.find((c) => c.id === id)
}
