/** DestinyTopNest domain types — Mongo + API shapes. */

import type { ManifestEntityType } from '@/lib/destiny/itemsCatalog'
import type { FlierTeamRequirementSelection } from '@/lib/destiny/flierTeamRequirements'

export type DestinyPlatform = 'steam' | 'xbox' | 'playstation' | 'epic' | 'stadia'
export type DestinyCharacterClass = 'titan' | 'hunter' | 'warlock'
export type ArmorSlotLabel = 'helmet' | 'gauntlets' | 'chest' | 'legs' | 'class'

export interface ArmorPiece {
  slot: ArmorSlotLabel
  name: string
  ref?: DestinyIconRef
  mods?: DestinyIconRef[]
  isExotic?: boolean
  itemHash?: number
  equipableItemSetHash?: number
}

/** Active armor set bonus tiers (2-piece / 4-piece) for a loadout. */
export interface ArmorSetBonusGroup {
  setName: string
  pieceCount: number
  setRef?: DestinyIconRef
  bonuses: Array<{
    requiredCount: number
    name: string
    description?: string
    active: boolean
    perkRef?: DestinyIconRef
  }>
}
export type ActivityType = 'raid' | 'dungeon' | 'pantheon'
export type VerificationStatus = 'verified' | 'pending' | 'flagged' | 'rejected'
export type LegitimacyStatus = 'clean' | 'warning' | 'suspicious' | 'highly_suspicious'
export type LeaderboardCategory = 'raid' | 'dungeon' | 'new_bonds'
export type LeaderboardPeriod = 'weekly' | 'monthly' | 'season' | 'all_time'
export type Difficulty = 'normal' | 'master'
export type FireteamGoal =
  | 'fresh_run'
  | 'checkpoint_run'
  | 'teaching_run'
  | 'farming_run'
  | 'triumph_run'
  | 'catalyst_run'
  | 'chill_clear'
  | 'competitive_scoring'
export type FireteamStatus = 'open' | 'full' | 'in_progress' | 'closed'

export type FlierTeamJoinMode = 'instant' | 'apply'

export type FlierTeamActivityKind = 'raid' | 'dungeon' | 'pantheon'

export interface FlierTeamLobbyMember {
  userId: string
  displayName: string
  bungieMembershipId?: string
  destinyMembershipType?: number
  emblemUrl?: string
  characterClass?: DestinyCharacterClass
  powerLevel?: number
  guardianRank?: number
  joinedAt: string
}

export interface FlierTeamApplication {
  userId: string
  displayName: string
  emblemUrl?: string
  message?: string
  appliedAt: string
}

export const PROFILE_FLEX_STAT_IDS = [
  'guardian_rank',
  'power_level',
  'bungie_fastest_raid',
  'bungie_fastest_dungeon',
  'bungie_raid_clears',
  'bungie_dungeon_clears',
  'bungie_kills',
  'bungie_time_played',
  'raid_points',
  'dungeon_points',
  'verified_clears',
  'fastest_clear',
  'reputation',
  'season_rank',
] as const

export type ProfileFlexStatId = (typeof PROFILE_FLEX_STAT_IDS)[number]

export interface ProfileFlexStat {
  id: ProfileFlexStatId
  label: string
  value: string
  detail?: string
}
export type DestinyTopNestTab =
  | 'overview'
  | 'leaderboards'
  | 'fireteam'
  | 'profile'
  | 'loadouts'
  | 'builds'
  | 'clans'
  | 'season'
  | 'admin'
  | 'contracts'
  | 'sherpas'
  | 'events'
  | 'guardians'
  | 'compare'
  | 'lookup'
  | 'quests'

export interface DestinyIconRef {
  name: string
  hash?: number
  iconUrl?: string
  tierLabel?: string
  entityType?: ManifestEntityType
}

export interface FeaturedActivity {
  name: string
  difficulty: Difficulty
  hash?: number
  iconUrl?: string
  resetsIn?: string
}

