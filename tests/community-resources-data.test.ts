import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PublicResource } from '@/lib/community/types'

const mocks = vi.hoisted(() => ({
  getPublicClient: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  order: vi.fn(),
  range: vi.fn(),
}))

vi.mock('next/cache', () => ({ unstable_noStore: vi.fn() }))
vi.mock('@/lib/supabase/public', () => ({ getPublicClient: mocks.getPublicClient }))
vi.mock('@/lib/supabase/secret', () => ({ getSecretClient: vi.fn() }))

import { getPublishedResources } from '@/lib/community/data'

function resource(index: number): PublicResource {
  return {
    id: `resource-${index}`,
    slug: `resource-${index}`,
    title: `Resource ${index}`,
    summary: 'A public learning resource.',
    public_url: `https://example.org/resources/${index}`,
    resource_type: 'Course',
    language: 'English',
    difficulty: null,
    topics: [],
    author_publisher: null,
    access_notes: null,
    featured: false,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  const query = { select: mocks.select, eq: mocks.eq, order: mocks.order, range: mocks.range }
  mocks.getPublicClient.mockReturnValue({ from: mocks.from })
  mocks.from.mockReturnValue(query)
  mocks.select.mockReturnValue(query)
  mocks.eq.mockReturnValue(query)
  mocks.order.mockReturnValue(query)
  mocks.range.mockResolvedValue({ data: [], error: null })
})

describe('published learning resources', () => {
  it('bounds the preview query and uses one lookahead row to detect more resources', async () => {
    const rows = Array.from({ length: 4 }, (_, index) => resource(index))
    mocks.range.mockResolvedValue({ data: rows, error: null })

    await expect(getPublishedResources({ limit: 3 })).resolves.toEqual({
      resources: rows.slice(0, 3),
      hasMore: true,
    })
    expect(mocks.from).toHaveBeenCalledWith('resources')
    expect(mocks.eq).toHaveBeenCalledWith('publication_status', 'published')
    expect(mocks.order.mock.calls).toEqual([
      ['sort_order'],
      ['published_at', { ascending: false }],
      ['id'],
    ])
    expect(mocks.range).toHaveBeenCalledWith(0, 3)
  })

  it('defaults to twelve resources and applies the next page offset at the database', async () => {
    const rows = Array.from({ length: 12 }, (_, index) => resource(index + 12))
    mocks.range.mockResolvedValue({ data: rows, error: null })

    await expect(getPublishedResources({ offset: 12 })).resolves.toEqual({ resources: rows, hasMore: false })
    expect(mocks.range).toHaveBeenCalledWith(12, 24)

    await getPublishedResources()
    expect(mocks.range).toHaveBeenLastCalledWith(0, 12)
  })

  it('returns an empty result when the public database client is unavailable', async () => {
    mocks.getPublicClient.mockReturnValue(null)

    await expect(getPublishedResources()).resolves.toEqual({ resources: [], hasMore: false })
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('returns an empty result on query errors or missing data', async () => {
    mocks.range.mockResolvedValue({ data: [resource(1)], error: { message: 'Unavailable' } })
    await expect(getPublishedResources()).resolves.toEqual({ resources: [], hasMore: false })

    mocks.range.mockResolvedValue({ data: null, error: null })
    await expect(getPublishedResources()).resolves.toEqual({ resources: [], hasMore: false })
  })
})
