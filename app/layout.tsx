import type { Metadata } from 'next'
import '../src/index.css'
import '../src/App.css'
import './community.css'
import './admin.css'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://rein-protocol.org'),
  title: { default: 'Rein Protocol Foundation', template: '%s — Rein Protocol Foundation' },
  description: 'Rein Protocol Foundation is a nonprofit incorporated in Oct 2026 in the STATE OF WYOMING, advancing AI agent safety through community, open source, and research.',
  openGraph: { type: 'website', siteName: 'Rein Protocol Foundation' },
  manifest: '/site.webmanifest',
  appleWebApp: { title: 'Rein Protocol' },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>
}
