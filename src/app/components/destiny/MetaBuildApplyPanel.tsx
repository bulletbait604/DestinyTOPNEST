'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, ChevronRight, Loader2, Shield, Wand2 } from 'lucide-react'
import type { ArmorSlotLabel, DestinyCharacterClass, ExternalBuildSource } from '@/lib/destiny/types'
import { armorSlotLabel } from '@/lib/destiny/loadoutDisplay'
import MetaBuildArmorPickerModal, {
  type ArmorPickerOption,
} from '@/app/components/destiny/MetaBuildArmorPickerModal'
import { ItemIcon } from '@/app/components/destiny/DestinyUi'
import { destinyPrimaryBtn, getDestinyTheme } from '@/app/components/destiny/destinyTheme'
import { cn } from '@/lib/utils'

const ARMOR_SLOTS: ArmorSlotLabel[] = ['helmet', 'gauntlets', 'chest', 'legs']

export default function MetaBuildApplyPanel({
  build,
  darkMode,
  characterId,
  characterClass,
}: {
  build: ExternalBuildSource
  darkMode: boolean
  characterId?: string
  characterClass: DestinyCharacterClass
}) {
  const t = getDestinyTheme(darkMode)
  const [armorSelections, setArmorSelections] = useState<Partial<Record<ArmorSlotLabel, string>>>({})
  const [optionsBySlot, setOptionsBySlot] = useState<Partial<Record<ArmorSlotLabel, ArmorPickerOption[]>>>({})
  const [loadingSlot, setLoadingSlot] = useState<ArmorSlotLabel | null>(null)
  const [pickerSlot, setPickerSlot] = useState<ArmorSlotLabel | null>(null)
  const [applying, setApplying] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const defaults: Partial<Record<ArmorSlotLabel, string>> = {}
    for (const slot of ARMOR_SLOTS) {
      if (build.legendaryArmor?.[slot]) defaults[slot] = build.legendaryArmor[slot]
    }
    setArmorSelections(defaults)
  }, [build.id, build.legendaryArmor])

  const loadSlotOptions = useCallback(
    async (slot: ArmorSlotLabel) => {
      if (!characterId) return
      setLoadingSlot(slot)
      try {
        const params = new URLSearchParams({
          characterId,
          class: characterClass,
          slot,
        })
        if (build.statPriorities?.length) {
          params.set('statPriorities', build.statPriorities.join(','))
        }
        const recommendedHash = build.legendaryArmorRefs?.[slot]?.hash
        if (recommendedHash) params.set('recommendedHash', String(recommendedHash))

        const res = await fetch(`/api/destiny/loadouts/armor-options?${params}`, { credentials: 'include' })
        const json = await res.json()
        const items = (json.items ?? []) as ArmorPickerOption[]
        setOptionsBySlot((prev) => ({ ...prev, [slot]: items }))

        const top = items[0]
        if (top) {
          setArmorSelections((prev) => (prev[slot] ? prev : { ...prev, [slot]: top.name }))
        }
      } finally {
        setLoadingSlot(null)
      }
    },
    [build.legendaryArmorRefs, build.statPriorities, characterClass, characterId]
  )

  useEffect(() => {
    if (!characterId) return
    for (const slot of ARMOR_SLOTS) {
      void loadSlotOptions(slot)
    }
  }, [characterId, loadSlotOptions])

  const selectionSummary = useMemo(() => {
    return ARMOR_SLOTS.filter((slot) => armorSelections[slot]).length
  }, [armorSelections])

  const classMismatch = build.class !== characterClass

  async function applyLoadout() {
    if (!characterId) {
      setError('Select an active character on the Guardian tab first.')
      return
    }
    if (classMismatch) {
      setError(`This build is for ${build.class}s. Switch to a ${build.class} guardian first.`)
      return
    }
    setApplying(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch('/api/destiny/loadouts/apply', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buildId: build.id,
          characterId,
          characterClass,
          armorSelections,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Could not apply loadout')
        return
      }
      setMessage(
        `Equipped ${json.equipped ?? 0} items${json.transferred ? ` (${json.transferred} moved from vault/alt characters)` : ''}.`
      )
    } catch {
      setError('Network error while applying loadout.')
    } finally {
      setApplying(false)
    }
  }

  const pickerOptions = pickerSlot ? optionsBySlot[pickerSlot] ?? [] : []

  return (
    <>
      <div className="px-4 py-3 border-t border-white/[0.06] space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-sky-300/80" />
          <p className={cn('text-sm font-semibold', t.heading)}>Choose your armor</p>
        </div>
        <p className={cn('text-xs leading-relaxed', t.muted)}>
          Tap a slot to pick from your vault and characters. Options are sorted by closest stats to this build&apos;s
          recommendation.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ARMOR_SLOTS.map((slot) => {
            const recommended = build.legendaryArmor?.[slot]
            const selectedName = armorSelections[slot] ?? recommended ?? ''
            const options = optionsBySlot[slot] ?? []
            const selectedOption = options.find((o) => o.name === selectedName)
            const loading = loadingSlot === slot

            return (
              <button
                key={slot}
                type="button"
                disabled={!characterId || loading}
                onClick={() => setPickerSlot(slot)}
                className={cn(
                  'flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors',
                  'bg-black/30 border-white/[0.08] hover:border-sky-500/30 hover:bg-white/[0.04]',
                  !characterId && 'opacity-60 cursor-not-allowed'
                )}
              >
                <ItemIcon
                  iconUrl={selectedOption?.iconUrl}
                  name={selectedName || recommended || armorSlotLabel(slot)}
                  size={44}
                  className="rounded-lg shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className={cn('text-[11px] font-bold uppercase tracking-wider', t.caption)}>
                    {armorSlotLabel(slot)}
                  </p>
                  <p className={cn('text-sm truncate', selectedName ? t.body : t.muted)}>
                    {loading ? 'Loading…' : selectedName || recommended || 'Choose armor'}
                  </p>
                  {recommended && selectedName && selectedName !== recommended ? (
                    <p className={cn('text-[10px] truncate', t.muted)}>Rec. {recommended}</p>
                  ) : null}
                </div>
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white/50 shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-white/40 shrink-0" />
                )}
              </button>
            )
          })}
        </div>

        {!characterId ? (
          <p className={cn('text-xs', t.muted)}>Link Bungie and select a character to enable armor matching.</p>
        ) : classMismatch ? (
          <p className={cn('text-xs text-amber-200/90')}>
            Active guardian is a {characterClass}. Switch characters to apply this {build.class} build.
          </p>
        ) : null}

        {error ? <p className="text-xs text-red-300/90">{error}</p> : null}
        {message ? (
          <p className="text-xs text-emerald-300/90 flex items-center gap-1">
            <Check className="w-3.5 h-3.5" /> {message}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={cn(destinyPrimaryBtn(darkMode), 'inline-flex items-center gap-1.5')}
            disabled={applying || !characterId || classMismatch}
            onClick={() => void applyLoadout()}
          >
            {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            Apply in game
          </button>
          <span className={cn('text-xs self-center', t.muted)}>
            {selectionSummary}/{ARMOR_SLOTS.length} armor slots chosen
          </span>
        </div>
      </div>

      {pickerSlot ? (
        <MetaBuildArmorPickerModal
          darkMode={darkMode}
          slot={pickerSlot}
          recommendedName={build.legendaryArmor?.[pickerSlot]}
          statPriorities={build.statPriorities}
          options={pickerOptions}
          selectedName={armorSelections[pickerSlot]}
          onSelect={(option) =>
            setArmorSelections((prev) => ({
              ...prev,
              [pickerSlot]: option.name,
            }))
          }
          onClose={() => setPickerSlot(null)}
        />
      ) : null}
    </>
  )
}
