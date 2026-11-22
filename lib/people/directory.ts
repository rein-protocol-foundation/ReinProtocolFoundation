import records from '@/data/people.json'
import type { PublicPerson } from '@/lib/community/types'

import { peopleSchema, type Person } from './schema'
export type { Person } from './schema'
export type PeopleQuery = Record<string, string | string[] | undefined>
export const curatedPeople = peopleSchema.parse(records)
const rank = {board:0,staff:1,core_contributor:2,contributor:3,community_member:4}
export function organizePeople(database: PublicPerson[], curated: Person[] = curatedPeople) {
  const slugs = new Set(curated.map(p=>p.slug))
  const people: Person[] = [...curated, ...database.filter(p=>!slugs.has(p.slug)).map((p,i): Person=>({
    ...p, directoryRole:p.person_type === 'director' ? 'board' : 'core_contributor',
    profession:p.role, role:p.person_type === 'director' ? 'Board Director' : 'Core Contributor',
    sort_order:i,homepage_featured:false,homepage_order:100,
  }))]
  people.sort((a,b)=>rank[a.directoryRole]-rank[b.directoryRole] || a.sort_order-b.sort_order || a.display_name.localeCompare(b.display_name,'en') || a.slug.localeCompare(b.slug,'en'))
  return {
    staff:people.filter(p=>p.directoryRole==='board'||p.directoryRole==='staff'),
    contributors:people.filter(p=>p.directoryRole==='core_contributor'||p.directoryRole==='contributor'),
    members:people.filter(p=>p.directoryRole==='community_member'),
    compact:people.filter(p=>p.directoryRole==='contributor'||p.directoryRole==='community_member').length>6,
  }
}
export function homepagePeople(staff: Person[]) {
  return staff.filter(p=>p.homepage_featured).sort((a,b)=>a.homepage_order-b.homepage_order || a.sort_order-b.sort_order || a.slug.localeCompare(b.slug)).slice(0,4)
}
export function paginatePeople(people: Person[], value: PeopleQuery[string]) {
  const parsed = typeof value === 'string' && /^[1-9]\d*$/.test(value) ? Number(value) : 1
  const pages = Math.max(1, Math.ceil(people.length/12))
  const page = Math.min(Number.isSafeInteger(parsed)?parsed:1,pages)
  return {items:people.slice((page-1)*12,page*12),page,pages}
}
export function peoplePageHref(query: PeopleQuery, key: string, page: number, anchor: string) {
  const params=new URLSearchParams()
  for(const [k,v] of Object.entries(query)) if(v!==undefined) for(const entry of Array.isArray(v)?v:[v]) params.append(k,entry)
  params.set(key,String(page))
  return `/community?${params.toString()}#${anchor}`
}
