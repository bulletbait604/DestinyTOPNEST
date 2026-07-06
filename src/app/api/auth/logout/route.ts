import { NextRequest, NextResponse } from 'next/server'
import { clearSessionCookies } from '@/lib/auth/sessionCookies'

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ ok: true })
  clearSessionCookies(req, res)
  return res
}
