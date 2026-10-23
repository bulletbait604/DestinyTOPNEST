'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import { equippedToInGameLoadout, type EquippedLoadoutCard } from '@/lib/destiny/profileSnapshot'
import type { InGameLoadoutSummary } from '@/lib/destiny/types'
import { GlassCard, SectionTitle } from '@/app/components/destiny/DestinyUi'
import { destinyPrimaryBtn, destinySecondaryBtn, getDestinyTheme } from '@/app/components/destiny/destinyTheme'
import { cn } from '@/lib/utils'

const fieldClass =
  'w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/35'

interface LoadoutLookupResponse {
  linked?: boolean
  displayName?: string
  characters?: Array<{ characterId: string; equipped?: EquippedLoadoutCard; inGameLoadouts?: InGameLoadoutSummary[] }>
  equipped?: EquippedLoadoutCard[]
  loadouts?: InGameLoadoutSummary[]
  error?: string
  message?: string
  saved?: number
  errors?: string[]
}

async function errorMessage(res: Response, fallback: string): Promise<string> {
  const json = (await res.json().catch(() => ({}))) as { error?: string }
  return json.error || fallback
}

function preview(values: string[] | undefined): string {
  const names = (values ?? []).filter(Boolean)
  return names.length ? names.join(' · ') : '—'
}

