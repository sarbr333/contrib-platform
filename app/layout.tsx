import type { Metadata, Viewport } from 'next'
import { BRAND } from '@/lib/branding'
import './globals.css'

export const metadata: Metadata = {
  title: BRAND.fullName,
  description: BRAND.description
}

export const viewport: Viewport = {
  themeColor: BRAND.themeColor,
  width: 'device-width',
  initialScale: 1
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
