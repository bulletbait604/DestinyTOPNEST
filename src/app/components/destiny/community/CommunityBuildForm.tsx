'use client'

import { useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { ARMOR_STAT_ORDER } from '@/lib/destiny/armorStats'
import {
  COMMUNITY_ACTIVITY_TAG_OPTIONS,
  COMMUNITY_CLASSES,
  communityClassLabel,
  validateCommunityBuildInput,
  type CommunityBuildContent,
  type CommunityBuildDraft,
  type CommunityBuildPlug,
} from '@/lib/destiny/communityBuildModel'
import { destinyPrimaryBtn, destinySecondaryBtn, getDestinyTheme } from '@/app/components/destiny/destinyTheme'
import { cn } from '@/lib/utils'

const fieldClass =
  'w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/35'

function plugsToText(plugs: CommunityBuildPlug[]): string {
  return plugs.map((plug) => plug.name).join('\n')
}

function textToPlugs(text: string, previous: CommunityBuildPlug[]): CommunityBuildPlug[] {
  return text
    .split(/[\n,]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((name) => {
      const match = previous.find((plug) => plug.name.toLowerCase() === name.toLowerCase())
      return match ? { ...match, name } : { name }
    })
}

const EMPTY: CommunityBuildDraft = {
  name: '',
  characterClass: 'hunter',
  subclass: '',
  aspects: [],
  fragments: [],
  exoticArmor: '',
  exoticWeapon: '',
  mods: [],
  statFocus: [],
  activityTags: [],
  description: '',
  source: 'manual',
}

export default function CommunityBuildForm({
  darkMode,
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  darkMode: boolean
  initial?: CommunityBuildDraft
  submitLabel: string
  onSubmit: (content: CommunityBuildContent) => Promise<void>
  onCancel?: () => void
}) {
  const t = getDestinyTheme(darkMode)
  const [draft, setDraft] = useState<CommunityBuildDraft>(initial ?? EMPTY)
  const [aspectText, setAspectText] = useState(plugsToText(initial?.aspects ?? []))
  const [fragmentText, setFragmentText] = useState(plugsToText(initial?.fragments ?? []))
  const [modText, setModText] = useState(plugsToText(initial?.mods ?? []))
  const [error, setError] = useState<string | null>(null)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [importing, setImporting] = useState(false)
  const [characters, setCharacters] = useState<
    { characterId: string; characterClass: string; powerLevel: number }[]
  >([])
  const [characterId, setCharacterId] = useState(initial?.characterId ?? '')

  const content = useMemo<CommunityBuildContent>(
    () => ({
      name: draft.name,
      characterClass: draft.characterClass,
      subclass: draft.subclass,
      subclassRef: draft.subclassRef,
      aspects: textToPlugs(aspectText, draft.aspects),
      fragments: textToPlugs(fragmentText, draft.fragments),
      exoticArmor: draft.exoticArmor,
      exoticArmorRef: draft.exoticArmorRef,
      exoticWeapon: draft.exoticWeapon,
      exoticWeaponRef: draft.exoticWeaponRef,
      mods: textToPlugs(modText, draft.mods),
      statFocus: draft.statFocus,
      activityTags: draft.activityTags,
      description: draft.description,
      source: draft.source,
    }),
    [aspectText, draft, fragmentText, modText]
  )

  async function importEquipped(nextCharacterId?: string) {
    setImporting(true)
    setImportMessage(null)
    setError(null)
    try {
      const params = nextCharacterId ? `?characterId=${encodeURIComponent(nextCharacterId)}` : ''
      const res = await fetch(`/api/destiny/community-builds/import${params}`, { credentials: 'include' })
      const json = (await res.json().catch(() => ({}))) as {
        error?: string
        message?: string
        linked?: boolean
        draft?: CommunityBuildDraft | null
        characters?: { characterId: string; characterClass: string; powerLevel: number }[]
        activeCharacterId?: string
      }
      if (!res.ok) throw new Error(json.error || 'Could not import that loadout.')
      setCharacters(json.characters ?? [])
      if (json.activeCharacterId) setCharacterId(json.activeCharacterId)
      if (!json.linked || !json.draft) {
        setImportMessage(json.message || 'Reconnect Bungie to import an equipped loadout.')
        return
      }
      const imported = json.draft
      setDraft((current) => ({
        ...imported,
        description: current.description,
        name: imported.name || current.name,
        statFocus: imported.statFocus.length ? imported.statFocus : current.statFocus,
        activityTags: imported.activityTags.length ? imported.activityTags : current.activityTags,
      }))
      setAspectText(plugsToText(imported.aspects))
      setFragmentText(plugsToText(imported.fragments))
      setModText(plugsToText(imported.mods))
      setImportMessage('Equipped loadout imported. Add activity tags and a description before sharing.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not import that loadout.')
    } finally {
      setImporting(false)
    }
  }

  function toggleStat(stat: CommunityBuildDraft['statFocus'][number]) {
    setDraft((current) => {
      const selected = current.statFocus.includes(stat)
      if (selected) return { ...current, statFocus: current.statFocus.filter((item) => item !== stat) }
      if (current.statFocus.length >= 3) return current
      return { ...current, statFocus: [...current.statFocus, stat] }
    })
  }

  function toggleTag(tag: CommunityBuildDraft['activityTags'][number]) {
    setDraft((current) => {
      const selected = current.activityTags.includes(tag)
      if (selected) return { ...current, activityTags: current.activityTags.filter((item) => item !== tag) }
      if (current.activityTags.length >= 4) return current
      return { ...current, activityTags: [...current.activityTags, tag] }
    })
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const validated = validateCommunityBuildInput(content)
    if (!validated.ok) {
      setError(validated.error)
      return
    }
    setBusy(true)
    setError(null)
    try {
      await onSubmit(validated.value)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this build.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={destinySecondaryBtn(darkMode)}
          disabled={importing || busy}
          onClick={() => void importEquipped(characterId || undefined)}
        >
          {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Import equipped loadout
        </button>
        {characters.length > 0 ? (
          <label className="text-sm text-white/70">
            <span className="sr-only">Character</span>
            <select
              value={characterId}
              onChange={(event) => {
                setCharacterId(event.target.value)
                void importEquipped(event.target.value)
              }}
              className={cn(fieldClass, 'w-auto')}
            >
              {characters.map((character) => (
                <option key={character.characterId} value={character.characterId}>
                  {communityClassLabel(character.characterClass as CommunityBuildDraft['characterClass'])} ·{' '}
                  {character.powerLevel}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      {importMessage ? <p className={cn('text-sm', t.muted)}>{importMessage}</p> : null}

      <label className="block">
        <span className={cn('block text-[11px] uppercase tracking-wide mb-1', t.caption)}>Name</span>
        <input
          value={draft.name}
          onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
          maxLength={60}
          required
          className={fieldClass}
          placeholder="Nightfall well-lock"
        />
      </label>

      <fieldset>
        <legend className={cn('text-[11px] uppercase tracking-wide mb-2', t.caption)}>Class</legend>
        <div className="flex flex-wrap gap-2">
          {COMMUNITY_CLASSES.map((characterClass) => (
            <button
              key={characterClass}
              type="button"
              aria-pressed={draft.characterClass === characterClass}
              onClick={() => setDraft((current) => ({ ...current, characterClass }))}
              className={cn(
                'px-3 py-2 rounded-lg text-sm font-semibold border min-h-[44px]',
                draft.characterClass === characterClass
                  ? 'border-[var(--tn-solar)] bg-white/10 text-white'
                  : 'border-white/10 text-white/70'
              )}
            >
              {communityClassLabel(characterClass)}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className={cn('block text-[11px] uppercase tracking-wide mb-1', t.caption)}>Subclass</span>
        <input
          value={draft.subclass}
          onChange={(event) =>
            setDraft((current) => ({ ...current, subclass: event.target.value, subclassRef: undefined }))
          }
          maxLength={48}
          className={fieldClass}
          placeholder="Prismatic, Stormcaller, Nightstalker…"
        />
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className={cn('block text-[11px] uppercase tracking-wide mb-1', t.caption)}>Aspects</span>
          <textarea
            value={aspectText}
            onChange={(event) => setAspectText(event.target.value)}
            className={cn(fieldClass, 'min-h-[88px]')}
            placeholder="One per line"
          />
        </label>
        <label className="block">
          <span className={cn('block text-[11px] uppercase tracking-wide mb-1', t.caption)}>Fragments</span>
          <textarea
            value={fragmentText}
            onChange={(event) => setFragmentText(event.target.value)}
            className={cn(fieldClass, 'min-h-[88px]')}
            placeholder="One per line"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className={cn('block text-[11px] uppercase tracking-wide mb-1', t.caption)}>Exotic armor</span>
          <input
            value={draft.exoticArmor}
            onChange={(event) =>
              setDraft((current) => ({ ...current, exoticArmor: event.target.value, exoticArmorRef: undefined }))
            }
            maxLength={80}
            className={fieldClass}
            placeholder="Synthoceps"
          />
        </label>
        <label className="block">
          <span className={cn('block text-[11px] uppercase tracking-wide mb-1', t.caption)}>Exotic weapon</span>
          <input
            value={draft.exoticWeapon}
            onChange={(event) =>
              setDraft((current) => ({ ...current, exoticWeapon: event.target.value, exoticWeaponRef: undefined }))
            }
            maxLength={80}
            className={fieldClass}
            placeholder="Gjallarhorn"
          />
        </label>
      </div>

      <label className="block">
        <span className={cn('block text-[11px] uppercase tracking-wide mb-1', t.caption)}>Armor mods</span>
        <textarea
          value={modText}
          onChange={(event) => setModText(event.target.value)}
          className={cn(fieldClass, 'min-h-[72px]')}
          placeholder="One mod per line"
        />
      </label>

      <fieldset>
        <legend className={cn('text-[11px] uppercase tracking-wide mb-2', t.caption)}>Stat focus (up to 3)</legend>
        <div className="flex flex-wrap gap-2">
          {ARMOR_STAT_ORDER.map((stat) => (
            <button
              key={stat.key}
              type="button"
              aria-pressed={draft.statFocus.includes(stat.key)}
              onClick={() => toggleStat(stat.key)}
              className={cn(
                'px-3 py-2 rounded-lg text-sm border min-h-[44px]',
                draft.statFocus.includes(stat.key)
                  ? 'border-[var(--tn-arc)] bg-white/10 text-white'
                  : 'border-white/10 text-white/70'
              )}
            >
              {stat.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className={cn('text-[11px] uppercase tracking-wide mb-2', t.caption)}>Activity tags (up to 4)</legend>
        <div className="flex flex-wrap gap-2">
          {COMMUNITY_ACTIVITY_TAG_OPTIONS.map((tag) => (
            <button
              key={tag.id}
              type="button"
              aria-pressed={draft.activityTags.includes(tag.id)}
              onClick={() => toggleTag(tag.id)}
              className={cn(
                'px-3 py-2 rounded-lg text-sm border min-h-[44px]',
                draft.activityTags.includes(tag.id)
                  ? 'border-[var(--tn-solar)] bg-white/10 text-white'
                  : 'border-white/10 text-white/70'
              )}
            >
              {tag.label}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className={cn('block text-[11px] uppercase tracking-wide mb-1', t.caption)}>Description</span>
        <textarea
          value={draft.description}
          onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
          maxLength={2000}
          className={cn(fieldClass, 'min-h-[96px]')}
          placeholder="How to play it, encounter notes, stat targets…"
        />
      </label>

      {error ? (
        <p className="text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button type="submit" className={destinyPrimaryBtn(darkMode)} disabled={busy}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {submitLabel}
        </button>
        {onCancel ? (
          <button type="button" className={destinySecondaryBtn(darkMode)} onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  )
}
