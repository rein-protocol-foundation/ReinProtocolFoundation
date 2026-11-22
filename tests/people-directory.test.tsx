import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { PublicPerson } from '@/lib/community/types'

const { getPublicPeople } = vi.hoisted(() => ({ getPublicPeople: vi.fn() }))
vi.mock('@/lib/community/data', () => ({ getPublicPeople }))

import { CompactPersonCard, PersonCard, PeopleDirectory } from '@/components/people-directory'

import { curatedPeople } from '@/lib/people/directory'

describe('People directory hierarchy', () => {
  it('renders compact cards without biographies or role labels and supports initials', () => {
    const person = { ...curatedPeople[0], directoryRole: 'community_member' as const, role: 'Community Member', photo_url: null, photo_alt: null }
    render(<CompactPersonCard person={person} />)
    expect(screen.queryByText(person.biography!)).not.toBeInTheDocument()
    expect(screen.queryByText('Community Member')).not.toBeInTheDocument()
    expect(screen.getByText('TR')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: person.display_name })).toHaveAttribute('href', person.website_url)
  })

  it('retains core contributor biographies in their card variant', () => {
    const person = curatedPeople.find(person => person.directoryRole === 'core_contributor')!
    render(<PersonCard person={person} kind="core" />)
    expect(screen.getByText(person.biography!)).toBeInTheDocument()
  })

  it('shows only staff in the homepage scope, including database directors', async () => {
    getPublicPeople.mockResolvedValue([
      { slug: 'another-director', display_name: 'Another Director', person_type: 'director', role: 'Board Director' },
      { slug: 'database-contributor', display_name: 'Database Contributor', person_type: 'core_contributor', role: 'Researcher' },
    ] satisfies Partial<PublicPerson>[])
    render(await PeopleDirectory({ scope: 'staff' }))

    expect(screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent))
      .toEqual(['Rein staff'])
    expect(screen.getAllByRole('heading', { level: 4 }).map((heading) => heading.textContent))
      .toEqual(['Tempest Ren', 'Zexin Li'])
    expect(getPublicPeople).toHaveBeenLastCalledWith()
    expect(screen.queryByText('Database Contributor')).not.toBeInTheDocument()
  })

  it('shows staff, contributors, and general members in separate ordered sections', async () => {
    getPublicPeople.mockResolvedValue([])
    render(await PeopleDirectory({}))

    expect(screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent))
      .toEqual(['Rein staff', 'Community contributors', 'Community members'])
    const contributors = screen.getByRole('heading', { name: 'Community contributors' }).parentElement!
    expect(within(contributors).getAllByRole('heading', { level: 4 }).map((heading) => heading.textContent))
      .toEqual(['Dwan Zhang', 'Yiming Zeng'])
    const members = screen.getByRole('heading', { name: 'Community members' }).parentElement!
    expect(within(members).getByRole('heading', { name: 'Yicheng Zhang' })).toBeInTheDocument()
    expect(within(members).getByText(/Yicheng researches/)).toBeInTheDocument()
  })

  it('places database core contributors before general members and deduplicates curated profiles', async () => {
    getPublicPeople.mockResolvedValue([
      { slug: 'database-contributor', display_name: 'Database Contributor', person_type: 'core_contributor', role: 'Researcher' },
      { slug: 'yicheng-zhang', display_name: 'Duplicate Yicheng', person_type: 'core_contributor', role: 'Researcher' },
    ] satisfies Partial<PublicPerson>[])
    render(await PeopleDirectory({}))

    const contributors = screen.getByRole('heading', { name: 'Community contributors' }).parentElement!
    expect(within(contributors).getByRole('heading', { name: 'Database Contributor' })).toBeInTheDocument()
    expect(screen.queryByText('Duplicate Yicheng')).not.toBeInTheDocument()
    expect(screen.getAllByRole('heading', { name: 'Yicheng Zhang' })).toHaveLength(1)
  })
})
