'use client'

import { useEffect, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import type { PlayerProfile } from '@/lib/destiny/types'
import { profileViewForCharacter } from '@/lib/destiny/activeCharacter'
import { buildArmorRows } from '@/lib/destiny/loadoutDisplay'
import { buildWeaponRows } from '@/app/components/destiny/WeaponArmoryTable'
import FlierTeamHoverArmoryTable from '@/app/components/destiny/FlierTeamHoverArmoryTable'
import GuardianProfileBanner from '@/app/components/destiny/GuardianProfileBanner'
import ArmorStatMatrix from '@/app/components/destiny/ArmorStatMatrix'
import {
  AbilityChip,
  BuildSection,
  GameCard,
} from '@/app/components/destiny/destinyGameUi'
import { getDestinyTheme, subclassGlow } from '@/app/components/destiny/destinyTheme'
import { cn } from '@/lib/utils'

function trustDisplayValue(trust?: PlayerProfile['trustRank']): string {
  if (trust?.reviewCount && trust.reviewCount > 0) return String(trust.reviewCount)
  if (trust?.topNestTitle && trust.topNestTitle !== 'Unrated Guardian') {
    const word = trust.topNestTitle.split(/\s+/)[0]
    return word.length > 6 ? `${word.slice(0, 5)}…` : word
  }
  return '—'
}

function FlierTeamStatRow({ profile, darkMode }: { profile: PlayerProfile; darkMode: boolean }) {
  const t = getDestinyTheme(darkMode)
  const pl = profile.powerLevel ?? '—'
  const gr = profile.guardianRank ?? '—'
  const tr = trustDisplayValue(profile.trustRank)

  return (
    <div className="flex flex-wrap items-end justify-center gap-5 py-4 px-4 border-b border-white/10">
      <div className="text-center min-w-[72px]">
        <p className={cn('text-[17px] uppercase tracking-wider font-semibold', t.muted)}>PL</p>
        <p className="text-[32px] font-black leading-none text-amber-300 tabular-nums">{pl}</p>
      </div>
      <div className="text-center min-w-[72px]">
        <p className={cn('text-[17px] uppercase tracking-wider font-semibold', t.muted)}>GR</p>
        <p className="text-[32px] font-black leading-none text-sky-300 tabular-nums">{gr}</p>
      </div>
      <div className="text-center min-w-[80px]">
        <p className={cn('text-[17px] uppercase tracking-wider font-bold', t.gold)}>T.R.</p>
        <p className="text-[32px] font-black leading-none text-amber-200 tabular-nums">{tr}</p>
      </div>
    </div>
  )
}

interface Props {
  darkMode: boolean
  lobbyId: string
  userId: string
  displayName: string
  onClose: () => void
}

export default function FlierTeamMemberModal({
  darkMode,
  lobbyId,
  userId,
  displayName,
  onClose,
}: Props) {
  const t = getDestinyTheme(darkMode)
  const [profile, setProfile] = useState<PlayerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(
          `/api/destiny/fireteam/member?lobbyId=${encodeURIComponent(lobbyId)}&userId=${encodeURIComponent(userId)}`,
          { credentials: 'include' }
        )
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json.error ?? 'Could not load build')
        if (!cancelled) setProfile(json.profile ?? null)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Load failed')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [lobbyId, userId])

  const loadout = profile?.currentLoadout
  const viewProfile = profile?.activeCharacterId
    ? profileViewForCharacter(profile, profile.activeCharacterId)
    : profile

  const elementGlow = subclassGlow(loadout?.subclass)
  const weaponRows = loadout ? buildWeaponRows(loadout) : []
  const armorRows = loadout ? buildArmorRows(loadout) : []

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div
        className={cn(
          'relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 shadow-2xl',
          t.glass
        )}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 px-4 py-3 border-b border-white/10 bg-black/40 backdrop-blur-md">
          <h3 className="text-lg font-bold text-white truncate">{displayName}</h3>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-white/70">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-white/60">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading live build…
          </div>
        ) : error ? (
          <p className={cn('px-4 py-8 text-sm text-center', t.muted)}>{error}</p>
        ) : profile ? (
          <GameCard className="border-0 shadow-none">
            {viewProfile ? <GuardianProfileBanner profile={viewProfile} compact /> : null}
            <FlierTeamStatRow profile={profile} darkMode={darkMode} />

            {!loadout ? (
              <p className={cn('px-4 py-6 text-sm text-center', t.muted)}>
                No live loadout — member may need to reconnect Bungie.
              </p>
            ) : (
              <div className="d2-profile-build-body px-2 pb-4">
                {Object.keys(loadout.stats).length > 0 && (
                  <BuildSection label="Stats" className="d2-profile-build-panel">
                    <ArmorStatMatrix stats={loadout.stats} loadout />
                  </BuildSection>
                )}
                <BuildSection label="Weapons" className="d2-profile-build-panel">
                  <FlierTeamHoverArmoryTable rows={weaponRows} title="Weapons" iconSize={44} />
                </BuildSection>
                <BuildSection label="Armor" className="d2-profile-build-panel">
                  <FlierTeamHoverArmoryTable rows={armorRows} title="Armor" iconSize={44} />
                </BuildSection>
                <BuildSection label="Abilities" className="d2-profile-build-panel">
                  <div className="d2-ability-grid d2-ability-grid-profile px-2 pb-2">
                    {[
                      { slot: 'Super', ref: loadout.superRef, fb: loadout.super },
                      { slot: 'Class', ref: loadout.classAbilityRef, fb: loadout.abilities?.[1] },
                      { slot: 'Grenade', ref: loadout.grenadeRef, fb: loadout.abilities?.[4] },
                      { slot: 'Melee', ref: loadout.meleeRef, fb: loadout.abilities?.[3] },
                    ].map(({ slot, ref, fb }) => (
                      <AbilityChip
                        key={slot}
                        item={ref}
                        fallback={fb}
                        slotLabel={slot}
                        glow={elementGlow}
                        size={44}
                      />
                    ))}
                  </div>
                </BuildSection>
              </div>
            )}
          </GameCard>
        ) : null}
      </div>
    </div>
  )
}
