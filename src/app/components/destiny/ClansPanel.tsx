'use client'

import { useCallback, useEffect, useState } from 'react'
import { Gamepad2, RefreshCw, Users, UsersRound } from 'lucide-react'
import type {
  ActiveFireteamLobbySummary,
  ClanProfile,
  OnlineSocialMember,
  SocialFriendGroup,
} from '@/lib/destiny/types'
import { GlassCard, ItemIcon, LoadingBlock, SectionTitle, StatusPill } from '@/app/components/destiny/DestinyUi'
import { destinyGhostBtn, destinySecondaryBtn, formatDuration, getDestinyTheme } from '@/app/components/destiny/destinyTheme'
import { cn } from '@/lib/utils'

type InviteChannel = 'app' | 'game'

function OnlineMemberRow({
  member,
  darkMode,
  appInviteEnabled,
  gameInviteEnabled,
  invitingKey,
  onInvite,
}: {
  member: OnlineSocialMember
  darkMode: boolean
  appInviteEnabled: boolean
  gameInviteEnabled: boolean
  invitingKey: string | null
  onInvite: (member: OnlineSocialMember, channel: InviteChannel) => void
}) {
  const t = getDestinyTheme(darkMode)
  const gameBusy = invitingKey === `${member.membershipId}-game`
  const appBusy = invitingKey === `${member.membershipId}-app`

  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-white/5 last:border-0">
      <div className="flex items-center gap-2 min-w-0">
        <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" title="Online" />
        {member.emblemUrl ? (
          <ItemIcon iconUrl={member.emblemUrl} name={member.displayName} size={28} className="rounded-full" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-purple-900/50 shrink-0" />
        )}
        <div className="min-w-0">
          <p className="text-white truncate">{member.bungieName ?? member.displayName}</p>
          {member.currentActivity ? (
            <p className={cn('text-[11px] text-sky-300/90 truncate')} title={member.currentActivity}>
              {member.currentActivity}
            </p>
          ) : member.inDestiny ? (
            <p className={cn('text-[11px]', t.muted)}>In Destiny 2</p>
          ) : member.isOnline ? (
            <p className={cn('text-[11px]', t.muted)}>Online on Bungie.net</p>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          disabled={gameBusy}
          onClick={() => onInvite(member, 'game')}
          className={cn(destinyGhostBtn(darkMode), 'px-2 py-1 text-[11px]')}
          title={
            gameInviteEnabled
              ? 'Send in-game fireteam invite via Bungie'
              : 'Copy Bungie name or send invite from Destiny 2 roster'
          }
        >
          <Gamepad2 className="w-3 h-3" />
          {gameBusy ? '…' : 'In-game'}
        </button>
        <button
          type="button"
          disabled={!appInviteEnabled || appBusy}
          onClick={() => onInvite(member, 'app')}
          className={cn(
            destinySecondaryBtn(darkMode),
            'px-2 py-1 text-[11px]',
            !appInviteEnabled && 'opacity-40 cursor-not-allowed'
          )}
          title={
            appInviteEnabled
              ? 'Invite to your open Top Nest lobby'
              : 'Host or join an open Top Nest lobby first'
          }
        >
          <Users className="w-3 h-3" />
          {appBusy ? '…' : 'App'}
        </button>
      </div>
    </div>
  )
}

function OnlineMemberList({
  members,
  emptyMessage,
  darkMode,
  appInviteEnabled,
  gameInviteEnabled,
  invitingKey,
  onInvite,
}: {
  members: OnlineSocialMember[]
  emptyMessage: string
  darkMode: boolean
  appInviteEnabled: boolean
  gameInviteEnabled: boolean
  invitingKey: string | null
  onInvite: (member: OnlineSocialMember, channel: InviteChannel) => void
}) {
  const t = getDestinyTheme(darkMode)

  if (!members.length) {
    return <p className={cn('text-sm', t.muted)}>{emptyMessage}</p>
  }

  return (
    <div className="tn-clan-online-list-shell">
      <div className="tn-clan-online-list tn-clan-online-list-scroll">
        {members.map((member) => (
          <OnlineMemberRow
            key={member.membershipId}
            member={member}
            darkMode={darkMode}
            appInviteEnabled={appInviteEnabled}
            gameInviteEnabled={gameInviteEnabled}
            invitingKey={invitingKey}
            onInvite={onInvite}
          />
        ))}
      </div>
    </div>
  )
}

function FriendsGroupCard({
  group,
  darkMode,
  appInviteEnabled,
  gameInviteEnabled,
  invitingKey,
  onInvite,
}: {
  group: SocialFriendGroup
  darkMode: boolean
  appInviteEnabled: boolean
  gameInviteEnabled: boolean
  invitingKey: string | null
  onInvite: (member: OnlineSocialMember, channel: InviteChannel) => void
}) {
  const t = getDestinyTheme(darkMode)
  const sourceLabel =
    group.source === 'topnest_lobby'
      ? 'Top Nest FlierTeam'
      : group.source === 'bungie_fireteam'
        ? 'Bungie.net fireteam'
        : 'Clan + friends'

  return (
    <div className="tn-friends-group-card">
      <div className="tn-friends-group-head">
        <UsersRound className="w-4 h-4 text-violet-300 shrink-0" />
        <div className="min-w-0">
          <p className="tn-friends-group-title">{group.label}</p>
          <p className={cn('text-[11px] mt-0.5', t.muted)}>
            {group.members.length} together · {sourceLabel}
          </p>
        </div>
      </div>
      <div className="tn-friends-group-members tn-clan-online-list-scroll">
        {group.members.map((member) => (
          <OnlineMemberRow
            key={`${group.id}-${member.membershipId}`}
            member={member}
            darkMode={darkMode}
            appInviteEnabled={appInviteEnabled}
            gameInviteEnabled={gameInviteEnabled}
            invitingKey={invitingKey}
            onInvite={onInvite}
          />
        ))}
      </div>
    </div>
  )
}

export default function ClansPanel({ darkMode }: { darkMode: boolean }) {
  const [clan, setClan] = useState<ClanProfile | null>(null)
  const [onlineFriends, setOnlineFriends] = useState<OnlineSocialMember[]>([])
  const [friendGroups, setFriendGroups] = useState<SocialFriendGroup[]>([])
  const [activeLobby, setActiveLobby] = useState<ActiveFireteamLobbySummary | null>(null)
  const [bungieFireteamId, setBungieFireteamId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [invitingKey, setInvitingKey] = useState<string | null>(null)
  const t = getDestinyTheme(darkMode)

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true)
    else setRefreshing(true)
    try {
      const res = await fetch('/api/destiny/clans', { credentials: 'include', cache: 'no-store' })
      if (res.ok) {
        const json = await res.json()
        setClan(json.clan ?? null)
        setOnlineFriends(json.onlineFriends ?? [])
        setFriendGroups(json.friendGroups ?? [])
        setActiveLobby(json.activeLobby ?? null)
        setBungieFireteamId(json.bungieFireteamId ?? null)
        setMessage(json.message ?? null)
      }
    } finally {
      if (!opts?.silent) setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const sendInvite = useCallback(
    async (member: OnlineSocialMember, channel: InviteChannel) => {
      setInvitingKey(`${member.membershipId}-${channel}`)
      setStatusMessage(null)
      try {
        const res = await fetch('/api/destiny/social/invite', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channel,
            membershipId: member.membershipId,
            membershipType: member.membershipType,
            displayName: member.bungieName ?? member.displayName,
            bungieFireteamId: bungieFireteamId ?? undefined,
          }),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
          setStatusMessage(json.error ?? 'Invite failed.')
          return
        }

        if (json.fallback && json.bungieName) {
          try {
            await navigator.clipboard.writeText(json.bungieName)
            setStatusMessage(`${json.message} Copied ${json.bungieName}.`)
          } catch {
            setStatusMessage(json.message ?? 'Invite unavailable — use Destiny 2 roster.')
          }
          return
        }

        setStatusMessage(json.message ?? 'Invite sent.')
      } finally {
        setInvitingKey(null)
      }
    },
    [bungieFireteamId]
  )

  if (loading) return <LoadingBlock darkMode={darkMode} />
  if (!clan) {
    return (
      <GlassCard darkMode={darkMode}>
        <p className={cn('text-sm leading-relaxed', t.muted)}>
          {message ?? 'No clan data. Reconnect Bungie if your session expired.'}
        </p>
        <button
          type="button"
          disabled={refreshing}
          onClick={() => void load({ silent: true })}
          className={cn(destinySecondaryBtn(darkMode), 'mt-4 text-xs py-1.5')}
        >
          <RefreshCw className={cn('w-3.5 h-3.5', refreshing && 'animate-spin')} />
          Refresh clan
        </button>
      </GlassCard>
    )
  }

  const onlineClanMembers = clan.onlineMembers ?? []
  const appInviteEnabled = activeLobby != null

  return (
    <div className="space-y-4">
      {statusMessage && (
        <GlassCard darkMode={darkMode}>
          <p className={cn('text-sm', t.muted)}>{statusMessage}</p>
        </GlassCard>
      )}

      {activeLobby && (
        <GlassCard darkMode={darkMode}>
          <p className={cn('text-sm', t.muted)}>
            {activeLobby.isHost ? 'Hosting' : 'In'} Top Nest lobby:{' '}
            <span className={t.gold}>{activeLobby.activityName}</span>
            {' · '}
            {activeLobby.hostDisplayName}
          </p>
          <p className={cn('text-xs mt-1', t.muted)}>App invites are enabled for this lobby.</p>
        </GlassCard>
      )}

      <GlassCard darkMode={darkMode}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {clan.emblemUrl && (
              <ItemIcon iconUrl={clan.emblemUrl} name={clan.name} size={48} className="rounded-xl" />
            )}
            <div>
              <h3 className="text-2xl font-bold text-white">
                {clan.tag} {clan.name}
              </h3>
              <p className={cn('text-sm mt-1', t.muted)}>
                {clan.memberCount} members · {onlineClanMembers.length} online · {clan.points} pts
              </p>
              {clan.recruitmentOpen && <StatusPill label="Recruiting" tone="green" />}
            </div>
          </div>
          <div className="text-right">
            <p className={cn('text-xs', t.muted)}>Full clan clears</p>
            <p className={cn('text-2xl font-bold', t.gold)}>{clan.fullClanClears}</p>
          </div>
        </div>
      </GlassCard>

      {friendGroups.length > 0 ? (
        <GlassCard darkMode={darkMode} className="tn-friends-groups-panel">
          <SectionTitle title="Friends Groups" darkMode={darkMode} />
          <p className={cn('text-sm mb-3', t.muted)}>
            Clanmates and friends spotted together right now — in FlierTeam rooms or Bungie fireteams.
          </p>
          <div className="space-y-3">
            {friendGroups.map((group) => (
              <FriendsGroupCard
                key={group.id}
                group={group}
                darkMode={darkMode}
                appInviteEnabled={appInviteEnabled}
                gameInviteEnabled={bungieFireteamId != null}
                invitingKey={invitingKey}
                onInvite={sendInvite}
              />
            ))}
          </div>
        </GlassCard>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassCard darkMode={darkMode} className="tn-clan-online-panel">
          <SectionTitle
            title={`Online clan members (${onlineClanMembers.length})`}
            subtitle={
              onlineClanMembers.length > 6
                ? 'Scroll to see everyone online in your clan right now.'
                : 'Everyone online in your clan from Bungie roster presence.'
            }
            darkMode={darkMode}
          />
          <OnlineMemberList
            members={onlineClanMembers}
            emptyMessage="No clan members online right now."
            darkMode={darkMode}
            appInviteEnabled={appInviteEnabled}
            gameInviteEnabled={bungieFireteamId != null}
            invitingKey={invitingKey}
            onInvite={sendInvite}
          />
        </GlassCard>

        <GlassCard darkMode={darkMode} className="tn-clan-online-panel">
          <SectionTitle
            title={`Online friends (${onlineFriends.length})`}
            subtitle={
              onlineFriends.length > 6
                ? 'Scroll to see all Bungie friends online or in Destiny 2.'
                : 'Bungie friends online on Bungie.net or playing Destiny 2.'
            }
            darkMode={darkMode}
          />
          <OnlineMemberList
            members={onlineFriends}
            emptyMessage="No Bungie friends online right now."
            darkMode={darkMode}
            appInviteEnabled={appInviteEnabled}
            gameInviteEnabled={bungieFireteamId != null}
            invitingKey={invitingKey}
            onInvite={sendInvite}
          />
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GlassCard darkMode={darkMode}>
          <SectionTitle title="Average clear times" darkMode={darkMode} />
          <p className={cn('text-sm', t.muted)}>
            Raid: <span className={t.gold}>{formatDuration(clan.avgRaidClearSeconds)}</span>
          </p>
          <p className={cn('text-sm mt-1', t.muted)}>
            Dungeon: <span className={t.gold}>{formatDuration(clan.avgDungeonClearSeconds)}</span>
          </p>
        </GlassCard>
        <GlassCard darkMode={darkMode}>
          <SectionTitle title="Achievements" darkMode={darkMode} />
          <div className="flex flex-wrap gap-2">
            {clan.achievements.map((a) => (
              <StatusPill key={a} label={a} tone="purple" />
            ))}
          </div>
        </GlassCard>
      </div>

      <GlassCard darkMode={darkMode} className="tn-clan-online-panel">
        <SectionTitle
          title={`Clan roster (${clan.topMembers.length})`}
          subtitle="Full member list from Bungie — scroll when your clan is large."
          darkMode={darkMode}
        />
        <div className="tn-clan-online-list-shell">
          <div className="tn-clan-online-list tn-clan-online-list-scroll">
            {clan.topMembers.map((m) => (
              <div
                key={m.displayName}
                className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={cn(
                      'w-2 h-2 rounded-full shrink-0',
                      m.isOnline ? 'bg-emerald-400' : 'bg-white/20'
                    )}
                    title={m.isOnline ? 'Online' : 'Offline'}
                  />
                  {m.emblemUrl && (
                    <ItemIcon iconUrl={m.emblemUrl} name={m.displayName} size={28} className="rounded-full" />
                  )}
                  <span className="text-white truncate">{m.displayName}</span>
                </div>
                {m.points > 0 ? <span className={cn('text-sm', t.gold)}>{m.points} pts</span> : null}
              </div>
            ))}
          </div>
        </div>
      </GlassCard>
    </div>
  )
}
