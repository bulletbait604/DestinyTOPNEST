'use client'

import { useCallback, useEffect, useState } from 'react'
import { startKickLogin } from '@/lib/kick/startKickLogin'

export interface AppUser {
  id: string
  username: string
  role: string
}

export function useAppSession() {
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session', { credentials: 'include', cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setUser({
          id: data.id,
          username: data.username,
          role: data.role,
        })
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setMounted(true)
    void refresh()
  }, [refresh])

  const login = useCallback(() => {
    void startKickLogin()
  }, [])

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    setUser(null)
    window.location.replace('/')
  }, [])

  return { mounted, user, loading, login, logout, refresh, isAdmin: user?.role === 'admin' || user?.role === 'owner' }
}
