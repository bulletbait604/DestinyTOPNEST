'use client'

import { useCallback, useEffect, useState } from 'react'
import { startBungieLogin } from '@/lib/bungie/startBungieLogin'

export interface AppUser {
  id: string
  username: string
  displayName: string
  role: string
  isStaff?: boolean
  bungieLinked?: boolean
  bungieTokenHealthy?: boolean
}

export function useAppSession() {
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async (): Promise<AppUser | null> => {
    try {
      const res = await fetch('/api/auth/session', { credentials: 'include', cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        const nextUser: AppUser = {
          id: data.id,
          username: data.username,
          displayName: data.displayName ?? data.username,
          role: data.role,
          isStaff: Boolean(data.isStaff),
          bungieLinked: data.bungieLinked,
          bungieTokenHealthy: data.bungieTokenHealthy,
        }
        setUser(nextUser)
        return nextUser
      }
      setUser(null)
      return null
    } catch {
      setUser(null)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setMounted(true)
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!user) return

    const extendSession = () => {
      void refresh()
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') extendSession()
    }

    window.addEventListener('focus', extendSession)
    document.addEventListener('visibilitychange', onVisibilityChange)

    const interval = window.setInterval(extendSession, 60 * 60 * 1000)

    return () => {
      window.removeEventListener('focus', extendSession)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.clearInterval(interval)
    }
  }, [user, refresh])

  const login = useCallback(() => {
    startBungieLogin('/')
  }, [])

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include', cache: 'no-store' })
    setUser(null)
    setLoading(false)
    window.location.replace('/')
  }, [])

  return {
    mounted,
    user,
    loading,
    login,
    logout,
    refresh,
    isAdmin:
      Boolean(user?.isStaff) || user?.role === 'admin' || user?.role === 'owner',
  }
}