export interface WeeklyResetInfo {
  resetAt: string
  nextResetAt: string
  weekLabel: string
  resetsInLabel: string
  resetsInMs: number
  featuredRaids: FeaturedActivity[]
  featuredDungeons: FeaturedActivity[]
  pantheon?: string
  pantheonIconUrl?: string
  resetTimeLabel: string
  /** `bungie` or `web` when both featured pairs came from a live source. `schedule` is the calendar. */
  rotationSource?: 'bungie' | 'web' | 'mixed' | 'schedule'
  /** Grandmaster nightfall for this reset, when a live source named one. */
  nightfall?: string
  /** Server-resolved loot icons for featured activities, keyed by activity name. */
  lootByActivity?: Record<string, WeeklyActivityLootSnapshot>
}

/** Pre-resolved loot intel for a featured activity during a weekly reset. */
export interface WeeklyActivityLootSnapshot {
  tagline?: string
  armorSet: { name: string; note?: string; iconItem: string }
  armorSetIconRef?: DestinyIconRef
  drops: WeeklyActivityLootDrop[]
}

export interface WeeklyActivityLootDrop {
  name: string
  kind: 'exotic' | 'catalyst' | 'legendary'
  note?: string
  iconRef: DestinyIconRef
}

export interface ResolvedEmblem {
  itemHash?: number
  name: string
  iconUrl?: string
  backgroundUrl?: string
  color?: string
  source: 'equipped' | 'collection'
  characterId?: string
}

export type EmblemOption = ResolvedEmblem

export interface DestinyUser {
  userId: string
  bungieMembershipId: string
  bungieDisplayName: string
  platform: DestinyPlatform
  clanId?: string
  clanName?: string
  clanTag?: string
  emblemUrl?: string
  bannerUrl?: string
  emblemBackgroundUrl?: string
  characterThumbnailUrl?: string
  emblemColor?: string
  activeCharacterId?: string
  guardianRank?: number
  powerLevel?: number
  characterClass?: DestinyCharacterClass
  connectedAt?: string
  /**
   * `pending` marks a lightweight unclaimed placeholder. Those records must not
   * appear on leaderboards. Real sign-ins stay `active` or unset.
   */
  accountStatus?: 'active' | 'pending'
  profileFlexStats?: ProfileFlexStatId[]
  bungieStats?: GuardianBungieStats
  /** Bungie membership type enum (1=xbox, 2=ps, 3=steam, 6=epic) for API calls */
  destinyMembershipType?: number
  /** equipped = live character emblem; collection = displayEmblemHash from inventory */
  displayEmblemSource?: 'equipped' | 'collection'
  displayEmblemHash?: number
}

export interface GuardianBungieStats {
  fastestRaidSeconds?: number
  fastestRaidName?: string
  fastestDungeonSeconds?: number
  fastestDungeonName?: string
  raidClears?: number
  dungeonClears?: number
  totalKills?: number
  totalDeaths?: number
  timePlayedMinutes?: number
  updatedAt?: string
}

export interface RunTeamMember {
  membershipId: string
  displayName: string
  platform: DestinyPlatform
  characterClass: DestinyCharacterClass
  clanId?: string
  clanName?: string
  kills: number
  deaths: number
  assists: number
  score: number
  powerLevel: number
  /** PGCR `completed` flag for this player (undefined on legacy rows). */
  completed?: boolean
  timePlayedSeconds?: number
  fireteamId?: string
}

export interface AiReview {
  legitimacyStatus: LegitimacyStatus
  suspiciousScore: number
  reasons: string[]
  recommendation: 'approve' | 'manual_review' | 'reject'
  summary?: string
}

export interface RunRecord {
  id: string
  pgcrId: string
  activityId: number
  activityName: string
  type: ActivityType
  difficulty: Difficulty
  completedAt: string
  durationSeconds: number
  completed: boolean
  checkpointLikely: boolean
  teamMembers: RunTeamMember[]
  clanMemberCount: number
  randoCount: number
  isFullClanTeam: boolean
  suspiciousScore: number
  verificationStatus: VerificationStatus
  aiReview?: AiReview
  adminNotes?: string
  pointsAwarded: number
  activityRef?: DestinyIconRef
  ownerUserId?: string
  ownerDisplayName?: string
  /** Pantheon fireteam fingerprint (sorted membership ids). */
  squadKey?: string
  /**
   * Staff chose "approve" on this run, so it counts as a full clear for Passport
   * and weekly contracts even when the PGCR looks like a checkpoint start.
   * `checkpoint_non_scoring` leaves this false.
   */
  staffApprovedFullClear?: boolean
  /** New Bonds: points from first-time / growing teammate bonds (part of pointsAwarded). */
  bondPoints?: number
  newBondMembershipIds?: string[]
  /** Owner's Destiny membership id at ingest time. */
  ownerMembershipId?: string
}

