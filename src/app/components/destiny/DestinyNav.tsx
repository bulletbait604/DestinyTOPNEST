'use client'

import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  Trophy,
  Users,
  User,
  Building2,
  Hammer,
  Gift,
  ShieldAlert,
} from 'lucide-react'
import type { DestinyTopNestTab } from '@/lib/destiny/types'
import { navTabArtUrl } from '@/lib/destiny/navArt'
import { destinyNavPrimary, destinyNavSecondary } from '@/app/components/destiny/destinyTheme'
import { cn } from '@/lib/utils'

const MAIN_NAV: { id: DestinyTopNestTab; label: string; icon: LucideIcon }[] = [
  { id: 'overview', label: 'Home', icon: LayoutDashboard },
  { id: 'leaderboards', label: 'Leaderboards', icon: Trophy },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'fireteam', label: 'My Teams', icon: Users },
  { id: 'clans', label: 'Clan', icon: Building2 },
  { id: 'loadouts', label: 'Builds', icon: Hammer },
]

const EXTRA_NAV: { id: DestinyTopNestTab; label: string; icon: LucideIcon; adminOnly?: boolean }[] = [
  { id: 'season', label: 'Season', icon: Gift },
  { id: 'admin', label: 'Admin', icon: ShieldAlert, adminOnly: true },
]

function navActiveTab(activeTab: DestinyTopNestTab): DestinyTopNestTab {
  if (activeTab === 'builds' || activeTab === 'loadouts') return 'loadouts'
  return activeTab
}

interface Props {
  activeTab: DestinyTopNestTab
  onTabChange: (tab: DestinyTopNestTab) => void
  darkMode: boolean
  showAdmin?: boolean
}

export default function DestinyNav({ activeTab, onTabChange, darkMode, showAdmin = true }: Props) {
  const extraTabs = EXTRA_NAV.filter((tab) => !tab.adminOnly || showAdmin)
  const resolvedActive = navActiveTab(activeTab)

  return (
    <div className="w-full min-w-0 space-y-0">
      <nav
        className={cn(
          'd2-tab-bar grid grid-cols-3 sm:grid-cols-6 gap-0 w-full',
          darkMode ? 'bg-black/20' : 'bg-black/[0.03]'
        )}
        aria-label="Main sections"
      >
        {MAIN_NAV.map((tab) => {
          const Icon = tab.icon
          const active = resolvedActive === tab.id
          const artUrl = navTabArtUrl(tab.id)
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={destinyNavPrimary(active, darkMode, artUrl)}
              style={artUrl ? { ['--d2-tab-art' as string]: `url('${artUrl}')` } : undefined}
            >
              <Icon className={cn('w-5 h-5 shrink-0', active && 'text-[var(--tn-arc)] drop-shadow-[0_0_8px_var(--tn-arc-glow)]')} />
              <span className="uppercase tracking-[0.1em] text-[10px] sm:text-[11px] font-bold text-center leading-tight">
                {tab.label}
              </span>
            </button>
          )
        })}
      </nav>

      {extraTabs.length > 0 ? (
        <nav
          className={cn(
            'd2-tab-bar d2-tab-bar-secondary grid gap-0 mt-0 w-full',
            extraTabs.length === 2 ? 'grid-cols-2' : 'grid-cols-1',
            darkMode ? 'bg-black/20' : 'bg-black/[0.03]'
          )}
          aria-label="More sections"
        >
          {extraTabs.map((tab) => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            const artUrl = navTabArtUrl(tab.id)
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={destinyNavSecondary(active, darkMode, artUrl)}
                style={artUrl ? { ['--d2-tab-art' as string]: `url('${artUrl}')` } : undefined}
              >
                <Icon className={cn('w-5 h-5 shrink-0', active && 'text-[var(--tn-solar)] drop-shadow-[0_0_8px_var(--tn-solar-glow)]')} />
                <span className="uppercase tracking-[0.14em] text-[11px] sm:text-xs font-bold">{tab.label}</span>
              </button>
            )
          })}
        </nav>
      ) : null}
    </div>
  )
}
