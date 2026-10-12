'use client'

import type { ReactNode } from 'react'
import AppUserHeader from '@/app/components/AppUserHeader'
import HubChrome from '@/app/components/hub/HubChrome'
import HubErrorBoundary from '@/app/components/hub/HubErrorBoundary'
import { BungieLinkProvider } from '@/contexts/BungieLinkContext'

/**
 * Signed-in chrome. The account header uses Bungie link state, so the provider
 * has to wrap the header as well as the page body.
 */
export default function SignedInHubFrame({
  displayName,
  onLogout,
  showAdmin,
  onOpenAdmin,
  onLogin,
  loginPending,
  children,
}: {
  displayName: string
  onLogout: () => void
  showAdmin?: boolean
  onOpenAdmin?: () => void
  onLogin: () => void
  loginPending?: boolean
  children: ReactNode
}) {
  return (
    <BungieLinkProvider>
      <HubChrome
        signedIn
        onLogin={onLogin}
        loginPending={loginPending}
        account={
          <HubErrorBoundary label="account">
            <AppUserHeader
              displayName={displayName}
              onLogout={onLogout}
              showAdminSettings={showAdmin}
              onOpenAdmin={onOpenAdmin}
            />
          </HubErrorBoundary>
        }
      >
        <HubErrorBoundary label="page">{children}</HubErrorBoundary>
      </HubChrome>
    </BungieLinkProvider>
  )
}