export interface LeaderboardEntry {
  userId: string
  bungieDisplayName: string
  emblemUrl?: string
  clanTag?: string
  platform: DestinyPlatform
  guardianRank?: number
  powerLevel?: number
  category: LeaderboardCategory
  seasonId: string
  period: LeaderboardPeriod
  points: number
  verifiedClears: number
  rank: number
  fastestClearSeconds?: number
  fastestActivityName?: string
  fastestActivityRef?: DestinyIconRef
  reputationScore?: number
  reputationReviewCount?: number
  /** Pantheon squad board — number of guardians in the fireteam. */
  squadSize?: number
  isSquadEntry?: boolean
  /** Set when staff manual adjustment affects this row. */
  hasManualAdjustment?: boolean
}

export interface LeaderboardAdjustment {
  id: string
  /** Site user id for an individual leaderboard row. */
  entryKey: string
  displayName?: string
  category: LeaderboardCategory
  period: LeaderboardPeriod
  seasonId: string
  pointsDelta?: number
  pointsOverride?: number
  verifiedClearsDelta?: number
  verifiedClearsOverride?: number
  excluded?: boolean
  notes?: string
  adjustedBy: string
  createdAt: string
  updatedAt: string
}

export interface FireteamLobby {
  id: string
  hostUserId: string
  hostDisplayName: string
  hostEmblemUrl?: string
  hostClass?: DestinyCharacterClass
  hostPowerLevel?: number
  hostGuardianRank?: number
  activityType: ActivityType | 'master_raid' | 'master_dungeon' | 'weekly_featured'
  activityName: string
  goal: FireteamGoal
  tags: string[]
  platform: DestinyPlatform | 'crossplay'
  micRequired: boolean
  scoringEligible: boolean
  maxPlayers: number
  currentPlayers: number
  status: FireteamStatus
  preferredRole?: string
  createdAt: string
  activityRef?: DestinyIconRef
  hostClassRef?: DestinyIconRef
  /** Site users in this lobby (excluding host). */
  memberUserIds?: string[]
  pendingInvites?: FireteamLobbyInvite[]
  /** FlierTeam Finder fields */
  joinMode?: FlierTeamJoinMode
  activityKind?: FlierTeamActivityKind
  encounterId?: string
  encounterName?: string
  requirementSelections?: FlierTeamRequirementSelection[]
  customRequirements?: string
  roomNotes?: string
  memberRoster?: FlierTeamLobbyMember[]
  pendingApplications?: FlierTeamApplication[]
  updatedAt?: string
}

export interface FireteamLobbyInvite {
  membershipId: string
  membershipType?: number
  displayName: string
  invitedByUserId: string
  invitedAt: string
}

export interface ActiveFireteamLobbySummary {
  id: string
  activityName: string
  hostDisplayName: string
  isHost: boolean
}

export interface OnlineSocialMember {
  displayName: string
  bungieName?: string
  membershipId: string
  membershipType?: number
  emblemUrl?: string
  isOnline: boolean
  inDestiny?: boolean
  /** Live D2 activity from Bungie CharacterActivities, when profile is visible. */
  currentActivity?: string
}

/** Clan members or friends detected playing together right now. */
export interface SocialFriendGroup {
  id: string
  label: string
  source: 'topnest_lobby' | 'bungie_fireteam' | 'clan_friends'
  activityName?: string
  members: OnlineSocialMember[]
}

export interface SocialPresencePayload {
  onlineClanMembers: OnlineSocialMember[]
  onlineFriends: OnlineSocialMember[]
  activeLobby: ActiveFireteamLobbySummary | null
  /** Open Bungie.net fireteam listing for in-game platform invites, when available. */
  bungieFireteamId?: string | null
  friendGroups?: SocialFriendGroup[]
}

export interface ReputationReview {
  id: string
  reviewerId: string
  reviewedUserId: string
  runId?: string
  communication: number
  reliability: number
  mechanics: number
  friendly: number
  teaching: number
  punctual: number
  wouldPlayAgain: boolean
  notes?: string
  createdAt: string
}

