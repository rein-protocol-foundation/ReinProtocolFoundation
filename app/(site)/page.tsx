import type { Metadata } from 'next'
import { InstitutionalHomePage } from '@/components/institutional-pages'
import { foundationStatus } from '@/lib/foundation-status'
import { githubOrganizationUrl } from '@/lib/github'

const description = 'Rein Protocol Foundation advances AI agent safety through community learning, open-source projects, and research into transparency, monitoring, and human oversight.'

export const metadata: Metadata = {
  title: 'AI Agent Safety',
  description,
  alternates: { canonical: '/' },
}

const organization = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': 'https://www.rein-protocol.org/#organization',
  name: foundationStatus.legalName,
  url: 'https://www.rein-protocol.org/',
  logo: 'https://www.rein-protocol.org/brand/rein-avatar-white.png',
  description,
  email: foundationStatus.contactEmail,
  sameAs: [githubOrganizationUrl],
}

export default function HomePage() {
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organization).replace(/</g, '\\u003c') }} />
    <InstitutionalHomePage />
  </>
}
