import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { CommunityPageHero } from '@/components/community-shell'
import { Arrow } from '@/components/icons'
import { ResourceCard } from '@/components/resource-card'
import { getPublishedResources } from '@/lib/community/data'

export const metadata: Metadata = {
  title: 'Learning Resources',
  description: 'Explore free public courses, tutorials, research discussions, and practical guides for learning about AI agents.',
}

const PAGE_SIZE = 12
type LearnSearchParams = Promise<{ page?: string | string[] }>

async function ResourceCatalog({ searchParams }: { searchParams: LearnSearchParams }) {
  const value = (await searchParams).page
  const requestedPage = typeof value === 'string' && /^[1-9]\d*$/.test(value) ? Number(value) : 1
  const page = Number.isSafeInteger(requestedPage) && requestedPage <= Math.floor(Number.MAX_SAFE_INTEGER / PAGE_SIZE) ? requestedPage : 1
  const { resources, hasMore } = await getPublishedResources({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE })

  return (
    <>
      {resources.length ? (
        <div className="resource-list">
          {resources.map((resource) => <ResourceCard resource={resource} key={resource.id} />)}
        </div>
      ) : (
        <div className="empty-state">
          <h2>{page > 1 ? 'No resources on this page.' : 'Help build the resource library.'}</h2>
          <p className="empty-state__copy">{page > 1 ? 'Return to the first page to explore the available learning resources.' : 'Recommend a free course, tutorial, or guide for the community to review.'}</p>
          {page > 1 ? <Link href="/community/learn" className="text-action">View first page <Arrow /></Link> : null}
        </div>
      )}
      {resources.length && (page > 1 || hasMore) ? (
        <nav className="resource-pagination" aria-label="Learning resource pages">
          {page > 1 ? <Link href={page === 2 ? '/community/learn' : `/community/learn?page=${page - 1}`} className="text-action"><span className="resource-pagination__back"><Arrow /></span>Previous page</Link> : <span />}
          <p>Page {page}</p>
          {hasMore ? <Link href={`/community/learn?page=${page + 1}`} className="text-action resource-pagination__next">Next page <Arrow /></Link> : <span />}
        </nav>
      ) : null}
    </>
  )
}

function CatalogFallback() {
  return <div className="resource-list" aria-busy="true" aria-label="Loading learning resources">{[0, 1, 2].map((index) => <div className="resource-card" key={index}><span className="skeleton-line skeleton-line--kicker" /><span className="skeleton-line skeleton-line--title" /><span className="skeleton-line skeleton-line--bio" /></div>)}</div>
}

export default function LearnPage({ searchParams }: { searchParams: LearnSearchParams }) {
  return (
    <main id="main-content" className="community-shell">
      <CommunityPageHero eyebrow="Community / Learn" title="Learning resources." lead="Free courses, tutorials, research discussions, and practical guides to help you learn about AI agents, at your own pace." />
      <section className="page-shell learning-catalog" aria-labelledby="resource-catalog-title">
        <h2 id="resource-catalog-title" className="visually-hidden">All learning resources</h2>
        <div className="learning-catalog__actions">
          <Link href="/community#program" className="text-action"><span className="resource-pagination__back"><Arrow /></span>Back to community</Link>
          <Link href="/community/contribute/resources/submit" className="quiet-action">Submit a learning resource <Arrow /></Link>
        </div>
        <Suspense fallback={<CatalogFallback />}><ResourceCatalog searchParams={searchParams} /></Suspense>
      </section>
    </main>
  )
}