export default function InGameLoadoutShare({
  darkMode,
  signedIn = false,
  onLogin,
  onPublished,
}: {
  darkMode: boolean
  signedIn?: boolean
  onLogin?: () => void
  onPublished?: () => void
}) {
  const t = getDestinyTheme(darkMode)
  const [query, setQuery] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [equipped, setEquipped] = useState<EquippedLoadoutCard[]>([])
  const [loadouts, setLoadouts] = useState<InGameLoadoutSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [titles, setTitles] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})

  const loadFrom = useCallback(async (url: string) => {
    setLoading(true)
    setError(null)
    setStatus(null)
    try {
      const res = await fetch(url, { credentials: 'include' })
      const json = (await res.json().catch(() => ({}))) as LoadoutLookupResponse
      if (!res.ok) throw new Error(json.error || 'Could not load in-game loadouts.')
      const equippedCards = json.equipped ?? json.characters?.map((character) => character.equipped).filter((card): card is EquippedLoadoutCard => Boolean(card)) ?? []
      const slots = json.loadouts ?? json.characters?.flatMap((character) => character.inGameLoadouts ?? []) ?? []
      setDisplayName(json.displayName ?? '')
      setEquipped(equippedCards)
      setLoadouts(slots)
      if (!slots.length && !equippedCards.length) {
        setStatus(json.message || 'No equipped gear or saved in-game loadouts came back.')
      }
    } catch (err) {
      setEquipped([])
      setLoadouts([])
      setError(err instanceof Error ? err.message : 'Could not load in-game loadouts.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!signedIn) return
    void loadFrom('/api/destiny/builds?scope=loadouts')
  }, [signedIn, loadFrom])

  function onLookup(event: FormEvent) {
    event.preventDefault()
    const name = query.trim()
    if (!name) {
      setError('Enter a Bungie name and code, like Name#1234.')
      return
    }
    void loadFrom(`/api/destiny/builds?scope=loadouts&q=${encodeURIComponent(name)}`)
  }

  function cardKey(kind: string, characterId: string, index: number) {
    return `${kind}:${characterId}:${index}`
  }

  async function publish(loadout: InGameLoadoutSummary, key: string) {
    if (!signedIn) {
      onLogin?.()
      if (!onLogin) setError('Sign in to save a loadout to shared builds.')
      return
    }
    setSavingKey(key)
    setError(null)
    setStatus(null)
    try {
      const res = await fetch('/api/destiny/builds', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loadout,
          name: titles[key]?.trim() || undefined,
          description: notes[key]?.trim() || undefined,
        }),
      })
      if (!res.ok) throw new Error(await errorMessage(res, 'Could not save this loadout.'))
      setStatus(`Saved ${titles[key]?.trim() || loadout.name} to shared builds.`)
      onPublished?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this loadout.')
    } finally {
      setSavingKey(null)
    }
  }

  async function publishAll() {
    if (!signedIn) {
      onLogin?.()
      if (!onLogin) setError('Sign in to save a loadout to shared builds.')
      return
    }
    if (!loadouts.length) return
    setSavingKey('all')
    setError(null)
    setStatus(null)
    try {
      const saves = loadouts.map((loadout) => {
        const key = cardKey('slot', loadout.characterId, loadout.index)
        return {
          loadout,
          name: titles[key]?.trim() || undefined,
          description: notes[key]?.trim() || undefined,
        }
      })
      const res = await fetch('/api/destiny/builds', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saves }),
      })
      const json = (await res.json().catch(() => ({}))) as LoadoutLookupResponse
      if (!res.ok) throw new Error(json.error || 'Could not save in-game loadouts.')
      const count = json.saved ?? loadouts.length
      const extra = json.errors?.filter(Boolean).join(' ')
      setStatus(extra ? `Saved ${count} to shared builds. ${extra}` : `Saved ${count} in-game loadouts to shared builds.`)
      onPublished?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save in-game loadouts.')
    } finally {
      setSavingKey(null)
    }
  }

  function renderCard(loadout: InGameLoadoutSummary, key: string, slotLabel: string) {
    const busy = savingKey === key || savingKey === 'all'
    return (
      <article key={key} className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-base font-semibold text-white">
            {loadout.classType} · {loadout.name}
          </h3>
          <p className={cn('text-xs uppercase tracking-wide', t.caption)}>{slotLabel}</p>
        </div>
        <p className={cn('text-sm', t.body)}>
          {loadout.subclass || 'Subclass unknown'}
          {loadout.exoticArmor ? ` · ${loadout.exoticArmor}` : ''}
          {loadout.exoticWeapon ? ` · ${loadout.exoticWeapon}` : ''}
        </p>
        <p className={cn('text-sm', t.muted)}>Weapons: {preview(loadout.weapons)}</p>
        <p className={cn('text-sm', t.muted)}>Mods: {preview(loadout.mods)}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <label>
            <span className={cn('block text-[11px] uppercase tracking-wide mb-1', t.caption)}>Title</span>
            <input
              value={titles[key] ?? ''}
              onChange={(event) => setTitles((current) => ({ ...current, [key]: event.target.value }))}
              placeholder={loadout.name}
              className={fieldClass}
              maxLength={60}
            />
          </label>
          <label>
            <span className={cn('block text-[11px] uppercase tracking-wide mb-1', t.caption)}>Notes</span>
            <input
              value={notes[key] ?? ''}
              onChange={(event) => setNotes((current) => ({ ...current, [key]: event.target.value }))}
              placeholder="Optional"
              className={fieldClass}
              maxLength={500}
            />
          </label>
        </div>
        <button
          type="button"
          className={destinyPrimaryBtn(darkMode)}
          disabled={busy}
          onClick={() => void publish(loadout, key)}
        >
          {busy ? 'Saving…' : 'Save to Shared Builds'}
        </button>
      </article>
    )
  }

  return (
    <GlassCard darkMode={darkMode}>
      <SectionTitle
        title="Share a Build / Import from Destiny 2"
        subtitle="Save currently equipped gear or any saved in-game loadout into the shared builds list."
        darkMode={darkMode}
      />
      <form className="mt-4 flex flex-col sm:flex-row gap-2" onSubmit={onLookup}>
        <label className="flex-1">
          <span className={cn('block text-[11px] uppercase tracking-wide mb-1', t.caption)}>
            Load In-Game Loadouts by Bungie Name
          </span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name#1234"
            className={fieldClass}
            maxLength={80}
          />
        </label>
        <button type="submit" className={cn(destinySecondaryBtn(darkMode), 'sm:self-end')} disabled={loading}>
          {loading ? 'Loading…' : 'Load'}
        </button>
      </form>

      <div className="mt-4">
        <button
          type="button"
          className={destinySecondaryBtn(darkMode)}
          disabled={!loadouts.length || savingKey != null}
          onClick={() => void publishAll()}
        >
          {savingKey === 'all' ? 'Saving…' : 'Save All In-Game Loadouts to Shared Builds'}
        </button>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}
      {status ? <p className={cn('mt-3 text-sm', t.muted)}>{status}</p> : null}
      {displayName ? <p className={cn('mt-4 text-sm', t.gold)}>{displayName}</p> : null}

      {equipped.length || loadouts.length ? (
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
          {equipped.map((card) =>
            renderCard(equippedToInGameLoadout(card), cardKey('equipped', card.characterId, 0), 'Currently Equipped')
          )}
          {loadouts.map((loadout) =>
            renderCard(loadout, cardKey('slot', loadout.characterId, loadout.index), `Loadout ${loadout.index + 1}`)
          )}
        </div>
      ) : null}
    </GlassCard>
  )
}
