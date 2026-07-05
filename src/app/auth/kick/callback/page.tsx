'use client'

import { useEffect, useState } from 'react'

export default function KickCallbackPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState<string>('')

  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get('code')
      const state = urlParams.get('state')
      const error = urlParams.get('error')

      if (error) {
        setStatus('error')
        setErrorMessage(urlParams.get('error_description') || error)
        return
      }

      if (!code || !state) {
        setStatus('error')
        setErrorMessage('No authorization code received from Kick')
        return
      }

      try {
        const response = await fetch('/api/auth/kick/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ code, state }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Could not complete login with Kick.')
        }

        const data = await response.json()
        setStatus('success')

        const returnPath =
          typeof data.returnPath === 'string' &&
          data.returnPath.startsWith('/') &&
          !data.returnPath.startsWith('//')
            ? data.returnPath
            : '/'

        setTimeout(() => {
          window.location.href = returnPath
        }, 400)
      } catch (err: unknown) {
        setStatus('error')
        setErrorMessage(err instanceof Error ? err.message : 'Authentication failed')
      }
    }

    void handleCallback()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d0f14] px-4">
      <div className="text-center max-w-md">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--tn-arc)] mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Signing in with Kickâ€¦</h2>
          </>
        )}
        {status === 'success' && (
          <>
            <h2 className="text-xl font-bold text-white mb-2">Signed in</h2>
            <p className="text-white/60">Redirectingâ€¦</p>
          </>
        )}
        {status === 'error' && (
          <>
            <h2 className="text-xl font-bold text-red-300 mb-2">Sign-in failed</h2>
            <p className="text-white/60 mb-4">{errorMessage}</p>
            <a href="/" className="d2-btn d2-btn-primary inline-block px-6 py-2 text-sm font-bold">
              Back home
            </a>
          </>
        )}
      </div>
    </div>
  )
}
