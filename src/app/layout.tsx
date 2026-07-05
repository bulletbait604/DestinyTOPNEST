import type { Metadata } from 'next'
import { BRAND_FULL, BRAND_TAGLINE } from '@/lib/destiny/branding'
import './globals.css'

export const metadata: Metadata = {
  title: BRAND_FULL,
  description: BRAND_TAGLINE,
  icons: { icon: '/brand/topnest-logo.png' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
