import type { MetadataRoute } from 'next'
import { foundationStatus } from '@/lib/foundation-status'

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://rein-protocol.org'
  return ['/', '/mission', '/programs', '/governance', '/giving', '/community', '/community/people', '/community/learn', '/community/gather', '/community/contribute', '/community/code-of-conduct', '/privacy'].map(path => ({
    url: new URL(path, siteUrl).href,
    // These pages share the updated Foundation status in their footer.
    lastModified: foundationStatus.reviewedOn,
  }))
}
