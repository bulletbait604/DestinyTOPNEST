'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import {
  communityActivityTagLabel,
  communityClassLabel,
  type CommunityBuildCommentPublic,
  type CommunityBuildContent,
  type CommunityBuildPublic,
} from '@/lib/destiny/communityBuildModel'
import CommunityBuildForm from '@/app/components/destiny/community/CommunityBuildForm'
import { EmptyBlock, GlassCard, ItemIcon, LoadingBlock, SectionTitle } from '@/app/components/destiny/DestinyUi'
import { destinyPrimaryBtn, destinySecondaryBtn, getDestinyTheme } from '@/app/components/destiny/destinyTheme'
import { cn } from '@/lib/utils'

async function errorMessage(res: Response, fallback: string): Promise<string> {
  const json = (await res.json().catch(() => ({}))) as { error?: string }
  return json.error || fallback
}

function PlugList({
  title,
  plugs,
}: {
  title: string
  plugs: { name: string; iconUrl?: string }[]
}) {
  if (!plugs.length) return null
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-white/45 mb-2">{title}</p>
      <ul className="space-y-1.5">
        {plugs.map((plug) => (
          <li key={`${title}-${plug.name}`} className="flex items-center gap-2 text-sm text-white/85">
            <ItemIcon iconUrl={plug.iconUrl} name={plug.name} size={28} />
            <span>{plug.name}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function CommunityBuildDetail({
  buildId,
  darkMode,
  signedIn,
  onLogin,
}: {
  buildId: string
  darkMode: boolean
  signedIn: boolean
  onLogin?: () => void
}) {
  const t = getDestinyTheme(darkMode)
  const [build, setBuild] = useState<CommunityBuildPublic | null>(null)
  const [comments, setComments] = useState<CommunityBuildCommentPublic[]>([])
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [commentBody, setCommentBody] = useState('')
  const [acting, setActing] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setMissing(false)
    try {
      const [buildRes, commentRes] = await Promise.all([
        fetch(`/api/destiny/community-builds/${buildId}`, { credentials: 'include' }),
        fetch(`/api/destiny/community-builds/${buildId}/comments`, { credentials: 'include' }),
      ])
      if (buildRes.status === 404) {
        setMissing(true)
        setBuild(null)
        return
      }
      if (!buildRes.ok) throw new Error(await errorMessage(buildRes, 'Could not load this build.'))
      const buildJson = (await buildRes.json()) as { build: CommunityBuildPublic }
      setBuild(buildJson.build)
      if (commentRes.ok) {
        const commentJson = (await commentRes.json()) as { comments: CommunityBuildCommentPublic[] }
        setComments(commentJson.comments ?? [])
      } else {
        setComments([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this build.')
    } finally {
      setLoading(false)
    }
  }, [buildId])

  useEffect(() => {
    void load()
  }, [load])

  async function react(kind: 'vote' | 'save') {
    if (!signedIn) {
      onLogin?.()
      return
    }
    setActing(kind)
    setError(null)
    try {
      const res = await fetch(`/api/destiny/community-builds/${buildId}/${kind}`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) throw new Error(await errorMessage(res, 'Could not update this build.'))
      const json = (await res.json()) as {
        upvoted?: boolean
        upvoteCount?: number
        saved?: boolean
        saveCount?: number
      }
      setBuild((current) =>
        current
          ? {
              ...current,
              viewerUpvoted: json.upvoted ?? current.viewerUpvoted,
              upvoteCount: json.upvoteCount ?? current.upvoteCount,
              viewerSaved: json.saved ?? current.viewerSaved,
              saveCount: json.saveCount ?? current.saveCount,
            }
          : current
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update this build.')
    } finally {
      setActing(null)
    }
  }

  async function saveEdit(content: CommunityBuildContent) {
    const res = await fetch(`/api/destiny/community-builds/${buildId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(content),
    })
    if (!res.ok) throw new Error(await errorMessage(res, 'Could not save changes.'))
    setEditing(false)
    await load()
  }

  async function removeBuild() {
    if (!window.confirm('Delete this shared build? This cannot be undone.')) return
    setActing('delete')
    try {
      const res = await fetch(`/api/destiny/community-builds/${buildId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) throw new Error(await errorMessage(res, 'Could not delete this build.'))
      window.location.assign('/?tab=loadouts&section=shared')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete this build.')
      setActing(null)
    }
  }

  async function moderate(action: 'hide' | 'restore' | 'remove') {
    setActing(action)
    setError(null)
    try {
      const res = await fetch('/api/destiny/admin/community-builds', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, buildId }),
      })
      if (!res.ok) throw new Error(await errorMessage(res, 'Moderation failed.'))
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Moderation failed.')
    } finally {
      setActing(null)
    }
  }

  async function postComment(event: React.FormEvent) {
    event.preventDefault()
    if (!signedIn) {
      onLogin?.()
      return
    }
    setActing('comment')
    setError(null)
    try {
      const res = await fetch(`/api/destiny/community-builds/${buildId}/comments`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: commentBody }),
      })
      if (!res.ok) throw new Error(await errorMessage(res, 'Could not post that comment.'))
      setCommentBody('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post that comment.')
    } finally {
      setActing(null)
    }
  }

  async function deleteComment(commentId: string) {
    setActing(commentId)
    setError(null)
    try {
      const res = await fetch(`/api/destiny/community-builds/${buildId}/comments/${commentId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) throw new Error(await errorMessage(res, 'Could not delete that comment.'))
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete that comment.')
    } finally {
      setActing(null)
    }
  }

  if (loading) return <LoadingBlock darkMode={darkMode} label="Loading build…" />
  if (missing || !build) {
    return (
      <EmptyBlock
        darkMode={darkMode}
        message="This build is not available"
        hint="It may have been removed, or the link is out of date."
      />
    )
  }

  return (
    <div className="space-y-4">
      <Link href="/?tab=loadouts&section=shared" className={cn('text-sm underline-offset-2 hover:underline', t.blue)}>
        Back to shared builds
      </Link>

      <GlassCard darkMode={darkMode}>
        <div className="flex items-start justify-between gap-3">
          <SectionTitle
            title={build.name}
            subtitle={`${communityClassLabel(build.characterClass)} · ${build.subclass} · ${build.ownerDisplayName}`}
            iconUrl={build.ownerEmblemUrl}
            darkMode={darkMode}
          />
          {build.status !== 'published' ? (
            <span className="text-[11px] uppercase tracking-wide text-amber-200">{build.status}</span>
          ) : null}
        </div>
        {build.moderationNote ? <p className={cn('text-sm mt-3', t.muted)}>Moderator note: {build.moderationNote}</p> : null}
        {build.source === 'equipped' ? (
          <p className={cn('text-xs mt-3', t.caption)}>Started from an equipped character loadout.</p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className={destinySecondaryBtn(darkMode)}
            aria-pressed={build.viewerUpvoted}
            disabled={acting !== null}
            onClick={() => void react('vote')}
          >
            {acting === 'vote' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {build.viewerUpvoted ? 'Upvoted' : 'Upvote'} · {build.upvoteCount}
          </button>
          <button
            type="button"
            className={destinySecondaryBtn(darkMode)}
            aria-pressed={build.viewerSaved}
            disabled={acting !== null}
            onClick={() => void react('save')}
          >
            {build.viewerSaved ? 'Saved' : 'Save'} · {build.saveCount}
          </button>
          {build.canEdit ? (
            <button type="button" className={destinySecondaryBtn(darkMode)} onClick={() => setEditing((open) => !open)}>
              {editing ? 'Close editor' : 'Edit'}
            </button>
          ) : null}
          {build.canEdit ? (
            <button type="button" className={destinySecondaryBtn(darkMode)} disabled={acting !== null} onClick={() => void removeBuild()}>
              Delete
            </button>
          ) : null}
        </div>

        {build.canModerate ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className={destinySecondaryBtn(darkMode)} disabled={acting !== null} onClick={() => void moderate('hide')}>
              Hide
            </button>
            <button type="button" className={destinySecondaryBtn(darkMode)} disabled={acting !== null} onClick={() => void moderate('restore')}>
              Restore
            </button>
            <button type="button" className={destinySecondaryBtn(darkMode)} disabled={acting !== null} onClick={() => void moderate('remove')}>
              Remove
            </button>
          </div>
        ) : null}

        {editing ? (
          <div className="mt-5">
            <CommunityBuildForm
              darkMode={darkMode}
              initial={build}
              submitLabel="Save changes"
              onCancel={() => setEditing(false)}
              onSubmit={saveEdit}
            />
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="flex flex-wrap gap-1.5">
              {build.activityTags.map((tag) => (
                <span key={tag} className="rounded-md border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/70">
                  {communityActivityTagLabel(tag)}
                </span>
              ))}
              {build.statFocus.map((stat) => (
                <span key={stat} className="rounded-md border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-[var(--tn-arc)]">
                  {stat}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <ItemIcon item={build.exoticArmorRef} name={build.exoticArmor || 'Exotic armor'} size={40} />
                <div>
                  <p className={cn('text-[11px] uppercase tracking-wide', t.caption)}>Exotic armor</p>
                  <p className="text-sm text-white">{build.exoticArmor || '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ItemIcon item={build.exoticWeaponRef} name={build.exoticWeapon || 'Exotic weapon'} size={40} />
                <div>
                  <p className={cn('text-[11px] uppercase tracking-wide', t.caption)}>Exotic weapon</p>
                  <p className="text-sm text-white">{build.exoticWeapon || '—'}</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <PlugList title="Aspects" plugs={build.aspects} />
              <PlugList title="Fragments" plugs={build.fragments} />
              <PlugList title="Mods" plugs={build.mods} />
            </div>
            {build.description ? (
              <p className={cn('text-sm whitespace-pre-wrap leading-relaxed', t.body)}>{build.description}</p>
            ) : (
              <p className={cn('text-sm', t.muted)}>No description.</p>
            )}
          </div>
        )}
        {error ? (
          <p className="text-sm text-red-300 mt-4" role="alert">
            {error}
          </p>
        ) : null}
      </GlassCard>

      <GlassCard darkMode={darkMode}>
        <SectionTitle
          title="Comments"
          subtitle="Optional. Keep it about the build."
          darkMode={darkMode}
        />
        <div className="mt-4 space-y-3">
          {comments.length === 0 ? <p className={cn('text-sm', t.muted)}>No comments yet.</p> : null}
          {comments.map((comment) => (
            <div key={comment.id} className="d2-panel-inset rounded-lg p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-white">
                  {comment.authorDisplayName}
                  {comment.status === 'hidden' ? <span className="ml-2 text-[11px] uppercase text-amber-200">Hidden</span> : null}
                </p>
                {comment.viewerOwns || build.canModerate ? (
                  <button
                    type="button"
                    className="text-xs text-white/60 hover:text-white min-h-[44px] px-2"
                    disabled={acting !== null}
                    onClick={() => void deleteComment(comment.id)}
                  >
                    Delete
                  </button>
                ) : null}
              </div>
              <p className={cn('text-sm whitespace-pre-wrap mt-1', t.body)}>{comment.body}</p>
            </div>
          ))}
        </div>
        {signedIn ? (
          <form className="mt-4 space-y-2" onSubmit={(event) => void postComment(event)}>
            <label className="block">
              <span className="sr-only">Comment</span>
              <textarea
                value={commentBody}
                onChange={(event) => setCommentBody(event.target.value)}
                maxLength={500}
                className="w-full min-h-[88px] rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/35"
                placeholder="Add an optional note"
              />
            </label>
            <button type="submit" className={destinyPrimaryBtn(darkMode)} disabled={acting !== null || !commentBody.trim()}>
              {acting === 'comment' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Post comment
            </button>
          </form>
        ) : (
          <button type="button" className={cn(destinySecondaryBtn(darkMode), 'mt-4')} onClick={onLogin}>
            Sign in to comment
          </button>
        )}
      </GlassCard>
    </div>
  )
}
