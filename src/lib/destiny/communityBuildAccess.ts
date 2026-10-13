import type { NextRequest } from 'next/server'
import { AuthError, verifyAuth, type VerifiedUser } from '@/lib/auth/verifyAuth'
import { verifyStaffUser } from '@/lib/auth/staffAccess'

export async function optionalAuth(req: NextRequest): Promise<VerifiedUser | null> {
  try {
    return await verifyAuth(req)
  } catch (error) {
    if (error instanceof AuthError) return null
    throw error
  }
}

export async function readCommunityBuildViewer(req: NextRequest): Promise<{
  user: VerifiedUser | null
  staff: boolean
}> {
  const user = await optionalAuth(req)
  if (!user) return { user: null, staff: false }
  try {
    await verifyStaffUser(req)
    return { user, staff: true }
  } catch (error) {
    if (error instanceof AuthError) return { user, staff: false }
    throw error
  }
}
