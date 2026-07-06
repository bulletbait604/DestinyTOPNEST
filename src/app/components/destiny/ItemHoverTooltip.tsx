'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

const TOOLTIP_MAX_W = 240
const VIEWPORT_PAD = 10

export default function ItemHoverTooltip({
  children,
  content,
  disabled = false,
  className,
}: {
  children: ReactNode
  content: ReactNode
  disabled?: boolean
  className?: string
}) {
  const anchorRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [style, setStyle] = useState<React.CSSProperties>({})

  useEffect(() => {
    setMounted(true)
  }, [])

  const updatePosition = useCallback(() => {
    const el = anchorRef.current
    if (!el) return

    const rect = el.getBoundingClientRect()
    const width = Math.min(TOOLTIP_MAX_W, window.innerWidth - VIEWPORT_PAD * 2)
    let left = rect.left + rect.width / 2 - width / 2
    left = Math.max(VIEWPORT_PAD, Math.min(window.innerWidth - width - VIEWPORT_PAD, left))

    const aboveTop = rect.top - 8
    const belowTop = rect.bottom + 8
    const preferAbove = rect.top > 120

    setStyle({
      position: 'fixed',
      left,
      width,
      top: preferAbove ? aboveTop : belowTop,
      transform: preferAbove ? 'translateY(-100%)' : 'none',
      zIndex: 99999,
    })
  }, [])

  const show = useCallback(() => {
    if (disabled) return
    updatePosition()
    setOpen(true)
  }, [disabled, updatePosition])

  const hide = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    const onScroll = () => updatePosition()
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [open, updatePosition])

  return (
    <>
      <div
        ref={anchorRef}
        className={cn('d2-tooltip-anchor inline-flex', className)}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {children}
      </div>
      {mounted && open && !disabled
        ? createPortal(
            <div className="d2-floating-tooltip" style={style} role="tooltip">
              {content}
            </div>,
            document.body
          )
        : null}
    </>
  )
}

export function TooltipSlot({ children }: { children: ReactNode }) {
  return <p className="d2-tooltip-slot">{children}</p>
}

export function TooltipName({ children }: { children: ReactNode }) {
  return <p className="d2-tooltip-name">{children}</p>
}

export function TooltipTier({ children }: { children: ReactNode }) {
  return <p className="d2-tooltip-tier">{children}</p>
}

export function TooltipLink({ children }: { children: ReactNode }) {
  return <p className="d2-tooltip-link">{children}</p>
}