/** Trust Rank commend — private Knowledge + Vibes vote for fireteam randos. */
export type VibesLabel = 'quiet' | 'loud' | 'good' | 'ego' | 'sherpa'

export interface TrustReview {
  id: string
  reviewerId: string
  /** Set when the reviewed player is linked on Top Nest. */
  reviewedUserId?: string
  reviewedMembershipId: string
  runId: string
  /** 1 = knew nothing · 5 = knew the entire run */
  knowledge: 1 | 2 | 3 | 4 | 5
  /** Categorical vibes label (legacy rows may store 1–3 numbers). */
  vibes: VibesLabel | 1 | 2 | 3
  /** Derived 1–5 score from knowledge + vibes combo */
  compositeScore?: number
  createdAt: string
}

/** Public aggregate — reviewers' individual votes are never shown to the reviewed player. */
export interface TrustRankSummary {
  compositeAvg: number
  topNestTitle: string
  reviewCount: number
}

export interface UnrankedRunTeammate {
  membershipId: string
  displayName: string
  characterClass?: DestinyCharacterClass
  siteUserId?: string
  isSelf: boolean
  canReview: boolean
  alreadyReviewed: boolean
}

export interface UnrankedRun {
  runId: string
  activityName: string
  activityRef?: DestinyIconRef
  type: ActivityType
  completedAt: string
  durationSeconds: number
  teammates: UnrankedRunTeammate[]
  pendingReviewCount: number
}

export interface BuildSnapshot {
  id: string
  runId: string
  userId: string
  characterClass: DestinyCharacterClass
  subclass: string
  super: string
  aspects: string[]
  fragments: string[]
  abilities: string[]
  exoticArmor: string
  exoticWeapon?: string
  /** Full equipped armor — helmet through legs. */
  armorPieces?: ArmorPiece[]
  /** Resolved 2-piece / 4-piece set bonuses from equipped legendary armor. */
  armorSetBonuses?: ArmorSetBonusGroup[]
  kineticWeapon: string
  energyWeapon: string
  powerWeapon: string
  armorMods: string[]
  artifactPerks: string[]
  stats: Record<string, number>
  activityId: number
  activityName: string
  difficulty: Difficulty
  completedAt: string
  durationSeconds: number
  deaths: number
  fireteamComposition: string
  classRef?: DestinyIconRef
  subclassRef?: DestinyIconRef
  exoticArmorRef?: DestinyIconRef
  exoticWeaponRef?: DestinyIconRef
  kineticWeaponRef?: DestinyIconRef
  energyWeaponRef?: DestinyIconRef
  powerWeaponRef?: DestinyIconRef
  kineticWeaponPerks?: DestinyIconRef[]
  energyWeaponPerks?: DestinyIconRef[]
  powerWeaponPerks?: DestinyIconRef[]
  aspectRefs?: DestinyIconRef[]
  fragmentRefs?: DestinyIconRef[]
  superRef?: DestinyIconRef
  classAbilityRef?: DestinyIconRef
  jumpRef?: DestinyIconRef
  meleeRef?: DestinyIconRef
  grenadeRef?: DestinyIconRef
  armorModRefs?: DestinyIconRef[]
  /** In-game saved loadout label from Bungie. */
  loadoutName?: string
  loadoutIndex?: number
  loadoutSource?: 'equipped' | 'saved' | 'meta'
  /** Bungie loadout color icon (in-game slot diamond). */
  loadoutColorRef?: DestinyIconRef
  /** True when gear could not be fully resolved from Bungie. */
  loadoutIncomplete?: boolean
  /** Empty core slots (subclass, weapons, armor). */
  missingLoadoutSlots?: number
  /** Internal aggregation key (Phase 4). */
  buildSignature?: string
  verificationStatus?: VerificationStatus
}

export interface SeasonPrizeRules {
  raid: { first: string; second: string; thirdToFifth: string; participation: string }
  dungeon: { first: string; second: string; thirdToFifth: string; participation: string }
  newBonds?: { first: string; second: string; thirdToFifth: string; participation: string }
}

