/**
 * Enrich DestinyTopNest API payloads with Bungie manifest icons.
 */

import type {
  BuildIntelligenceCard,
  BuildSnapshot,
  ClanProfile,
  ExternalBuildSource,
  FireteamLobby,
  LeaderboardEntry,
  OverviewPayload,
  PlayerProfile,
  RunRecord,
  WeeklyResetInfo,
} from '@/lib/destiny/types'
import type { ManifestEntityType } from '@/lib/destiny/itemsCatalog'
import {
  enrichIconRef,
  resolveActivity,
  resolveActivityRef,
  resolveByName,
  resolveClassIcon,
  resolveSubclass,
  type DestinyIconRef,
} from '@/lib/destiny/manifest'
import { activityCatalogLookup } from '@/lib/destiny/activityCatalog'
import { activityIconUrlForName } from '@/lib/destiny/activityIconPaths'
import { getWeeklyResetState } from '@/lib/destiny/weeklyRotation'

function activityIconUrl(name: string, resolved?: { iconUrl?: string }): string | undefined {
  return activityIconUrlForName(name) ?? resolved?.iconUrl
}

async function enrichPerkList(perks?: DestinyIconRef[]): Promise<DestinyIconRef[] | undefined> {
  if (!perks?.length) return perks
  return Promise.all(
    perks.map((perk) =>
      enrichIconRef(perk, perk.name, 'DestinySandboxPerkDefinition').then((r) => r ?? perk)
    )
  )
}

async function enrichOrResolve(
  ref: DestinyIconRef | undefined,
  name: string | undefined,
  preferredEntity?: ManifestEntityType
): Promise<DestinyIconRef | undefined> {
  const enriched = await enrichIconRef(ref, name, preferredEntity)
  if (enriched?.iconUrl || !name) return enriched
  return resolveByName(name, preferredEntity)
}

async function enrichBuildSnapshot(build: BuildSnapshot): Promise<BuildSnapshot> {
  const [
    classRef,
    subclassRef,
    exoticArmorRef,
    exoticWeaponRef,
    kineticRef,
    energyRef,
    powerRef,
    kineticWeaponPerks,
    energyWeaponPerks,
    powerWeaponPerks,
    aspectRefs,
    fragmentRefs,
    superRef,
    classAbilityRef,
    jumpRef,
    meleeRef,
    grenadeRef,
  ] = await Promise.all([
    enrichOrResolve(build.classRef, build.characterClass).then(
      (ref) => ref ?? resolveClassIcon(build.characterClass)
    ),
    enrichOrResolve(build.subclassRef, build.subclass).then(
      (ref) => ref ?? resolveSubclass(build.subclass)
    ),
    enrichOrResolve(build.exoticArmorRef, build.exoticArmor !== '—' ? build.exoticArmor : undefined),
    enrichOrResolve(build.exoticWeaponRef, build.exoticWeapon),
    enrichOrResolve(
      build.kineticWeaponRef,
      build.kineticWeapon !== '—' ? build.kineticWeapon : undefined
    ),
    enrichOrResolve(build.energyWeaponRef, build.energyWeapon !== '—' ? build.energyWeapon : undefined),
    enrichOrResolve(build.powerWeaponRef, build.powerWeapon !== '—' ? build.powerWeapon : undefined),
    enrichPerkList(build.kineticWeaponPerks),
    enrichPerkList(build.energyWeaponPerks),
    enrichPerkList(build.powerWeaponPerks),
    build.aspectRefs?.length
      ? Promise.all(
          build.aspectRefs.map((aspect, index) =>
            enrichOrResolve(
              aspect,
              build.aspects[index] ?? aspect.name,
              'DestinySandboxPerkDefinition'
            ).then((r) => r ?? aspect)
          )
        )
      : Promise.all(build.aspects.map((a) => resolveByName(a, 'DestinySandboxPerkDefinition'))),
    build.fragmentRefs?.length
      ? Promise.all(
          build.fragmentRefs.map((fragment, index) =>
            enrichOrResolve(
              fragment,
              build.fragments[index] ?? fragment.name,
              'DestinySandboxPerkDefinition'
            ).then((r) => r ?? fragment)
          )
        )
      : Promise.all(build.fragments.map((f) => resolveByName(f, 'DestinySandboxPerkDefinition'))),
    enrichOrResolve(build.superRef, build.super !== '—' ? build.super : undefined, 'DestinySandboxPerkDefinition'),
    enrichOrResolve(build.classAbilityRef, build.abilities[1]),
    enrichOrResolve(build.jumpRef, build.abilities[2]),
    enrichOrResolve(build.meleeRef, build.abilities[3], 'DestinySandboxPerkDefinition'),
    enrichOrResolve(build.grenadeRef, build.abilities[4]),
  ])

  return {
    ...build,
    classRef,
    subclassRef,
    exoticArmorRef,
    exoticWeaponRef,
    kineticWeaponRef: kineticRef,
    energyWeaponRef: energyRef,
    powerWeaponRef: powerRef,
    kineticWeaponPerks,
    energyWeaponPerks,
    powerWeaponPerks,
    aspectRefs,
    fragmentRefs,
    superRef,
    classAbilityRef,
    jumpRef,
    meleeRef,
    grenadeRef,
  }
}

