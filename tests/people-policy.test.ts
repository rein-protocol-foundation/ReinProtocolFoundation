import { describe, it, expect } from 'vitest'
import { curatedPeople, organizePeople, homepagePeople, paginatePeople, peoplePageHref, type Person } from '@/lib/people/directory'
import { peopleSchema } from '@/lib/people/schema'
const person = (i:number,role:Person['directoryRole']='community_member'):Person=>({...curatedPeople[0],slug:`person-${i}`,display_name:`Person ${i}`,directoryRole:role,role,biography:'Works on AI safety.',sort_order:i,homepage_featured:false})
describe('People policies',()=>{
  it('switches at seven combined regular contributors and members, excluding core contributors',()=>{
    const people=[...Array.from({length:5},(_,i)=>person(i)),person(5,'contributor'),person(6,'core_contributor')]
    expect(organizePeople([],people).compact).toBe(false)
    expect(organizePeople([],[...people,person(7,'contributor')]).compact).toBe(true)
    expect(organizePeople([],people).contributors.map(p=>p.directoryRole)).toEqual(['core_contributor','contributor'])
  })
  it('caps explicit staff selections and does not backfill',()=>{
    for(const count of [0,2,4,5]) {
      const staff=Array.from({length:5},(_,i)=>({...person(i,'staff'),homepage_featured:i<count,homepage_order:5-i}))
      expect(homepagePeople(staff)).toHaveLength(Math.min(count,4))
      if(count>0) expect(homepagePeople(staff)[0].slug).toBe(`person-${count-1}`)
    }
  })
  it('paginates and normalizes invalid pages without changing other query parameters',()=>{
    const people=Array.from({length:13},(_,i)=>person(i))
    expect(paginatePeople(people,'1').items).toHaveLength(12)
    expect(paginatePeople(people,'2').items).toHaveLength(1)
    expect(paginatePeople(people,'999').page).toBe(2)
    for(const value of ['-1','0','oops',undefined,['2']]) expect(paginatePeople(people,value).page).toBe(1)
    expect(paginatePeople([],'9').items).toEqual([])
    expect(peoplePageHref({staffPage:'2',membersPage:'1'},'membersPage',2,'people-members')).toBe('/community?staffPage=2&membersPage=2#people-members')
  })
  it('rejects duplicates, invalid roles, long bios and nonstaff homepage selections',()=>{
    expect(peopleSchema.safeParse([person(0),person(0)]).success).toBe(false)
    for(const override of [{directoryRole:'unknown'},{biography:'word '.repeat(31)},{homepage_featured:true},{photo_alt:''},{website_url:'javascript:alert(1)'}]) {
      expect(peopleSchema.safeParse([{...person(0),...override}]).success).toBe(false)
    }
    expect(peopleSchema.safeParse([{...person(0),photo_url:null,photo_alt:null}]).success).toBe(true)
  })
})
