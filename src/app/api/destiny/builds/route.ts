import { NextRequest, NextResponse } from 'next/server'
import { destinyAuthHandler } from '@/lib/destiny/apiHandler'
import { metaResearchSummary } from '@/lib/destiny/externalMetaResearch'
import { enrichBuildsResponse } from '@/lib/destiny/enrich'
import { getBuildIntelligenceCards, getExternalBuildSources, getMetaResearchMeta } from '@/lib/destiny/store'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  return destinyAuthHandler(req, async () => {
    const { searchParams } = new URL(req.url)
    const activity = searchParams.get('activity') ?? ''

    const [verifiedBuilds, externalBuilds] = await Promise.all([
      getBuildIntelligenceCards(),
      getExternalBuildSources(),
    ])

    const filteredVerified = activity
      ? verifiedBuilds.filter((b) => b.activityName.toLowerCase().includes(activity.toLowerCase()))
      : verifiedBuilds

    const filteredExternal = activity
      ? externalBuilds.filter(
          (b) =>
            b.activityFocus?.toLowerCase().includes(activity.toLowerCase()) ||
            b.title.toLowerCase().includes(activity.toLowerCase())
        )
      : externalBuilds

    const aiSummary =
      filteredVerified.length > 0
        ? `Showing ${filteredVerified.length} verified build(s) from Top Nest PGCR data.`
        : 'No verified PGCR builds yet — sync runs from Home after linking Bungie.'

    const researchSummary = metaResearchSummary(filteredExternal)
    const meta = await getMetaResearchMeta()
    const weeklyLine = meta.weeklySync.syncedAt
      ? `Checked with the ${meta.weekLabel} weekly reset${
          meta.weeklySync.featuredActivities.length
            ? ` (${meta.weeklySync.featuredActivities.join(', ')})`
            : ''
        } on ${new Date(meta.weeklySync.syncedAt).toLocaleDateString()}.`
      : `Weekly check for ${meta.weekLabel} runs on first load after reset.`

    return NextResponse.json({
      ...(await enrichBuildsResponse({
        verifiedBuilds: filteredVerified,
        externalBuilds: filteredExternal,
        aiSummary,
        metaResearchSummary: [researchSummary, weeklyLine].filter(Boolean).join(' '),
        activity: activity || 'all',
      })),
      metaResearch: meta,
    })
  })
}
