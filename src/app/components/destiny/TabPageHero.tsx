'use client'

import type { ReactNode } from 'react'
import { PageHeader } from '@/app/components/hub/PageHeader'
import type { DestinyTopNestTab } from '@/lib/destiny/types'
import { tabPageCopy } from '@/lib/destiny/tabPageCopy'

interface Props {
  tab: DestinyTopNestTab
  aside?: ReactNode
}

/** Title and one subtitle. The public home page keeps the only larger hero. */
export default function TabPageHero({ tab, aside }: Props) {
  const copy = tabPageCopy(tab)
  return <PageHeader title={copy.title} subtitle={copy.description} titleId={`tab-hero-${tab}`} extra={aside} />
}