/** mvp = one crown per voter per run. kudos = optional, one per other participant. */
export type MvpVoteCategory = 'mvp' | 'kudos'

/**
 * Fireteam commend stored by the target's Bungie membership id from the PGCR.
 * `selectedUserId` is filled once that guardian has a Top Nest account.
 * Legacy rows omit `category` and count as the run MVP. Sherpa credit uses MVP only.
 */
export interface MvpVote {
  id: string
  runId: string
  voterId: string
  voterMembershipId?: string
  /** Missing on legacy rows, which count as the run MVP. */
  category?: MvpVoteCategory
  /** Site user id once the target has claimed a Top Nest account. */
  selectedUserId?: string
  /** Canonical recipient — Bungie membership id from the post-game carnage report. */
  selectedMembershipId: string
  selectedDisplayName: string
  createdAt: string
  updatedAt?: string
}

export interface ActivityRunGuardian {
  membershipId: string
  displayName: string
  characterClass?: DestinyCharacterClass
  siteUserId?: string
  isSelf: boolean
  /** Any other guardian on this activity's carnage report. */
  canVoteFor: boolean
  /** Viewer already sent kudos to this guardian for the run. */
  kudosGiven: boolean
  /** Can receive a private Knowledge + Vibes rank (any fireteam member except self). */
  canReview: boolean
  alreadyReviewed: boolean
}

export interface ActivityRunForVote {
  runId: string
  activityName: string
  activityRef?: DestinyIconRef
  type: ActivityType
  completedAt: string
  durationSeconds: number
  pointsAwarded: number
  verificationStatus: VerificationStatus
  userHasVoted: boolean
  selectedUserId?: string
  /** Bungie membership id of the crowned guardian. */
  selectedMembershipId?: string
  selectedDisplayName?: string
  /** Membership ids that already received kudos from the viewer on this run. */
  kudosMembershipIds: string[]
  /** Teammates still needing a Knowledge + Vibes rank from the viewer. */
  pendingTrustCount: number
  guardians: ActivityRunGuardian[]
}

export interface SeasonWinner {
  category: LeaderboardCategory
  rank: number
  userId?: string
  displayName: string
  clanTag?: string
  prize: string
  seasonId: string
  emblemUrl?: string
}

export interface PrizeClaim {
  id: string
  userId: string
  seasonId: string
  category: LeaderboardCategory
  rank: number
  prize: string
  platform: DestinyPlatform
  contact: string
  status: 'pending' | 'fulfilled' | 'rejected'
  createdAt: string
  updatedAt?: string
  adminNotes?: string
}

export interface Season {
  id: string
  name: string
  /** Short theme line from the Nest season catalog. */
  tagline?: string
  seasonNumber?: number
  startDate: string
  endDate: string
  status: 'active' | 'upcoming' | 'archived'
  prizeRules: SeasonPrizeRules
  winners?: SeasonWinner[]
  /** Owner/admin edits applied on top of the generated quarterly catalog. */
  adminOverride?: { name?: string; tagline?: string; startDate?: string; endDate?: string }
}

export interface AdminReviewRecord {
  id: string
  runId: string
  suspiciousScore: number
  aiSummary: string
  status: 'pending' | 'approved' | 'rejected'
  adminId?: string
  decision?: 'approve' | 'reject' | 'override_points' | 'checkpoint_non_scoring'
  notes?: string
  reviewedAt?: string
  run?: RunRecord
}

export type AdminActivityKind =
  | 'run_flagged'
  | 'run_review'
  | 'user_ban'
  | 'user_unban'
  | 'user_note'
  | 'staff_grant'
  | 'staff_revoke'
  | 'prize_claim'
  | 'season_finalize'
  | 'leaderboard_adjust'
  | 'loot_icons_rebuild'
  | 'meta_builds_sync'
  | 'fireteam_room_delete'
  | 'fireteam_rooms_clear'
  | 'community_build_moderate'

export interface AdminActivityEntry {
  id: string
  kind: AdminActivityKind
  actorId: string
  actorLabel?: string
  targetUserId?: string
  targetLabel?: string
  summary: string
  detail?: string
  metadata?: Record<string, string | number | boolean>
  createdAt: string
}