async function enrichBuildCard(card: BuildIntelligenceCard): Promise<BuildIntelligenceCard> {
  const [classRef, subclassRef, exoticArmorRef, exoticWeaponRef, weaponRefs] = await Promise.all([
    resolveClassIcon(card.characterClass),
    resolveSubclass(card.subclass),
    resolveByName(card.exoticArmor),
    card.exoticWeapon ? resolveByName(card.exoticWeapon) : Promise.resolve(undefined),
    Promise.all(card.weapons.map((w) => resolveByName(w))),
  ])

  const activityRef = await resolveActivityRef(card.activityName, card.activityId)

  return {
    ...card,
    classRef,
    subclassRef,
    exoticArmorRef,
    exoticWeaponRef,
    weaponRefs,
    activityRef,
  }
}

async function enrichLeaderboardEntry(entry: LeaderboardEntry): Promise<LeaderboardEntry> {
  const fastestActivityRef = entry.fastestActivityName
    ? await resolveActivity(entry.fastestActivityName)
    : undefined
  return {
    ...entry,
    emblemUrl: entry.emblemUrl,
    fastestActivityRef: fastestActivityRef
      ? {
          ...fastestActivityRef,
          iconUrl:
            activityIconUrlForName(entry.fastestActivityName ?? '') ?? fastestActivityRef.iconUrl,
        }
      : undefined,
  }
}

async function enrichLobby(lobby: FireteamLobby): Promise<FireteamLobby> {
  const activityRef = await resolveActivity(lobby.activityName)
  const classRef = lobby.hostClass ? await resolveClassIcon(lobby.hostClass) : undefined
  return { ...lobby, activityRef, hostClassRef: classRef }
}

export async function buildWeeklyResetInfo(): Promise<WeeklyResetInfo> {
  const state = getWeeklyResetState()
  const [raidIcons, dungeonIcons] = await Promise.all([
    Promise.all(state.featuredRaids.map((r) => resolveActivity(r.name))),
    Promise.all(state.featuredDungeons.map((d) => resolveActivity(d.name))),
  ])

  return {
    resetAt: state.resetAt,
    nextResetAt: state.nextResetAt,
    weekLabel: state.weekLabel,
    resetsInLabel: state.resetsInLabel,
    resetsInMs: state.resetsInMs,
    pantheon: state.pantheon,
    resetTimeLabel: state.resetTimeLabel,
    featuredRaids: state.featuredRaids.map((r, i) => ({
      ...r,
      hash: raidIcons[i]?.hash ?? activityCatalogLookup(r.name)?.hash,
      iconUrl: activityIconUrl(r.name, raidIcons[i]),
    })),
    featuredDungeons: state.featuredDungeons.map((d, i) => ({
      ...d,
      hash: dungeonIcons[i]?.hash ?? activityCatalogLookup(d.name)?.hash,
      iconUrl: activityIconUrl(d.name, dungeonIcons[i]),
    })),
  }
}

