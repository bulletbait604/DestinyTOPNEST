'use client'

import { useCallback, useEffect, useState } from 'react'
import { Gamepad2, Mic, Plus, Trash2, Users } from 'lucide-react'
import FireteamReviewSection from '@/app/components/destiny/FireteamReviewSection'
import FlierTeamCreateWizard from '@/app/components/destiny/FlierTeamCreateWizard'
import FlierTeamMemberModal from '@/app/components/destiny/FlierTeamMemberModal'
import { useBungieLink } from '@/hooks/useBungieLink'
import type {
  ActiveFireteamLobbySummary,
  FireteamLobby,
  FlierTeamApplication,
  FlierTeamLobbyMember,
} from '@/lib/destiny/types'
import {
  ActivityBadge,
  EmptyBlock,
  GlassCard,
  LoadingBlock,
  SectionTitle,
  StatusPill,
} from '@/app/components/destiny/DestinyUi'
import {
  destinyPrimaryBtn,
  destinySecondaryBtn,
  getDestinyTheme,
  platformIcon,
} from '@/app/components/destiny/destinyTheme'
import { cn } from '@/lib/utils'

function memberCount(lobby: FireteamLobby): number {
  return lobby.currentPlayers ?? 1 + (lobby.memberRoster?.length ?? 0)
}

function isFull(lobby: FireteamLobby): boolean {
  return memberCount(lobby) >= lobby.maxPlayers
}

function MemberCard({
  member,
  darkMode,
  onClick,
}: {
  member: FlierTeamLobbyMember
  darkMode: boolean
  onClick: () => void
}) {
  const t = getDestinyTheme(darkMode)
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1 p-2 rounded-xl border border-white/10 bg-white/[0.03]',
        'hover:bg-white/[0.08] hover:border-amber-500/30 transition-colors min-w-[80px] cursor-pointer'
      )}
      title="View guardian build"
    >
      {member.emblemUrl ? (
        <img src={member.emblemUrl} alt="" className="w-10 h-10 rounded-full border border-amber-500/20" />
      ) : (
        <div className="w-10 h-10 rounded-full bg-purple-900/50" />
      )}
      <span className="text-xs text-white truncate max-w-[72px]">{member.displayName}</span>
      <span className={cn('text-[10px]', t.muted)}>
        PL {member.powerLevel ?? '—'} · GR {member.guardianRank ?? '—'}
      </span>
    </button>
  )
}

