'use client'

import { Loader2 } from 'lucide-react'
import { HUB_NAME } from '@/lib/destiny/branding'
import { TopNestLogoMark } from '@/app/components/destiny/TopNestBrandBanner'
import CommunityBuildDetail from '@/app/components/destiny/community/CommunityBuildDetail'
import HubChrome from '@/app/components/hub/HubChrome'
import SignedInHubFrame from '@/app/components/hub/SignedInHubFrame'
import SiteBackdrop from '@/app/components/SiteBackdrop'
import { useAppSession } from '@/hooks/useAppSession'
import { startBungieLogin } from '@/lib/bungie/startBungieLogin'
import { navigateDestinyTab } from '@/lib/routing/tabUrl'

export default function CommunityBuildPage({ buildId }: { buildId: string }) {
  const { mounted, user, loading, logout, isAdmin } = useAppSession()
  const login = () => startBungieLogin(`/builds/${buildId}`)

  if (!mounted || loading) {
    return (
      <SiteBackdrop variant="hub">
        <div className="flex flex-1 items-center justify-center px-4 py-24">
          <div className="flex flex-col items-center gap-3 text-white/70">
            <TopNestLogoMark size={56} />
            <Loader2 className="w-8 h-8 animate-spin text-d2-arc" />
            <p className="text-sm">Loading {HUB_NAME}…</p>
          </div>
        </div>
      </SiteBackdrop>
    )
  }

  const detail = (
    <CommunityBuildDetail buildId={buildId} darkMode signedIn={Boolean(user)} onLogin={login} />
  )

  if (user) {
    return (
      <SiteBackdrop variant="hub">
        <SignedInHubFrame
          displayName={user.displayName}
          onLogout={() => void logout()}
          showAdmin={isAdmin}
          onOpenAdmin={() => navigateDestinyTab('admin')}
          onLogin={login}
        >
          {detail}
        </SignedInHubFrame>
      </SiteBackdrop>
    )
  }

  return (
    <SiteBackdrop variant="hub">
      <HubChrome signedIn={false} onLogin={login}>
        {detail}
      </HubChrome>
    </SiteBackdrop>
  )
}
