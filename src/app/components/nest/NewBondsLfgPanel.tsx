'use client'

import { useEffect, useState } from 'react'
import { Copy, Sparkles, Users } from 'lucide-react'
import type { LfgCandidate, LfgLobbySuggestion } from '@/lib/destiny/lfgSuggestions'

interface Payload {
  lobbies: LfgLobbySuggestion[]
  players: LfgCandidate[]
  bondedCount: number
}

/** LFG discovery: rooms with the most new faces + recently active Guardians you haven't met. */
export default function NewBondsLfgPanel() {
  const [data, setData] = useState<Payload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    fetch('/api/destiny/lfg/suggestions', { credentials: 'include' })
      .then(async (r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((json) => alive && setData(json))
      .catch(() => alive && setError('Sign in with Bungie to see new-friend suggestions.'))
    return () => {
      alive = false
    }
  }, [])

  const copy = async (name: string) => {
    try {
      await navigator.clipboard.writeText(name)
      setCopied(name)
      setTimeout(() => setCopied(null), 1500)
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <section className="nest-card" aria-labelledby="nest-lfg-title">
      <div className="nest-kicker">
        <Sparkles size={12} style={{ display: 'inline' }} /> New Bonds
      </div>
      <h2 id="nest-lfg-title">Find Guardians you haven&apos;t met</h2>
      <p className="nest-muted">
        Every first-time fireteam member is worth bonus points.
        {data ? ` You have bonded with ${data.bondedCount} Guardian${data.bondedCount === 1 ? '' : 's'} so far.` : ''}
      </p>
      {error ? <p className="nest-muted">{error}</p> : null}
      {data ? (
        <div className="nest-grid" style={{ marginTop: '0.8rem' }}>
          <div>
            <h3>Rooms with new faces</h3>
            {data.lobbies.length === 0 ? (
              <p className="nest-muted">No open rooms right now — create one below and tag it “new-friendly”.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.5rem' }}>
                {data.lobbies.map(({ lobby, newFaces }) => (
                  <li key={lobby.id} className="nest-card" style={{ padding: '0.6rem 0.8rem' }}>
                    <strong>{lobby.activityName}</strong>
                    <div className="nest-muted" style={{ fontSize: '0.8rem' }}>
                      Host {lobby.hostDisplayName} · {lobby.currentPlayers}/{lobby.maxPlayers}
                    </div>
                    <span className="nest-bond-pill">
                      <Users size={12} /> {newFaces} new face{newFaces === 1 ? '' : 's'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3>Recently active, not yet met</h3>
            {data.players.length === 0 ? (
              <p className="nest-muted">You&apos;ve met everyone active lately — legend.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.4rem' }}>
                {data.players.map((p) => (
                  <li key={p.membershipId} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <span>{p.displayName}</span>
                    <button type="button" className="nest-btn" onClick={() => void copy(p.displayName)}>
                      <Copy size={12} /> {copied === p.displayName ? 'Copied' : 'Copy name'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </section>
  )
}
