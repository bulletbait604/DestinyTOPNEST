'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, Search } from 'lucide-react'
import type { FullProfile } from '@/lib/destiny/fullProfile'
import { searchItems, type ProfileItem } from '@/lib/destiny/fullProfileParse'

function hours(seconds: number): string {
  return `${Math.round(seconds / 3600).toLocaleString()} h`
}

function ItemTile({ item }: { item: ProfileItem }) {
  return (
    <div className="nest-item" data-tier={item.tier} title={`${item.name}${item.itemType ? ` — ${item.itemType}` : ''}`}>
      {item.iconUrl ? <img src={item.iconUrl} alt={item.name} loading="lazy" /> : null}
      {item.power ? <span>{item.power}</span> : item.quantity > 1 ? <span>×{item.quantity}</span> : null}
    </div>
  )
}

/** Full Guardian profile: characters, equipped gear, searchable vault, lifetime stats, triumphs, seals, players met. */
export default function ProfileDeepDive() {
  const [data, setData] = useState<FullProfile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<'vault' | 'all'>('vault')

  useEffect(() => {
    let alive = true
    fetch('/api/destiny/profile/full', { credentials: 'include' })
      .then(async (r) => {
        const json = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(json.error || `HTTP ${r.status}`)
        return json
      })
      .then((json) => alive && setData(json))
      .catch((e: Error) => alive && setError(e.message))
    return () => {
      alive = false
    }
  }, [])

  const pool = useMemo(() => (data ? (scope === 'vault' ? data.vault : [...data.vault, ...data.inventory]) : []), [data, scope])
  const results = useMemo(() => searchItems(pool, query).slice(0, 240), [pool, query])

  if (error) return <section className="nest-card"><p className="nest-muted">Full profile unavailable: {error}</p></section>
  if (!data)
    return (
      <section className="nest-card">
        <p className="nest-muted"><Loader2 size={14} className="animate-spin" style={{ display: 'inline' }} /> Loading your Guardian from Bungie…</p>
      </section>
    )

  return (
    <div className="space-y-4">
      {data.lifetime || data.triumphs ? (
        <section className="nest-card">
          <div className="nest-kicker">Lifetime</div>
          <div className="nest-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
            {data.lifetime ? (
              <>
                <div className="nest-stat"><strong>{data.lifetime.raidClears}</strong><small>Raid clears</small></div>
                <div className="nest-stat"><strong>{data.lifetime.dungeonClears}</strong><small>Dungeon clears</small></div>
                <div className="nest-stat"><strong>{data.lifetime.activitiesCleared.toLocaleString()}</strong><small>PvE activities</small></div>
                <div className="nest-stat"><strong>{data.lifetime.kd}</strong><small>PvE K/D</small></div>
                <div className="nest-stat"><strong>{hours(data.lifetime.secondsPlayed)}</strong><small>PvE time</small></div>
              </>
            ) : null}
            {data.triumphs ? (
              <div className="nest-stat"><strong>{data.triumphs.activeScore.toLocaleString()}</strong><small>Triumph score</small></div>
            ) : null}
            <div className="nest-stat"><strong>{data.playersMet.length}</strong><small>Players met</small></div>
          </div>
        </section>
      ) : null}

      <section className="nest-grid">
        {data.characters.map((c) => (
          <div key={c.characterId} className="nest-card" style={c.emblemBackgroundPath ? { backgroundImage: `linear-gradient(90deg, rgba(7,8,15,.85), rgba(7,8,15,.55)), url(${c.emblemBackgroundPath})`, backgroundSize: 'cover' } : undefined}>
            <div className="nest-kicker">{c.className}</div>
            <h3>
              ✦ {c.light} {c.title ? <span className="nest-bond-pill">{c.title}</span> : null}
            </h3>
            <p className="nest-muted" style={{ fontSize: '0.78rem' }}>{Math.round(c.minutesPlayedTotal / 60)} h played</p>
            <div className="nest-item-grid" style={{ marginTop: '0.5rem' }}>
              {c.equipped.slice(0, 12).map((i) => <ItemTile key={i.instanceId ?? i.itemHash} item={i} />)}
            </div>
          </div>
        ))}
      </section>

      <section className="nest-card">
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0 }}>Vault</h2>
          <span className="nest-muted">{data.vault.length} items</span>
          <div style={{ flex: 1 }} />
          <select className="nest-input" style={{ width: 'auto' }} value={scope} onChange={(e) => setScope(e.target.value as 'vault' | 'all')}>
            <option value="vault">Vault</option>
            <option value="all">Vault + characters</option>
          </select>
        </div>
        <label style={{ position: 'relative', display: 'block', margin: '0.6rem 0' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: 12 }} />
          <input className="nest-input" style={{ paddingLeft: '2rem' }} placeholder="Search: exotic, hand cannon, Gjallarhorn…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search vault" />
        </label>
        <div className="nest-item-grid">
          {results.map((i, idx) => <ItemTile key={`${i.instanceId ?? i.itemHash}-${idx}`} item={i} />)}
        </div>
        {data.truncated ? <p className="nest-muted" style={{ fontSize: '0.75rem' }}>Some rare items show without names (lookup limit).</p> : null}
      </section>

      {data.seals.length ? (
        <section className="nest-card">
          <h2>Seals &amp; titles</h2>
          <div className="nest-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
            {data.seals.map((s) => (
              <div key={s.hash} style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', opacity: s.complete ? 1 : 0.75 }}>
                {s.iconUrl ? <img src={s.iconUrl} alt="" width={36} height={36} /> : null}
                <div>
                  <strong>{s.title ?? s.name}</strong>
                  <div className="nest-muted" style={{ fontSize: '0.75rem' }}>{s.complete ? 'Complete' : `${s.progress}/${s.total}`}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="nest-card">
        <h2>Players you&apos;ve met</h2>
        {data.playersMet.length === 0 ? (
          <p className="nest-muted">Clear an activity with someone new to start your bond list.</p>
        ) : (
          <table className="nest-table">
            <thead><tr><th>Guardian</th><th>Clears together</th><th>First met</th></tr></thead>
            <tbody>
              {data.playersMet.map((p) => (
                <tr key={p.membershipId}>
                  <td>{p.displayName}</td>
                  <td>{p.runsTogether}</td>
                  <td>{new Date(p.firstAt).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
