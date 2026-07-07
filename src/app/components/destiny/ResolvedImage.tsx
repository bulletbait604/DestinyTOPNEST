'use client'

import { cn } from '@/lib/utils'
import { useResolvedIconUrl } from '@/lib/destiny/useResolvedIconUrl'

/** Image with proactive manifest/catalog resolution and error fallback. */
export default function ResolvedImage({
  src,
  name,
  alt = '',
  className,
  title,
}: {
  src?: string
  name?: string
  alt?: string
  className?: string
  title?: string
}) {
  const { displayUrl, failed, onImageError } = useResolvedIconUrl(undefined, name, src)

  if (!displayUrl || failed) {
    return (
      <div
        title={title ?? name}
        className={cn('bg-white/10', className)}
        aria-hidden={!alt}
      />
    )
  }

  return (
    <img
      src={displayUrl}
      alt={alt}
      title={title ?? name}
      onError={onImageError}
      className={className}
    />
  )
}
