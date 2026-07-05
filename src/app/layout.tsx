import type { Metadata, Viewport } from 'next'
import { BRAND_FULL, BRAND_LOGO_PATH, BRAND_TAGLINE } from '@/lib/destiny/branding'
import './globals.css'

export const metadata: Metadata = {
  title: BRAND_FULL,
  description: BRAND_TAGLINE,
  applicationName: BRAND_FULL,
  icons: {
    icon: [{ url: BRAND_LOGO_PATH, type: 'image/png' }],
    apple: [{ url: BRAND_LOGO_PATH, type: 'image/png' }],
    shortcut: [BRAND_LOGO_PATH],
  },
}

export const viewport: Viewport = {
  themeColor: '#121418',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