export async function enrichOverview(payload: OverviewPayload): Promise<OverviewPayload> {
  const weeklyReset = await buildWeeklyResetInfo()
  const primaryRaid = weeklyReset.featuredRaids[0]
  const primaryDungeon = weeklyReset.featuredDungeons[0]

  const [raidTop10, dungeonTop10, guardiansTop3, recentRuns, lookingForGroup, trendingBuilds, topLoadoutsByClass] =
    await Promise.all([
      Promise.all(payload.raidTop10.map(enrichLeaderboardEntry)),
      Promise.all(payload.dungeonTop10.map(enrichLeaderboardEntry)),
      Promise.all(payload.guardiansTop3.map(enrichLeaderboardEntry)),
      Promise.all(
        payload.recentRuns.map(async (run) => {
          const activityRef = await resolveActivityRef(run.activityName, run.activityId)
          return { ...run, activityRef }
        })
      ),
      Promise.all(payload.lookingForGroup.map(enrichLobby)),
      Promise.all(payload.trendingBuilds.map(enrichBuildCard)),
      Promise.all(
        (['titan', 'hunter', 'warlock'] as const).map(async (cls) =>
          Promise.all((payload.topLoadoutsByClass[cls] ?? []).map(enrichBuildCard))
        )
      ).then(([titan, hunter, warlock]) => ({ titan, hunter, warlock })),
    ])

  return {
    ...payload,
    weeklyReset,
    featuredRaid: {
      name: primaryRaid?.name ?? payload.featuredRaid.name,
      difficulty: primaryRaid?.difficulty ?? payload.featuredRaid.difficulty,
      resetsIn: weeklyReset.resetsInLabel,
      hash: primaryRaid?.hash,
      iconUrl: primaryRaid?.iconUrl ?? activityIconUrl(primaryRaid?.name ?? payload.featuredRaid.name),
    },
    featuredDungeon: {
      name: primaryDungeon?.name ?? payload.featuredDungeon.name,
      difficulty: primaryDungeon?.difficulty ?? payload.featuredDungeon.difficulty,
      resetsIn: weeklyReset.resetsInLabel,
      hash: primaryDungeon?.hash,
      iconUrl: primaryDungeon?.iconUrl ?? activityIconUrl(primaryDungeon?.name ?? payload.featuredDungeon.name),
    },
    raidTop10,
    dungeonTop10,
    guardiansTop3,
    clanTop5: guardiansTop3,
    recentRuns,
    lookingForGroup,
    trendingBuilds,
    topLoadoutsByClass,
  }
}

export async function enrichProfile(
  profile: PlayerProfile,
  scope: 'summary' | 'full' = 'full'
): Promise<PlayerProfile> {
  const classRef = profile.characterClass
    ? await resolveClassIcon(profile.characterClass)
    : undefined

  const characters = profile.characters?.length
    ? await Promise.all(
        profile.characters.map(async (c) => ({
          ...c,
          classRef: c.classRef ?? (await resolveClassIcon(c.characterClass)),
        }))
      )
    : undefined

  if (scope === 'summary') {
    return { ...profile, classRef, characters }
  }

  const currentLoadout = profile.currentLoadout
    ? await enrichBuildSnapshot(profile.currentLoadout)
    : undefined
  const recentRuns = await Promise.all(
    profile.recentRuns.map(async (run) => ({
      ...run,
      activityRef: await resolveActivityRef(run.activityName, run.activityId),
    }))
  )

  return {
    ...profile,
    classRef,
    characters,
    currentLoadout,
    recentRuns,
  }
}

export async function enrichClan(clan: ClanProfile): Promise<ClanProfile> {
  return { ...clan }
}

export async function enrichLoadoutsResponse(data: {
  current: BuildSnapshot | null
  saved: BuildSnapshot[]
  favorites: BuildSnapshot[]
  equipSupported: boolean
  equipMessage: string
}) {
  if (!data.current) {
    return { ...data, current: null, saved: [], favorites: [] }
  }
  const [current, saved, favorites] = await Promise.all([
    enrichBuildSnapshot(data.current),
    Promise.all(data.saved.map(enrichBuildSnapshot)),
    Promise.all(data.favorites.map(enrichBuildSnapshot)),
  ])
  return { ...data, current, saved, favorites }
}

async function enrichExternalBuild(build: ExternalBuildSource): Promise<ExternalBuildSource> {
  const [classRef, subclassRef, exoticArmorRef, exoticWeaponRef, weaponRefs, activityRef] =
    await Promise.all([
      resolveClassIcon(build.class),
      resolveSubclass(build.subclass),
      build.exoticArmor ? resolveByName(build.exoticArmor) : Promise.resolve(undefined),
      build.exoticWeapon ? resolveByName(build.exoticWeapon) : Promise.resolve(undefined),
      Promise.all((build.weapons ?? []).map((w) => resolveByName(w))),
      build.activityFocus ? resolveActivity(build.activityFocus) : Promise.resolve(undefined),
    ])

  return {
    ...build,
    classRef,
    subclassRef,
    exoticArmorRef,
    exoticWeaponRef,
    weaponRefs,
    activityRef,
  }
}

export async function enrichBuildsResponse(data: {
  verifiedBuilds: BuildIntelligenceCard[]
  externalBuilds: ExternalBuildSource[]
  aiSummary: string
  metaResearchSummary?: string
  activity: string
}) {
  const [verifiedBuilds, externalBuilds] = await Promise.all([
    Promise.all(data.verifiedBuilds.map(enrichBuildCard)),
    Promise.all(data.externalBuilds.map(enrichExternalBuild)),
  ])
  return { ...data, verifiedBuilds, externalBuilds }
}

export async function enrichLobbies(lobbies: FireteamLobby[]): Promise<FireteamLobby[]> {
  return Promise.all(lobbies.map(enrichLobby))
}

export type { DestinyIconRef }
