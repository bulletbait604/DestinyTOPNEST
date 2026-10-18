'use client'

import { FormEvent, useState } from 'react'
import { PageHeader } from '@/app/components/hub/PageHeader'
import { QUEST_KINDS, type QuestKind, type QuestWithProgress } from '@/lib/destiny/questCatalog'

const KIND_LABEL: Record<QuestKind | 'all', string> = {
  all: 'All',
  quest: 'Quests',
  pursuit: 'Pursuits',
  exotic_quest: 'Exotic quests',
  catalyst: 'Catalysts',
}

export default function QuestLookup({ onLogin }: { onLogin?: () => void }) {
  const [q, setQ] = useState('')
  const [kind, setKind] = useState<QuestKind | 'all'>('all')
  const [quests, setQuests] = useState<QuestWithProgress[]>([])
  const [signedIn, setSignedIn] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)

  async function search(nextKind = kind, nextQuery = q) {
    if (nextQuery.trim().length < 2) {
      setError('Type at least two characters.')
      return
    }
    setLoading(true)
    setError(null)
    setSearched(true)
    try {
      const params = new URLSearchParams({ q: nextQuery.trim(), kind: nextKind })
      const res = await fetch(`/api/destiny/quests?${params}`, { credentials: 'include' })
      const json = (await res.json()) as { error?: string; quests?: QuestWithProgress[]; signedIn?: boolean }
      if (!res.ok) throw new Error(json.error || 'Quest search failed.')
      setQuests(json.quests ?? [])
      setSignedIn(Boolean(json.signedIn))
    } catch (err) {
      setQuests([])
      setError(err instanceof Error ? err.message : 'Quest search failed.')
    } finally {
      setLoading(false)
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    void search()
  }

  return (
    <section className="gh-stack" aria-labelledby="gh-quests-title">
      <PageHeader
        kicker="Manifest"
        title="Quest lookup"
        subtitle="Search quests, pursuits, exotic quests, and catalysts. Sign in for your progress."
        titleId="gh-quests-title"
      />
      <form className="gh-search" onSubmit={onSubmit}>
        <label className="gh-sr" htmlFor="quest-search">
          Search quests
        </label>
        <input
          id="quest-search"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Witch Queen, Xenophage, catalyst"
        />
        <button type="submit">{loading ? 'Searching…' : 'Search'}</button>
      </form>
      <div className="gh-tabs" role="tablist" aria-label="Quest kind">
        {(['all', ...QUEST_KINDS] as const).map((value) => (
          <button
            key={value}
            type="button"
            className="gh-tab"
            role="tab"
            aria-selected={kind === value}
            onClick={() => {
              setKind(value)
              if (q.trim().length >= 2) void search(value, q)
            }}
          >
            {KIND_LABEL[value]}
          </button>
        ))}
      </div>
      {error ? (
        <p className="gh-alert" role="alert">
          {error}
        </p>
      ) : null}
      {searched && !loading && quests.length === 0 && !error ? (
        <div className="gh-empty">
          <p className="gh-card-title">No matching quests</p>
          <p className="gh-muted">Try the item name from the manifest, such as a catalyst or exotic quest.</p>
        </div>
      ) : null}
      <ul className="gh-directory">
        {quests.map((quest) => (
          <li key={quest.hash}>
            <article className="gh-person">
              <span className="gh-person-name">{quest.name}</span>
              <span className="gh-muted">
                {KIND_LABEL[quest.kind]}
                {quest.tier ? ` · ${quest.tier}` : ''}
                {signedIn ? ` · ${quest.progress.state.replace('_', ' ')}` : ''}
              </span>
              {quest.description ? <span className="gh-muted">{quest.description}</span> : null}
              {quest.progress.objectives.length > 0 ? (
                <span className="gh-badge-row">
                  {quest.progress.objectives.map((objective, index) => (
                    <span key={`${quest.hash}-${index}`} className="gh-badge">
                      {objective.progress}/{objective.completion || '—'}
                    </span>
                  ))}
                </span>
              ) : null}
            </article>
          </li>
        ))}
      </ul>
      {!signedIn && onLogin ? (
        <button type="button" className="gh-btn gh-btn-primary" onClick={onLogin}>
          Sign in to see your progress
        </button>
      ) : null}
    </section>
  )
}