export interface AdminUserSummary {
  userId: string
  bungieDisplayName: string
  platform?: DestinyPlatform
  clanTag?: string
  connectedAt?: string
  isBanned: boolean
  siteRole?: string
  verifiedRunCount: number
  flaggedRunCount: number
}

export interface AdminStaffMember {
  userId: string
  bungieDisplayName: string
  role: 'owner' | 'admin'
  isPrimaryOwner: boolean
  updatedAt?: string
}

export interface AdminUserDetail extends AdminUserSummary {
  bungieMembershipId?: string
  emblemUrl?: string
  powerLevel?: number
  recentRuns: RunRecord[]
  reputationReviews: ReputationReview[]
  trustReviews: TrustReview[]
  mvpVotesReceived: number
  kudosReceived: number
  adminNotes: AdminActivityEntry[]
  /** Full app profile (Guardian tab) — populated on detail fetch. */
  profile?: PlayerProfile | null
  bungieLinked?: boolean
}

/** One guardian slot — DIM-style horizontal character tile data. */
export interface CharacterSummary {
  characterId: string
  characterClass: DestinyCharacterClass
  powerLevel: number
  emblemUrl?: string
  emblemBackgroundUrl?: string
  emblemColor?: string
  classRef?: DestinyIconRef
  /** Equipped title / seal name when available from Bungie. */
  title?: string
}

export interface PlayerProfile extends DestinyUser {
  raidPoints: number
  dungeonPoints: number
  /** Retired Pantheon board score. Always 0; historical runs stay on the profile activity list. */
  pantheonPoints: number
  /** Retired Commander / Top Guardians score. Always 0. */
  guardianPoints: number
  /** @deprecated Kept for legacy profile reads */
  fullClanPoints?: number
  verifiedClears: number
  /** MVP crowns received, including votes cast before this account existed. */
  mvpVotesReceived: number
  /** Optional per-run kudos received. Not used for sherpa points. */
  kudosReceived: number
  reputationScore: number
  badges: string[]
  favoriteActivities: string[]
  favoriteTeammates: string[]
  recentRuns: RunRecord[]
  topCompletions: { activityName: string; durationSeconds: number; completedAt: string }[]
  prizeEligibility: string
  currentLoadout?: BuildSnapshot
  classRef?: DestinyIconRef
  /** All characters on the linked account (DIM-style tile row). */
  characters?: CharacterSummary[]
  flexStats?: ProfileFlexStat[]
  bungieStats?: GuardianBungieStats
  trustRank?: TrustRankSummary
  displayEmblem?: ResolvedEmblem
  displayEmblemSource?: 'equipped' | 'collection'
  /** Verified full-clear stamps and teammate collection. Omitted on summary profiles. */
  passport?: PassportProfile
  /** Current week's contracts plus season-tier progress. Omitted on summary profiles. */
  weeklyContracts?: WeeklyContractsSnapshot
  sherpa?: SherpaBoard
  clanWars?: ClanWarsBoard
  nightOps?: NightOpsBoard
  chemistry?: ChemistryBoard
}

/** Non-monetary profile frame earned from season tier points. */
export type PassportFrameId = 'recruit' | 'bronze' | 'silver' | 'gold' | 'prismatic'

export interface PassportActivityBadge {
  activityKey: string
  activityId: number
  activityName: string
  activityType: ActivityType
  clearCount: number
  firstStampedAt: string
  latestStampedAt: string
  badgeLabel: string
}

export interface PassportStamp {
  runId: string
  pgcrId: string
  activityName: string
  activityType: ActivityType
  completedAt: string
  /** Always 1 for a stamp-eligible full clear. */
  clearStamp: number
  /** Teammates the player had never cleared with before this run. */
  newGuardianStamps: number
  /** Repeat teammates contribute a smaller credit (see REPEAT_TEAMMATE_STAMP_WEIGHT). */
  repeatTeammateCredit: number
  stampTotal: number
  newGuardianNames: string[]
}

export interface PassportTitle {
  id: string
  title: string
  earned: boolean
}

export interface PassportProfile {
  clearStamps: number
  newGuardianStamps: number
  repeatTeammateCredit: number
  totalStamps: number
  distinctTeammates: number
  displayTitle: string
  titles: PassportTitle[]
  activities: PassportActivityBadge[]
  recentStamps: PassportStamp[]
}

