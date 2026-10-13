'use client'

import CommunityBuildPage from '@/app/components/destiny/community/CommunityBuildPage'

export default function BuildPage({ params }: { params: { id: string } }) {
  return <CommunityBuildPage buildId={params.id} />
}
