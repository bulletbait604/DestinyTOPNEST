import { NextRequest, NextResponse } from 'next/server'
import { listAskFeedback } from '@/lib/ask/askStore'
import { destinyStaffHandler } from '@/lib/destiny/apiHandler'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  return destinyStaffHandler(req, async () => {
    const feedback = await listAskFeedback()
    return NextResponse.json({ feedback })
  })
}
