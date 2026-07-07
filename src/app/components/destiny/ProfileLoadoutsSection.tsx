'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Hammer, RefreshCw } from 'lucide-react'
import type {
  CharacterSummary,
  DestinyCharacterClass,
} from '@/lib/destiny/types'
import {
  EmptyBlock,
  GlassCard,
  SectionTitle,
  SegmentedControl,
} from '@/app/components/destiny/DestinyUi'
import { CharacterTileRow } from '@/app/components/destiny/CharacterTile'
import LoadoutCard from '@/app/components/destiny/LoadoutCard'
import SavedLoadoutIconPicker from '@/app/components/destiny/SavedLoadoutIconPicker'
import CommunityBuildCard from '@/app/components/destiny/CommunityBuildCard'
import ExternalMetaBuildCard from '@/app/components/destiny/ExternalMetaBuildCard'
import SuggestedLoadoutsSection from '@/app/components/destiny/SuggestedLoadoutsSection'
import TopLoadoutsByClass from '@/app/components/destiny/TopLoadoutsByClass'
import { rankTopMetaLoadoutsByClass } from '@/lib/destiny/metaBuildConsensus'
import { rankTopLoadoutsByClass } from '@/lib/destiny/loadoutRankings'
import { rankRecommendedLoadoutsForClass,
  recommendedLoadoutsSummary,
} from '@/lib/destiny/recommendedBuildOptimizer'
import { buildLoadoutPickerEntries, type LoadoutPickerEntry } from '@/lib/destiny/loadoutArchetype'
import { destinySecondaryBtn, getDestinyTheme } from '@/app/components/destiny/destinyTheme'
import { useBungieLink } from '@/contexts/BungieLinkContext'
import { useProfileData } from '@/contexts/ProfileDataContext'
import { cn } from '@/lib/utils'

type LoadoutSection = 'mine' | 'community' | 'builder'

interface Props {
  darkMode: boolean
  initialSection?: LoadoutSection
  characters?: CharacterSummary[]
  activeCharacterId?: string
  characterClass?: DestinyCharacterClass
  onCharacterSelect?: (characterId: string) => void
  switchingCharacter?: boolean
}