function RoomCard({
  lobby,
  darkMode,
  myUserId,
  onRefresh,
  onViewMember,
}: {
  lobby: FireteamLobby
  darkMode: boolean
  myUserId?: string
  onRefresh: () => void
  onViewMember: (userId: string, name: string) => void
}) {
  const t = getDestinyTheme(darkMode)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const isHost = lobby.hostUserId === myUserId
  const inRoom =
    isHost || lobby.memberRoster?.some((m) => m.userId === myUserId)
  const full = isFull(lobby)
  const members: FlierTeamLobbyMember[] = [
    {
      userId: lobby.hostUserId,
      displayName: lobby.hostDisplayName,
      emblemUrl: lobby.hostEmblemUrl,
      characterClass: lobby.hostClass,
      powerLevel: lobby.hostPowerLevel,
      guardianRank: lobby.hostGuardianRank,
      joinedAt: lobby.createdAt,
    },
    ...(lobby.memberRoster ?? []),
  ]

  const act = async (action: string, extra?: Record<string, string>) => {
    if (action === 'delete') {
      const ok = window.confirm(
        'Delete this FlierTeam room? This cannot be undone and all members will be removed.'
      )
      if (!ok) return
    }

    setBusy(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/destiny/fireteam/${lobby.id}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'Action failed')
      setMessage(json.message ?? 'Done.')
      onRefresh()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={cn('rounded-2xl p-5 transition-colors', t.glassInset, 'hover:bg-white/[0.04]')}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <ActivityBadge
            activityRef={lobby.activityRef}
            name={lobby.activityName}
            darkMode={darkMode}
            size={36}
          />
          <p className={cn('text-xs mt-1', t.muted)}>
            {(lobby.activityKind ?? lobby.activityType).toString().replace(/_/g, ' ')}
            {lobby.encounterName ? ` · ${lobby.encounterName}` : ''}
          </p>
        </div>
        <StatusPill label={full ? 'full' : lobby.status} tone={full ? 'green' : 'blue'} />
      </div>

      {lobby.roomNotes ? (
        <p className={cn('text-xs mt-2 italic', t.muted)}>{lobby.roomNotes}</p>
      ) : null}
      {lobby.customRequirements ? (
        <p className={cn('text-xs mt-1', t.gold)}>{lobby.customRequirements}</p>
      ) : null}

      <div className="flex flex-wrap gap-2 mt-3">
        {lobby.tags.slice(0, 8).map((tag) => (
          <StatusPill key={tag} label={tag} tone="purple" />
        ))}
        {lobby.joinMode === 'apply' ? (
          <StatusPill label="Apply to join" tone="blue" />
        ) : (
          <StatusPill label="Instant join" tone="green" />
        )}
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        {members.map((m) => (
          <MemberCard
            key={m.userId}
            member={m}
            darkMode={darkMode}
            onClick={() => onViewMember(m.userId, m.displayName)}
          />
        ))}
        {Array.from({ length: Math.max(0, lobby.maxPlayers - members.length) }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="w-[80px] h-[72px] rounded-xl border border-dashed border-white/10 flex items-center justify-center"
          >
            <span className={cn('text-xs', t.muted)}>Open</span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mt-3 text-xs">
        <span className={cn('flex items-center gap-1', t.blue)}>
          <Users className="w-3 h-3" />
          {memberCount(lobby)}/{lobby.maxPlayers}
        </span>
        <span className={t.muted}>{platformIcon(lobby.platform)}</span>
        {lobby.micRequired && (
          <span className={cn('flex items-center gap-1', t.gold)}>
            <Mic className="w-3 h-3" /> Mic
          </span>
        )}
      </div>

      {message ? <p className={cn('text-xs mt-2', t.muted)}>{message}</p> : null}

      <div className="flex flex-wrap gap-2 mt-4">
        {inRoom ? (
          <>
            <button
              type="button"
              disabled={busy || !full || !isHost}
              onClick={() => void act('invite-ingame')}
              className={cn(
                destinyPrimaryBtn(darkMode),
                'flex-1 min-w-[140px] text-xs py-2',
                (!full || !isHost) && 'opacity-40 cursor-not-allowed'
              )}
              title={
                !full
                  ? 'Fill the room in-app before sending in-game invites'
                  : 'Send Destiny 2 fireteam invites to all members'
              }
            >
              <Gamepad2 className="w-4 h-4" />
              Invite in-game
            </button>
            {isHost ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void act('delete')}
                className={cn(
                  destinySecondaryBtn(darkMode),
                  'text-xs py-2 text-red-200/90 border-red-500/30 hover:border-red-400/50'
                )}
              >
                <Trash2 className="w-4 h-4" />
                Delete room
              </button>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => void act('leave')}
                className={cn(destinySecondaryBtn(darkMode), 'text-xs py-2')}
              >
                Leave
              </button>
            )}
          </>
        ) : full ? (
          <span className={cn('text-sm', t.muted)}>Room full</span>
        ) : lobby.joinMode === 'apply' ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void act('apply')}
            className={cn(destinySecondaryBtn(darkMode), 'w-full')}
          >
            Apply to join
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => void act('join')}
            className={cn(destinyPrimaryBtn(darkMode), 'w-full')}
          >
            Join room
          </button>
        )}
      </div>

      {isHost && lobby.pendingApplications?.length ? (
        <PendingApplications
          darkMode={darkMode}
          applications={lobby.pendingApplications}
          busy={busy}
          onApprove={(userId) => void act('approve', { applicantUserId: userId })}
          onViewMember={onViewMember}
        />
      ) : null}
    </div>
  )
}

function PendingApplications({
  darkMode,
  applications,
  busy,
  onApprove,
  onViewMember,
}: {
  darkMode: boolean
  applications: FlierTeamApplication[]
  busy: boolean
  onApprove: (userId: string) => void
  onViewMember: (userId: string, name: string) => void
}) {
  const t = getDestinyTheme(darkMode)
  return (
    <div className="mt-4 pt-3 border-t border-white/10">
      <p className={cn('text-xs font-semibold mb-2', t.gold)}>Pending applications</p>
      {applications.map((app) => (
        <div key={app.userId} className="flex items-center justify-between gap-2 py-1.5">
          <button
            type="button"
            onClick={() => onViewMember(app.userId, app.displayName)}
            className="text-sm text-white hover:text-amber-200 underline-offset-2 hover:underline text-left"
            title="View applicant build"
          >
            {app.displayName}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onApprove(app.userId)}
            className={cn(destinySecondaryBtn(darkMode), 'text-xs py-1 px-2 shrink-0')}
          >
            Approve
          </button>
        </div>
      ))}
    </div>
  )
}

