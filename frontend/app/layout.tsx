import type { Metadata, Viewport } from 'next'
import React from 'react'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: '二人麻雀',
  description: 'Two-player Mahjong Game',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