export default function ProfileLoadoutsSection({
  darkMode,
  initialSection = 'mine',
  characters = [],
  activeCharacterId,
  characterClass = 'hunter',
  onCharacterSelect,
  switchingCharacter = false,
}: Props) {
  const [section, setSection] = useState<LoadoutSection>(initialSection)
  const [selectedLoadoutId, setSelectedLoadoutId] = useState<string | null>(null)
  const [refreshingLoadouts, setRefreshingLoadouts] = useState(false)
  const prevCharacterRef = useRef<string | undefined>()
  const {
    loadoutsByCharacter,
    builds,
    loadoutsLoading,
    buildsLoading,
    ensureLoadouts,
    ensureBuilds,
    fullProfile,
    ensureFullProfile,
  } = useProfileData()
  const bungie = useBungieLink()
  const t = getDestinyTheme(darkMode)

  const loadoutKey = activeCharacterId ?? 'default'
  const loadouts = loadoutsByCharacter[loadoutKey] ?? null
  const verifiedBuilds = builds?.verifiedBuilds ?? []
  const externalBuilds = builds?.externalBuilds ?? []
  const metaResearchSummary = builds?.metaResearchSummary ?? ''
  const loading =
    (loadoutsLoading && !loadouts && section !== 'builder') ||
    (buildsLoading && !builds && section !== 'builder')

  const activeClass =
    characters.find((c) => c.characterId === activeCharacterId)?.characterClass ?? characterClass

  useEffect(() => {
    setSection(initialSection)
  }, [initialSection])

  useEffect(() => {
    if (!bungie.linked) return
    if (section !== 'builder') {
      const characterChanged = prevCharacterRef.current !== activeCharacterId
      prevCharacterRef.current = activeCharacterId
      void ensureFullProfile(activeCharacterId)
      void ensureLoadouts(activeCharacterId, { force: characterChanged })
      void ensureBuilds()
    }
  }, [activeCharacterId, bungie.linked, ensureLoadouts, ensureBuilds, ensureFullProfile, section])

  const currentLoadout = useMemo(() => {
    if (loadouts?.current) return loadouts.current
    if (
      fullProfile?.activeCharacterId === activeCharacterId &&
      fullProfile?.currentLoadout
    ) {
      return fullProfile.currentLoadout
    }
    return null
  }, [loadouts?.current, fullProfile, activeCharacterId])

  const loadoutEntries = useMemo(
    () => buildLoadoutPickerEntries(currentLoadout, loadouts?.saved),
    [currentLoadout, loadouts?.saved]
  )

  const selectedEntry = useMemo(() => {
    if (!loadoutEntries.length) return null
    return loadoutEntries.find((e) => e.id === selectedLoadoutId) ?? loadoutEntries[0]
  }, [loadoutEntries, selectedLoadoutId])

  useEffect(() => {
    if (!loadoutEntries.length) {
      setSelectedLoadoutId(null)
      return
    }
    if (!selectedLoadoutId || !loadoutEntries.some((e) => e.id === selectedLoadoutId)) {
      setSelectedLoadoutId(loadoutEntries[0].id)
    }
  }, [loadoutEntries, selectedLoadoutId])

  const handleRefreshLoadouts = async () => {
    setRefreshingLoadouts(true)
    try {
      await ensureLoadouts(activeCharacterId, { force: true })
    } finally {
      setRefreshingLoadouts(false)
    }
  }

  const handleSelectLoadout = (entry: LoadoutPickerEntry) => {
    setSelectedLoadoutId(entry.id)
  }

  const topMetaByClass = useMemo(() => rankTopMetaLoadoutsByClass(externalBuilds, 5), [externalBuilds])
  const topVerifiedByClass = useMemo(
    () => rankTopLoadoutsByClass(verifiedBuilds, 5),
    [verifiedBuilds]
  )
  const recommendedPicks = useMemo(
    () => rankRecommendedLoadoutsForClass(activeClass, externalBuilds, verifiedBuilds, 4),
    [activeClass, externalBuilds, verifiedBuilds]
  )
  const recommendedSummary = useMemo(
    () => recommendedLoadoutsSummary(activeClass, recommendedPicks),
    [activeClass, recommendedPicks]
  )

  return (
    <div className="space-y-6">
      <SegmentedControl
        label="Section"
        darkMode={darkMode}
        value={section}
        onChange={setSection}
        options={[
          { value: 'mine', label: 'My loadouts' },
          { value: 'community', label: 'Top builds' },
          { value: 'builder', label: 'Builder' },
        ]}
      />

      {loading || switchingCharacter ? (
        <GlassCard darkMode={darkMode}>
          <p className={cn('text-sm text-center py-8', t.muted)}>
            {switchingCharacter ? 'Switching guardian…' : 'Loading loadouts…'}
          </p>
        </GlassCard>
      ) : section === 'mine' ? (
        <>
          {characters.length > 0 && onCharacterSelect ? (
            <GlassCard darkMode={darkMode} padding="compact">
              <SectionTitle
                title="Active guardian"
                subtitle="Loadout and suggestions follow the selected character"
                darkMode={darkMode}
                compact
              />
              <CharacterTileRow
                characters={characters}
                activeCharacterId={activeCharacterId}
                onCharacterSelect={onCharacterSelect}
                selectable
                switching={switchingCharacter}
                compact
              />
            </GlassCard>
          ) : null}

          <GlassCard darkMode={darkMode}>
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
              <SectionTitle
                title="In-game loadouts"
                subtitle={
                  loadoutEntries.length
                    ? `${loadoutEntries.length} loadout${loadoutEntries.length === 1 ? '' : 's'} from Bungie for this guardian — tap an icon to inspect`
                    : 'Tap Refresh after saving loadouts in Destiny 2 (orbit menu)'
                }
                darkMode={darkMode}
              />
              <button
                type="button"
                disabled={refreshingLoadouts || loadoutsLoading}
                onClick={() => void handleRefreshLoadouts()}
                className={cn(destinySecondaryBtn(darkMode), 'text-xs py-1.5')}
              >
                <RefreshCw className={cn('w-3.5 h-3.5', refreshingLoadouts && 'animate-spin')} />
                Refresh
              </button>
            </div>

            {loadouts?.equipMessage && !loadoutEntries.length ? (
              <p className={cn('text-sm leading-relaxed mb-4', t.muted)}>{loadouts.equipMessage}</p>
            ) : null}

            {loadoutEntries.length ? (
              <>
                <SavedLoadoutIconPicker
                  current={currentLoadout}
                  saved={loadouts?.saved}
                  selectedId={selectedLoadoutId}
                  onSelect={handleSelectLoadout}
                  darkMode={darkMode}
                />
                {selectedEntry ? (
                  <div className="mt-5">
                    {selectedEntry.build.loadoutIncomplete ? (
                      <p className={cn('text-xs mb-3', t.muted)}>
                        Some gear could not be resolved from Bungie
                        {selectedEntry.build.missingLoadoutSlots != null
                          ? ` (${selectedEntry.build.missingLoadoutSlots} empty slot${selectedEntry.build.missingLoadoutSlots === 1 ? '' : 's'})`
                          : ''}
                        . Open Destiny 2 and re-save this loadout if details look wrong.
                      </p>
                    ) : null}
                    <LoadoutCard
                      build={selectedEntry.build}
                      darkMode={darkMode}
                      title={selectedEntry.title}
                    />
                  </div>
                ) : null}
              </>
            ) : (
              <EmptyBlock
                darkMode={darkMode}
                message="No loadouts found"
                hint="Reconnect Bungie or save loadouts in Destiny 2 (orbit menu) and tap Refresh."
              />
            )}
          </GlassCard>

          {loadouts?.favorites?.length ? (
            <GlassCard darkMode={darkMode}>
              <SectionTitle title="Favorites" darkMode={darkMode} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {loadouts.favorites.map((b, i) => (
                  <LoadoutCard key={'fav-' + i} build={b} darkMode={darkMode} title="Favorite" />
                ))}
              </div>
            </GlassCard>
          ) : null}

          <SuggestedLoadoutsSection
            darkMode={darkMode}
            characterClass={activeClass}
            characterId={activeCharacterId}
            picks={recommendedPicks}
            summary={recommendedSummary}
          />
        </>
      ) : section === 'community' ? (
        <>
          <GlassCard darkMode={darkMode}>
            <SectionTitle
              title="Meta builds"
              subtitle="Researched from Blueberries.gg, light.gg, togame.io, D2Foundry, and builders.gg — checked each week with the Destiny reset"
              darkMode={darkMode}
            />
            {metaResearchSummary && (
              <p className={cn('text-sm mb-4 leading-relaxed', t.muted)}>{metaResearchSummary}</p>
            )}
            {externalBuilds.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {externalBuilds.map((b) => (
                  <ExternalMetaBuildCard
                    key={b.id}
                    build={b}
                    darkMode={darkMode}
                    characterId={activeCharacterId}
                    characterClass={activeClass}
                  />
                ))}
              </div>
            ) : (
              <EmptyBlock
                darkMode={darkMode}
                message="No meta builds in the research window"
                hint="Meta builds refresh each week with the Destiny reset and featured raid/dungeon rotation."
              />
            )}
          </GlassCard>

          <TopLoadoutsByClass
            darkMode={darkMode}
            topByClass={topMetaByClass}
            title="Top meta loadouts by class"
            subtitle="Unmodified picks from build sites — updated weekly with the reset"
            activeCharacterId={activeCharacterId}
            activeCharacterClass={activeClass}
          />

          <TopLoadoutsByClass
            darkMode={darkMode}
            variant="verified"
            topByClass={topVerifiedByClass}
            title="Top verified loadouts by class"
            subtitle="Unmodified from Top Nest PGCR clears — most used this season"
          />

          <GlassCard darkMode={darkMode}>
            <SectionTitle
              title="Verified PGCR builds"
              subtitle="Weapons and exotic armor from synced clears — subclass is not available in PGCR data"
              darkMode={darkMode}
            />
            {verifiedBuilds.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {verifiedBuilds.map((b) => (
                  <CommunityBuildCard key={b.id} build={b} darkMode={darkMode} />
                ))}
              </div>
            ) : (
              <EmptyBlock
                darkMode={darkMode}
                message="No verified builds yet"
                hint="Sync runs from Home to populate community loadout stats."
              />
            )}
          </GlassCard>
        </>
      ) : (
        <GlassCard darkMode={darkMode} padding="lg">
          <div className="flex flex-col items-center text-center py-6 max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.08] flex items-center justify-center mb-4">
              <Hammer className="w-7 h-7 text-white/60" />
            </div>
            <h4 className={cn('text-lg font-semibold', t.heading)}>Loadout builder</h4>
            <p className={cn('text-sm mt-2 leading-relaxed', t.muted)}>
              Plan exotic armor, aspects, fragments, and weapons before you jump into a raid or dungeon. Save builds
              to your profile and share with your fireteam.
            </p>
            <p className={cn('text-xs mt-4 px-4 py-2 rounded-full', t.glassInset, t.caption)}>Coming soon</p>
          </div>
        </GlassCard>
      )}
    </div>
  )
}
