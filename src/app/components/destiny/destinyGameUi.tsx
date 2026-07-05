'use client'

import { useCallback, useState } from 'react'
import type { DestinyIconRef } from '@/lib/destiny/types'
import { itemExternalUrl } from '@/lib/destiny/itemExternalLinks'
import { ItemExternalLink } from '@/app/components/destiny/ItemLink'
import { D2_ARMOR_STAT_COLORS, type ArmorStatKey } from '@/lib/destiny/armorStats'
import { getDestinyTheme, tierGlowClass } from '@/app/components/destiny/destinyTheme'
import { cn } from '@/lib/utils'

async function fetchManifestIcon(item?: DestinyIconRef, name?: string): Promise<string | undefined> {
  const params = new URLSearchParams()
  if (item?.hash) params.set('hash', String(item.hash))
  if (item?.entityType) params.set('entity', item.entityType)
  if (item?.name || name) params.set('name', item?.name ?? name ?? '')
  if (!params.get('name') && !params.get('hash')) return undefined

  const res = await fetch(`/api/destiny/manifest/resolve?${params.toString()}`, { cache: 'no-store' })
  if (!res.ok) return undefined
  const json = (await res.json()) as { iconUrl?: string }
  return json.iconUrl
}

/** Large glowing Bungie icon — abilities, weapons, aspects. */
export function GlowIcon({
  item,
  name,
  iconUrl,
  size = 52,
  glow = 'gold',
  className,
  title,
}: {
  item?: DestinyIconRef
  name?: string
  iconUrl?: string
  size?: number
  glow?: 'gold' | 'arc' | 'void' | 'solar' | 'strand' | 'stasis' | 'neutral' | 'auto'
  className?: string
  title?: string
}) {
  const url = item?.iconUrl ?? iconUrl
  const label = item?.name ?? name ?? ''
  const resolvedGlow = glow === 'auto' ? tierGlowClass(item?.tierLabel) : glow
  const [failed, setFailed] = useState(false)
  const [resolvedUrl, setResolvedUrl] = useState<string | undefined>()
  const displayUrl = resolvedUrl ?? url

  const handleImageError = useCallback(() => {
    if (resolvedUrl || failed) {
      setFailed(true)
      return
    }
    void fetchManifestIcon(item, name).then((manifestUrl) => {
      if (manifestUrl) {
        setResolvedUrl(manifestUrl)
      } else {
        setFailed(true)
      }
    })
  }, [failed, item, name, resolvedUrl])

  const glowMap = {
    gold: 'd2-glow-gold',
    arc: 'd2-glow-arc',
    void: 'd2-glow-void',
    solar: 'd2-glow-solar',
    strand: 'd2-glow-strand',
    stasis: 'd2-glow-stasis',
    neutral: 'd2-glow-neutral',
  }

  return (
    <div
      className={cn('d2-icon-slot shrink-0', glowMap[resolvedGlow], className)}
      style={className?.includes('w-full') ? undefined : { width: size, height: size }}
      title={title ?? label}
    >
      {displayUrl && !failed ? (
        <img
          src={displayUrl}
          alt=""
          onError={handleImageError}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-white/25 text-lg">?</div>
      )}
    </div>
  )
}

/** Destiny-style stat diamond — big number, minimal label. */
export function StatOrb({
  value,
  label,
  statKey,
  darkMode,
}: {
  value: number | string
  label: string
  statKey: ArmorStatKey
  darkMode: boolean
}) {
  const color = D2_ARMOR_STAT_COLORS[statKey]
  return (
    <div
      className={cn('d2-stat-orb', darkMode ? 'd2-stat-orb-dark' : 'd2-stat-orb-light')}
      style={{ '--stat-color': color } as React.CSSProperties}
      title={label}
    >
      <span className="d2-stat-value">{value}</span>
      <span className="d2-stat-label">{label}</span>
    </div>
  )
}

/** Ability / grenade / super slot — icon with hover tooltip. */
export function AbilityChip({
  item,
  fallback,
  size = 56,
  glow = 'gold',
  slotLabel,
}: {
  item?: DestinyIconRef
  fallback?: string
  size?: number
  glow?: 'gold' | 'arc' | 'void' | 'solar' | 'strand' | 'stasis' | 'neutral' | 'auto'
  slotLabel?: string
}) {
  const name = item?.name ?? fallback
  return (
    <IconTooltip slotLabel={slotLabel} name={name} tier={item?.tierLabel} item={item} fallback={fallback}>
      <ItemExternalLink item={item} name={fallback}>
        <GlowIcon
          item={item}
          name={fallback}
          size={size}
          glow={glow}
          className="rounded-xl hover:scale-105 transition-transform duration-200 w-full max-w-[52px] aspect-square mx-auto"
        />
      </ItemExternalLink>
    </IconTooltip>
  )
}