export default function FlierTeamFinderPanel({ darkMode }: { darkMode: boolean }) {
  const [lobbies, setLobbies] = useState<FireteamLobby[]>([])
  const [myRoom, setMyRoom] = useState<ActiveFireteamLobbySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [memberModal, setMemberModal] = useState<{ userId: string; name: string; lobbyId: string } | null>(null)
  const [myUserId, setMyUserId] = useState<string>()
  const t = getDestinyTheme(darkMode)
  const bungie = useBungieLink()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [ftRes, sessionRes] = await Promise.all([
        fetch('/api/destiny/fireteam', { credentials: 'include' }),
        fetch('/api/auth/session', { credentials: 'include' }),
      ])
      if (ftRes.ok) {
        const json = await ftRes.json()
        setLobbies(json.lobbies ?? [])
        setMyRoom(json.myRoom ?? null)
      }
      if (sessionRes.ok) {
        const session = await sessionRes.json()
        setMyUserId(session.user?.username?.toLowerCase())
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const myLobby = myRoom ? lobbies.find((l) => l.id === myRoom.id) : undefined
  const browseLobbies = lobbies.filter((l) => l.id !== myRoom?.id)

  return (
    <div className="space-y-6">
      <FireteamReviewSection darkMode={darkMode} linked={bungie.linked} />

      <GlassCard darkMode={darkMode}>
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <SectionTitle title="FlierTeam Finder" darkMode={darkMode} />
            <p className={cn('text-sm mt-1 max-w-xl', t.muted)}>
              Create a room like Destiny&apos;s Fireteam Finder — pick activity, encounter, requirements, then
              fill your squad in-app before launching in-game invites.
            </p>
          </div>
          <button
            type="button"
            disabled={!bungie.linked || Boolean(myRoom)}
            onClick={() => setShowCreate(true)}
            className={cn(
              destinyPrimaryBtn(darkMode),
              (!bungie.linked || myRoom) && 'opacity-50 cursor-not-allowed'
            )}
            title={myRoom ? 'Leave your current room first' : 'Reconnect Bungie to create a room'}
          >
            <Plus className="w-4 h-4" />
            Create room
          </button>
        </div>

        {myLobby ? (
          <div className="mb-8">
            <p className={cn('text-xs uppercase tracking-wider mb-3', t.gold)}>Your room</p>
            <RoomCard
              lobby={myLobby}
              darkMode={darkMode}
              myUserId={myUserId}
              onRefresh={load}
              onViewMember={(userId, name) =>
                setMemberModal({ userId, name, lobbyId: myLobby.id })
              }
            />
          </div>
        ) : null}

        {loading ? (
          <LoadingBlock darkMode={darkMode} />
        ) : browseLobbies.length === 0 && !myLobby ? (
          <EmptyBlock
            darkMode={darkMode}
            message="No FlierTeam rooms open"
            hint="Create the first room for this reset, or check back after Tuesday."
          />
        ) : browseLobbies.length > 0 ? (
          <>
            <p className={cn('text-xs uppercase tracking-wider mb-3', t.muted)}>Browse rooms</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {browseLobbies.map((lobby) => (
                <RoomCard
                  key={lobby.id}
                  lobby={lobby}
                  darkMode={darkMode}
                  myUserId={myUserId}
                  onRefresh={load}
                  onViewMember={(userId, name) =>
                    setMemberModal({ userId, name, lobbyId: lobby.id })
                  }
                />
              ))}
            </div>
          </>
        ) : null}
      </GlassCard>

      {showCreate ? (
        <FlierTeamCreateWizard
          darkMode={darkMode}
          onClose={() => setShowCreate(false)}
          onCreated={load}
        />
      ) : null}

      {memberModal ? (
        <FlierTeamMemberModal
          darkMode={darkMode}
          lobbyId={memberModal.lobbyId}
          userId={memberModal.userId}
          displayName={memberModal.name}
          onClose={() => setMemberModal(null)}
        />
      ) : null}
    </div>
  )
}
