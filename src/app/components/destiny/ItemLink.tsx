'use client'

import type { ReactNode } from 'react'
import { itemExternalLinkTitle, itemExternalUrl } from '@/lib/destiny/itemExternalLinks'
import type { DestinyIconRef } from '@/lib/destiny/types'
import { cn } from '@/lib/utils'

interface BaseProps {
  item?: DestinyIconRef
  name?: string
  className?: string
}

/** Text link to light.gg for weapons, armor, perks, aspects, etc. */
export function ItemLink({ item, name, className, children }: BaseProps & { children?: ReactNode }) {
  const url = itemExternalUrl(item, name)
  const text = children ?? item?.name ?? name
  if (!url || text == null || text === '') {
    return <span className={className}>{text}</span>
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn('d2-item-link', className)}
      title={itemExternalLinkTitle(item, name)}
    >
      {text}
    </a>
  )
}

/** Wrap icons/tiles so clicking opens light.gg. */
export function ItemExternalLink({
  item,
  name,
  className,
  children,
}: BaseProps & { children: ReactNode }) {
  const url = itemExternalUrl(item, name)
  if (!url) return <>{children}</>

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn('d2-item-external-link', className)}
      title={itemExternalLinkTitle(item, name)}
    >
      {children}
    </a>
  )
}