export type WeeklyContractRule =
  | { kind: 'featured_dungeon_new_guardians'; minNewGuardians: number }
  | { kind: 'raid_mixed_clan' }
  | { kind: 'help_first_timer' }

export interface WeeklyContractDefinition {
  id: string
  title: string
  description: string
  /** Season tier points awarded once per Destiny weekly reset when verified. */
  tierPoints: number
  rule: WeeklyContractRule
}

export interface WeeklyContractProgress {
  id: string
  title: string
  description: string
  tierPoints: number
  completed: boolean
  progressLabel: string
  evidenceRunId?: string
  evidenceActivityName?: string
}

export interface SeasonTierStatus {
  tier: number
  title: string
  frame: PassportFrameId
  points: number
  nextTierPoints: number | null
  pointsToNext: number | null
}

export interface WeeklyContractsSnapshot {
  weekStart: string
  weekEnd: string
  weekLabel: string
  resetsInLabel: string
  contracts: WeeklyContractProgress[]
  weekTierPoints: number
  seasonTierPoints: number
  seasonTier: SeasonTierStatus
  /** False when stored clear history was capped, so first-timer contracts stay open. */
  historyComplete: boolean
}

export interface SherpaCredit {
  runId: string
  activityName: string
  completedAt: string
  sherpaMembershipId: string
  sherpaDisplayName: string
  learnerMembershipId: string
  learnerDisplayName: string
  learnerMvp: boolean
  points: number
}

export interface SherpaStanding {
  membershipId: string
  displayName: string
  guidedClears: number
  learnerMvps: number
  points: number
  rank: number
  title: string
}

export interface SherpaBoard {
  guidedClears: number
  learnerMvps: number
  points: number
  rank: number | null
  title: string
  recentCredits: SherpaCredit[]
  hallOfFame: SherpaStanding[]
  historyComplete: boolean
}

export interface ClanWarStanding {
  clanId: string
  clanName: string
  weeklyPoints: number
  seasonPoints: number
  verifiedClears: number
  recruitBonuses: number
  division: string
  rank: number
}

export interface ClanWarsBoard {
  weekLabel: string
  standings: ClanWarStanding[]
  viewerClan: ClanWarStanding | null
  historyComplete: boolean
}

export interface NightOpsEvent {
  id: string
  title: string
  hostName: string
  startsAt: string
  endsAt: string
  activityName?: string
  clanId?: string
  kickUrl?: string
  twitchUrl?: string
  notes?: string
}

export interface NightOpsCard {
  event: NightOpsEvent
  status: 'upcoming' | 'live' | 'ended'
  attended: boolean
  badgeLabel: string | null
  evidenceRunId?: string
}

export interface NightOpsBoard {
  events: NightOpsCard[]
  badges: string[]
}

export interface ChemistrySquad {
  squadKey: string
  memberNames: string[]
  runsTogether: number
  clears: number
  clearRate: number
  averageClearSeconds: number | null
  bestClearSeconds: number | null
}

export interface TeammateSuggestion {
  membershipId: string
  displayName: string
  runsTogether: number
  clearsTogether: number
  clearRate: number
  averageClearSeconds: number | null
  reason: string
}

export interface ChemistryBoard {
  squads: ChemistrySquad[]
  suggestions: TeammateSuggestion[]
}

export interface BuildIntelligenceCard {
  id: string
  buildName: string
  activityName: string
  activityId?: number
  characterClass: DestinyCharacterClass
  subclass: string
  exoticArmor: string
  exoticWeapon?: string
  weapons: string[]
  keyStats: Record<string, number>
  averageClearSeconds: number
  usageRatePercent: number
  successRatePercent: number
  deathRatePercent: number
  topTeamName: string
  fireteamType: 'solo_friendly' | 'clan' | 'mixed'
  role: 'dps' | 'support' | 'balanced'
  classRef?: DestinyIconRef
  subclassRef?: DestinyIconRef
  exoticArmorRef?: DestinyIconRef
  exoticWeaponRef?: DestinyIconRef
  weaponRefs?: DestinyIconRef[]
  activityRef?: DestinyIconRef
}

