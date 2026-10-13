import { NextRequest, NextResponse } from 'next/server'

export function communityBuildJson(body: unknown, status = 200, retryAfterSec?: number): NextResponse {
  const res = NextResponse.json(body, { status })
  if (retryAfterSec) res.headers.set('Retry-After', String(retryAfterSec))
  return res
}

export function communityBuildError(message: string, status: number, retryAfterSec?: number): NextResponse {
  return communityBuildJson({ error: message, ...(retryAfterSec ? { retryAfterSec } : {}) }, status, retryAfterSec)
}

export async function readJsonObject(req: NextRequest): Promise<Record<string, unknown> | null> {
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null
  return body as Record<string, unknown>
}