/** Hover tooltip for icons — slot + name + tier. */
export function IconTooltip({
  slotLabel,
  name,
  tier,
  item,
  fallback,
  children,
}: {
  slotLabel?: string
  name?: string
  tier?: string
  item?: DestinyIconRef
  fallback?: string
  children: React.ReactNode
}) {
  const displayName = name?.trim()
  const externalUrl = itemExternalUrl(item, fallback ?? name)
  if (!displayName && !slotLabel) return <>{children}</>

  return (
    <div className="d2-tooltip-wrap w-full">
      {children}
      <div className="d2-tooltip" role="tooltip">
        {slotLabel ? <p className="d2-tooltip-slot">{slotLabel}</p> : null}
        {displayName ? <p className="d2-tooltip-name">{displayName}</p> : null}
        {tier ? <p className="d2-tooltip-tier">{tier}</p> : null}
        {externalUrl ? (
          <p className="d2-tooltip-link">Opens on light.gg</p>
        ) : null}
      </div>
    </div>
  )
}

/** In-game style character emblem — background banner + centered icon for active character. */
export function CharacterEmblem({
  backgroundUrl,
  iconUrl,
  accentColor,
  characterClass,
  classIconUrl,
  title,
  compact = false,
}: {
  backgroundUrl?: string
  iconUrl?: string
  accentColor?: string
  characterClass?: string
  classIconUrl?: string
  title?: string
  compact?: boolean
}) {
  const classFallback: Record<string, string> = {
    titan: 'linear-gradient(160deg, #4a1515 0%, #1a0a0a 100%)',
    hunter: 'linear-gradient(160deg, #1a3d1a 0%, #0a140a 100%)',
    warlock: 'linear-gradient(160deg, #2a1a4a 0%, #0f0a1a 100%)',
  }
  const bgStyle =
    !backgroundUrl && characterClass
      ? { background: classFallback[characterClass] ?? classFallback.warlock }
      : undefined

  return (
    <div
      className={cn('d2-character-emblem shrink-0', compact && 'd2-character-emblem-compact')}
      title={title ?? 'Character emblem'}
    >
      {backgroundUrl ? (
        <img src={backgroundUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0" style={bgStyle} />
      )}
      {accentColor ? (
        <div
          className="absolute inset-0 opacity-50"
          style={{ background: `linear-gradient(180deg, transparent 30%, ${accentColor} 100%)` }}
        />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
      {iconUrl ? (
        <img
          src={iconUrl}
          alt=""
          className="absolute left-1/2 top-[52%] h-[52px] w-[52px] -translate-x-1/2 -translate-y-1/2 object-cover drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]"
        />
      ) : classIconUrl ? (
        <img
          src={classIconUrl}
          alt=""
          className="absolute left-1/2 top-[52%] h-12 w-12 -translate-x-1/2 -translate-y-1/2 object-cover opacity-80"
        />
      ) : null}
    </div>
  )
}

export function BuildSection({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('d2-build-section', className)}>
      <p className="d2-build-section-label">{label}</p>
      {children}
    </div>
  )
}

/** Game card shell — depth, skew accent, optional banner. */
export function GameCard({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
  bannerUrl?: string
  bannerOverlay?: string
  accentColor?: string
}) {
  return (
    <div className={cn('d2-game-card relative overflow-hidden', className)}>
      <div className="d2-card-accent" />
      <div className="relative">{children}</div>
    </div>
  )
}

export function TrustBadge({
  title,
  darkMode,
}: {
  title: string
  darkMode: boolean
}) {
  const t = getDestinyTheme(darkMode)
  return (
    <TrustRankBadge
      darkMode={darkMode}
      title={title}
      className="d2-trust-badge shrink-0"
      markClassName={cn('d2-trust-mark', t.gold)}
    />
  )
}

const TRUST_RANK_TOOLTIP =
  'Trust Rank (T.R.) — Top Nest commend from fireteam members after a run. Scores your activity knowledge and vibes to help others find reliable players.'

function trustRankValue(trust?: { reviewCount?: number; topNestTitle?: string }): string {
  if (trust?.reviewCount && trust.reviewCount > 0) return String(trust.reviewCount)
  if (trust?.topNestTitle && trust.topNestTitle !== 'Unrated Guardian') {
    const word = trust.topNestTitle.split(/\s+/)[0]
    return word.length > 6 ? `${word.slice(0, 5)}…` : word
  }
  return '—'
}

export function TrustRankBadge({
  trust,
  darkMode,
  compact,
  pill,
  title,
  className,
  markClassName,
}: {
  trust?: { topNestTitle?: string; reviewCount?: number; knowledgeTier?: string; vibesTier?: string }
  darkMode: boolean
  compact?: boolean
  /** Match GR/PL pill row on profile banner. */
  pill?: boolean
  title?: string
  className?: string
  markClassName?: string
}) {
  const t = getDestinyTheme(darkMode)
  const rankTitle = title ?? trust?.topNestTitle ?? 'Unrated Guardian'
  const detail =
    trust && trust.reviewCount
      ? `${rankTitle} · ${trust.reviewCount} review${trust.reviewCount === 1 ? '' : 's'}`
      : rankTitle

  if (pill) {
    return (
      <div className={cn('d2-tooltip-wrap', className)}>
        <div className="d2-power-pill d2-power-pill-trust" title={detail}>
          <span className="d2-power-pill-label">T.R.</span>
          <span className="d2-power-pill-value d2-power-pill-value-trust">{trustRankValue(trust)}</span>
        </div>
        <div className="d2-tooltip d2-trust-tooltip" role="tooltip">
          <p className="d2-tooltip-slot">Trust Rank</p>
          <p className="d2-tooltip-name">{detail}</p>
          <p className="d2-tooltip-tier">{TRUST_RANK_TOOLTIP}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('d2-tooltip-wrap', compact ? 'd2-trust-badge-compact' : 'd2-trust-badge', className)}>
      <div className="flex items-center gap-1.5">
        <span className={cn(compact ? 'text-sm font-black text-amber-300 leading-none' : 'd2-trust-mark', markClassName ?? t.gold)}>
          T.R.
        </span>
        {!compact ? <span className="d2-trust-title">{rankTitle}</span> : null}
      </div>
      <div className="d2-tooltip d2-trust-tooltip" role="tooltip">
        <p className="d2-tooltip-slot">Trust Rank</p>
        <p className="d2-tooltip-name">{detail}</p>
        <p className="d2-tooltip-tier">{TRUST_RANK_TOOLTIP}</p>
      </div>
    </div>
  )
}

export function PowerBadge({
  power,
  rank,
  showRankAlways,
}: {
  power?: number
  rank?: number
  /** Show Guardian Rank even when 0 or unset (displays —). */
  showRankAlways?: boolean
}) {
  const showRank = showRankAlways || (rank != null && rank > 0)
  const rankDisplay = rank != null ? rank : '—'

  return (
    <div className="flex items-center gap-2">
      {showRank ? (
        <div className="d2-power-pill d2-power-pill-rank" title="Guardian Rank — Bungie account progression rank">
          <span className="d2-power-pill-label">GR</span>
          <span className="d2-power-pill-value">{rankDisplay}</span>
        </div>
      ) : null}
      <div className="d2-power-pill d2-power-pill-gold" title="Power Level">
        <span className="d2-power-pill-label">PL</span>
        <span className="d2-power-pill-value d2-power-pill-value-gold">{power ?? '—'}</span>
      </div>
    </div>
  )
}

export function IconNavButton({
  active,
  darkMode,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean
  darkMode: boolean
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={cn(
        'd2-nav-btn flex flex-col items-center gap-1.5 min-w-[72px] px-3 py-3 rounded-2xl transition-all duration-200',
        active
          ? 'd2-nav-btn-active scale-[1.02]'
          : darkMode
            ? 'text-white/50 hover:text-white/90 hover:bg-white/[0.06]'
            : 'text-slate-500 hover:text-slate-900 hover:bg-black/[0.04]'
      )}
    >
      <Icon className={cn('w-6 h-6', active && 'drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]')} />
      <span className="text-[10px] font-semibold uppercase tracking-wide">{label}</span>
    </button>
  )
}