export interface ExternalBuildSource {
  id: string
  title: string
  source: string
  /** Canonical site id for attribution */
  sourceSite?: 'blueberries.gg' | 'light.gg' | 'togame.io' | 'builders.gg' | 'd2foundry' | 'top-nest'
  sourceUrl: string
  class: DestinyCharacterClass
  subclass: string
  exoticArmor?: string
  exoticWeapon?: string
  weapons?: string[]
  /** Legendary armor pieces (helmet, gauntlets, chest, legs) when known. */
  legendaryArmor?: Partial<Record<ArmorSlotLabel, string>>
  aspects?: string[]
  fragments?: string[]
  /** Armor 3.0 stat priorities from source research (e.g. Health, Class, Grenade). */
  statPriorities?: string[]
  armorMods?: string[]
  armorModRefs?: DestinyIconRef[]
  activityFocus?: string
  excelsIn?: string
  summary?: string
  publishedAt?: string
  lastChecked: string
  approved: boolean
  /** Where this build belongs in suggestion lists — activity/specialist builds are excluded from default picks. */
  suggestionScope?: 'general' | 'activity' | 'specialist'
  /** Lower = higher priority within a class (1 = top general pick). */
  suggestionRank?: number
  /** Stable cross-site identity for consensus scoring (class:subclass:exotic-slug). */
  consensusKey?: string
  /** Rank on the citing site’s list (1 = #1 on that site). */
  sourceRank?: number
  /** How many distinct build sites list this consensus identity. */
  consensusSiteCount?: number
  classRef?: DestinyIconRef
  subclassRef?: DestinyIconRef
  exoticArmorRef?: DestinyIconRef
  exoticWeaponRef?: DestinyIconRef
  weaponRefs?: DestinyIconRef[]
  legendaryArmorRefs?: Partial<Record<ArmorSlotLabel, DestinyIconRef>>
  aspectRefs?: DestinyIconRef[]
  fragmentRefs?: DestinyIconRef[]
  activityRef?: DestinyIconRef
  aiScore?: number
  aiScoreLabel?: string
  /** True when produced by recommendedBuildOptimizer (not raw meta research). */
  optimized?: boolean
  optimizationNotes?: string[]
  verifiedCrossRef?: {
    activityName: string
    usageRatePercent: number
    successRatePercent: number
  }
}

export interface ClanProfile {
  id: string
  name: string
  tag: string
  emblemUrl?: string
  memberCount: number
  points: number
  fullClanClears: number
  recruitmentOpen: boolean
  avgRaidClearSeconds: number
  avgDungeonClearSeconds: number
  topMembers: {
    membershipId: string
    displayName: string
    bungieName?: string
    points: number
    emblemUrl?: string
    isOnline?: boolean
  }[]
  achievements: string[]
  /** Clan members currently online (populated from live Bungie data). */
  onlineMembers?: OnlineSocialMember[]
}

export interface OverviewPayload {
  raidTop10: LeaderboardEntry[]
  dungeonTop10: LeaderboardEntry[]
  recentRuns: RunRecord[]
  featuredRaid: FeaturedActivity
  featuredDungeon: FeaturedActivity
  weeklyReset: WeeklyResetInfo
  season: Season
  seasonCountdown: { days: number; hours: number; label: string }
  prizeSummary: string
  lookingForGroup: FireteamLobby[]
  /** Cross-site meta builds trending this research window. */
  trendingBuilds: ExternalBuildSource[]
  /** Top meta loadouts per class from external build-site consensus. */
  topLoadoutsByClass: Record<'titan' | 'hunter' | 'warlock', ExternalBuildSource[]>
  /** Top PGCR loadouts per class — unmodified from verified app data. */
  topVerifiedLoadoutsByClass: Record<'titan' | 'hunter' | 'warlock', BuildIntelligenceCard[]>
  bungieApiConfigured: boolean
  hallOfFamePreview: SeasonWinner[]
  pendingRunActions?: PendingRunActions | null
}

export interface PendingRunActions {
  mvpRunCount: number
  trustReviewCount: number
  pendingCount: number
}

export interface LeaderboardFilters {
  period: LeaderboardPeriod
  category: LeaderboardCategory
  activity?: string
  difficulty?: Difficulty
  clanOnly?: boolean
  randoFriendly?: boolean
  platform?: DestinyPlatform
  characterClass?: DestinyCharacterClass
}
