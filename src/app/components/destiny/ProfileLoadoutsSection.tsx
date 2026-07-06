'use client'

import { useEffect, useMemo, useState } from 'react'
import { Hammer } from 'lucide-react'
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
import CommunityBuildCard from '@/app/components/destiny/CommunityBuildCard'
import ExternalMetaBuildCard from '@/app/components/destiny/ExternalMetaBuildCard'
import SuggestedLoadoutsSection from '@/app/components/destiny/SuggestedLoadoutsSection'
import TopLoadoutsByClass from '@/app/components/destiny/TopLoadoutsByClass'
import { rankTopMetaLoadoutsByClass } from '@/lib/destiny/metaBuildConsensus'
import { rankTopLoadoutsByClass } from '@/lib/destiny/loadoutRankings'
import {
  rankRecommendedLoadoutsForClass,
  recommendedLoadoutsSummary,
} from '@/lib/destiny/recommendedBuildOptimizer'
import { destinySecondaryBtn, getDestinyTheme } from '@/app/components/destiny/destinyTheme'
import { useBungieLink } from '@/hooks/useBungieLink'
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
  const {
    loadoutsByCharacter,
    builds,
    loadoutsLoading,
    buildsLoading,
    ensureLoadouts,
    ensureBuilds,
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
      void ensureLoadouts(activeCharacterId)
      void ensureBuilds()
    }
  }, [activeCharacterId, bungie.linked, ensureLoadouts, ensureBuilds, section])

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

          {loadouts?.equipMessage && !loadouts.current && (
            <p className={cn('text-sm leading-relaxed', t.muted)}>{loadouts.equipMessage}</p>
          )}

          <GlassCard darkMode={darkMode}>
            <SectionTitle title="Currently equipped" subtitle="Live from your Bungie account" darkMode={darkMode} />
            {loadouts?.current ? (
              <LoadoutCard build={loadouts.current} darkMode={darkMode} title="Active guardian" />
            ) : (
              <EmptyBlock
                darkMode={darkMode}
                message="No live loadout"
                hint="Reconnect Bungie to pull your current gear."
              />
            )}
          </GlassCard>

          <GlassCard darkMode={darkMode}>
            <SectionTitle title="Saved loadouts" subtitle="In-game loadout slots from your Bungie account" darkMode={darkMode} />
            {loadouts?.saved?.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {loadouts.saved.map((b, i) => (
                  <LoadoutCard
                    key={b.id + i}
                    build={b}
                    darkMode={darkMode}
                    title={b.loadoutName ?? `Saved ${i + 1}`}
                  />
                ))}
              </div>
            ) : (
              <EmptyBlock
                darkMode={darkMode}
                message="No in-game saved loadouts"
                hint="Save loadouts in Destiny 2 (orbit or social space) and they will appear here."
              />
            )}
            <button
              type="button"
              disabled
              className={cn(destinySecondaryBtn(darkMode), 'mt-4 opacity-50 cursor-not-allowed')}
              title="Save from current gear — coming soon"
            >
              Save current loadout
            </button>
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
              subtitle="From synced Top Nest run data — separate from external meta research"
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
