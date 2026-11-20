import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { CommunityPageHero } from '@/components/community-shell'
import { Arrow } from '@/components/icons'
import { ResourceCard } from '@/components/resource-card'
import { getPublishedResources } from '@/lib/community/data'

const PAGE_SIZE = 12
type LearnSearchParams = Promise<{ page?: string | string[]; language?: string; coding?: string }>

export async function generateMetadata({ searchParams }: { searchParams: LearnSearchParams }): Promise<Metadata> {
  const value = (await searchParams).page
  const page = typeof value === 'string' && /^[1-9]\d*$/.test(value) ? Number(value) : 1
  const canonical = Number.isSafeInteger(page) && page > 1 && page <= Math.floor(Number.MAX_SAFE_INTEGER / PAGE_SIZE)
    ? `/community/learn?page=${page}` : '/community/learn'
  return {
    title: canonical.includes('?') ? `AI Agent Learning Resources — Page ${page}` : 'AI Agent Learning Resources',
    description: 'Explore free public courses, tutorials, research discussions, and practical guides for learning about AI agents.',
    alternates: { canonical },
  }
}

const languages = { en: 'English', 'zh-CN': '简体中文', es: 'Español', fr: 'Français', ko: '한국어', 'ru-RU': 'Русский', vi: 'Tiếng Việt' }
const codingOptions = { none: 'No coding', optional: 'Coding optional', required_for_exercises: 'Coding required for exercises' }

async function ResourceCatalog({ searchParams }: { searchParams: LearnSearchParams }) {
  const params = await searchParams
  const language = typeof params.language === 'string' && Object.hasOwn(languages, params.language) ? params.language : ''
  const coding = typeof params.coding === 'string' && Object.hasOwn(codingOptions, params.coding) ? params.coding : ''
  function pageUrl(number: number) {
    const query = new URLSearchParams()
    if (language) query.set('language', language)
    if (coding) query.set('coding', coding)
    if (number > 1) query.set('page', String(number))
    return '/community/learn' + (query.size ? '?' + query : '')
  }
  const value = params.page
  const requestedPage = typeof value === 'string' && /^[1-9]\d*$/.test(value) ? Number(value) : 1
  const page = Number.isSafeInteger(requestedPage) && requestedPage <= Math.floor(Number.MAX_SAFE_INTEGER / PAGE_SIZE) ? requestedPage : 1
  const { resources, hasMore, unavailable } = await getPublishedResources({ language, coding, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE })

  return (
    <>
      <form method="get" className="catalog-filters">
        <label>Language<select name="language" defaultValue={language}><option value="">All languages</option>{Object.entries(languages).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label>Coding experience<select name="coding" defaultValue={coding}><option value="">Any background</option>{Object.entries(codingOptions).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <button type="submit" className="primary-action">Apply filters</button>
      </form>
      {unavailable ? <p>Learning resources are temporarily unavailable. Please reload to try again.</p> : resources.length ? (
        <div className="resource-list">
          {resources.map((resource) => <ResourceCard resource={resource} language={language} key={resource.id} />)}
        </div>
      ) : (
        <div className="empty-state">
          <h2>{page > 1 ? 'No resources on this page.' : 'No resources match this selection.'}</h2>
          <p className="empty-state__copy">{page > 1 ? 'Return to the first page to explore the available learning resources.' : 'Try another language or coding background.'}</p>
          {page > 1 ? <Link href={pageUrl(1)} className="text-action">View first page <Arrow /></Link> : null}
        </div>
      )}
      {resources.length > 0 && (page > 1 || hasMore) ? (
        <nav className="resource-pagination" aria-label="Learning resource pages">
          {page > 1 ? <Link href={pageUrl(page - 1)} className="text-action"><span className="resource-pagination__back"><Arrow /></span>Previous page</Link> : <span />}
          <p>Page {page}</p>
          {hasMore ? <Link href={pageUrl(page + 1)} className="text-action resource-pagination__next">Next page <Arrow /></Link> : <span />}
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
      <CommunityPageHero eyebrow="Community / Learn" title="AI agent learning resources." lead="Free courses, tutorials, research discussions, and practical guides to help you learn about AI agents, at your own pace." />
      <section className="page-shell learning-catalog" aria-labelledby="resource-catalog-title">
        <h2 id="resource-catalog-title" className="visually-hidden">All learning resources</h2>
        <p className="community-contribution-context">Start with a course or tutorial that matches your experience. When exploring an agent, ask what it can do, what permissions it needs, and how a person can review its actions. Learn about <Link href="/mission">Rein’s approach to AI agent safety</Link>, or <Link href="/community/contribute">help others learn by contributing</Link>.</p>
        <div className="learning-catalog__actions">
          <Link href="/community#program" className="text-action"><span className="resource-pagination__back"><Arrow /></span>Back to community</Link>
          <Link href="/community/contribute/resources/submit" className="quiet-action">Submit a learning resource <Arrow /></Link>
        </div>
        <Suspense fallback={<CatalogFallback />}><ResourceCatalog searchParams={searchParams} /></Suspense>
      </section>
    </main>
  )
}
