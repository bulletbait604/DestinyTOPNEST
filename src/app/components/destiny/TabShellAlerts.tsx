'use client'

import BungieConnectBanner from '@/app/components/destiny/BungieConnectBanner'
import { useBungieLink } from '@/contexts/BungieLinkContext'

/** Bungie link / reconnect alerts below nav — hidden when linked and healthy. */
export default function TabShellAlerts({ darkMode }: { darkMode: boolean }) {
  const bungie = useBungieLink()
  const showBanner =
    !bungie.loading &&
    (!bungie.linked || Boolean(bungie.status?.needsReconnect) || Boolean(bungie.linkMessage))

  if (!showBanner) return null

  return <BungieConnectBanner darkMode={darkMode} bungie={bungie} variant="overview" showSync={false} />
}
