'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Loader2, Shield, Wand2 } from 'lucide-react'
import type { ArmorSlotLabel, DestinyCharacterClass, ExternalBuildSource } from '@/lib/destiny/types'
import { armorSlotLabel } from '@/lib/destiny/loadoutDisplay'
import { destinyPrimaryBtn, destinySecondaryBtn, getDestinyTheme } from '@/app/components/destiny/destinyTheme'
import { cn } from '@/lib/utils'

const ARMOR_SLOTS: ArmorSlotLabel[] = ['helmet', 'gauntlets', 'chest', 'legs']

type ArmorOption = { name: string; hash: number; itemInstanceId: string; location: string }

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
  const [optionsBySlot, setOptionsBySlot] = useState<Partial<Record<ArmorSlotLabel, ArmorOption[]>>>({})
  const [loadingSlot, setLoadingSlot] = useState<ArmorSlotLabel | null>(null)
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
        const res = await fetch(`/api/destiny/loadouts/armor-options?${params}`, { credentials: 'include' })
        const json = await res.json()
        setOptionsBySlot((prev) => ({ ...prev, [slot]: json.items ?? [] }))
      } finally {
        setLoadingSlot(null)
      }
    },
    [characterClass, characterId]
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

  return (
    <div className="px-4 py-3 border-t border-white/[0.06] space-y-3">
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-sky-300/80" />
        <p className={cn('text-sm font-semibold', t.heading)}>Choose your armor</p>
      </div>
      <p className={cn('text-xs leading-relaxed', t.muted)}>
        Pick legendary pieces you own for each slot. Weapons and exotic armor auto-match from your inventory when you apply.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {ARMOR_SLOTS.map((slot) => {
          const recommended = build.legendaryArmor?.[slot]
          const selected = armorSelections[slot] ?? recommended ?? ''
          const options = optionsBySlot[slot] ?? []
          return (
            <label key={slot} className="flex flex-col gap-1">
              <span className={cn('text-[11px] font-bold uppercase tracking-wider', t.caption)}>
                {armorSlotLabel(slot)}
                {recommended ? ` · rec. ${recommended}` : ''}
              </span>
              <select
                className="rounded-lg bg-black/40 border border-white/10 px-2.5 py-2 text-sm text-white/90"
                value={selected}
                disabled={!characterId || loadingSlot === slot}
                onChange={(e) =>
                  setArmorSelections((prev) => ({
                    ...prev,
                    [slot]: e.target.value || undefined,
                  }))
                }
              >
                <option value="">— Select armor —</option>
                {recommended && !options.some((o) => o.name === recommended) ? (
                  <option value={recommended}>{recommended} (recommended)</option>
                ) : null}
                {options.map((opt) => (
                  <option key={opt.itemInstanceId} value={opt.name}>
                    {opt.name}
                    {opt.location === 'vault' ? ' · vault' : opt.location === 'other_character' ? ' · alt' : ''}
                  </option>
                ))}
              </select>
            </label>
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
  )
}
