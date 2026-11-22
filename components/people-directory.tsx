import Link from 'next/link'
import { getPublicPeople } from '@/lib/community/data'
import { homepagePeople, organizePeople, paginatePeople, peoplePageHref, type Person, type PeopleQuery } from '@/lib/people/directory'

function Portrait({ person }: {person:Person}) {
  return person.photo_url ? <img className="profile-card__portrait" src={person.photo_url} alt={person.photo_alt ?? ''} loading="lazy" /> : <span className="profile-card__portrait profile-card__initials" aria-hidden="true">{person.display_name.split(/\s+/).map(word=>Array.from(word)[0]).slice(0,2).join('')}</span>
}
export function CompactPersonCard({person}:{person:Person}) {
  const href=person.website_url || person.linkedin_url
  return <article className="profile-card profile-card--compact"><Portrait person={person}/><div><h4>{href?<a href={href} target="_blank" rel="noreferrer">{person.display_name}</a>:person.display_name}</h4><p className="profile-card__profession">{person.profession}</p></div></article>
}
export function PersonCard({person,kind}:{person:Person;kind:'staff'|'core'|'member'}) {
  const links=[['Website',person.website_url],['GitHub',person.github_url],['Google Scholar',person.scholar_url],['LinkedIn',person.linkedin_url]].filter((entry):entry is [string,string]=>Boolean(entry[1]))
  return <article className={`profile-card profile-card--${kind}`}><Portrait person={person}/><div><p className="profile-card__role">{person.role}</p><h4>{person.display_name}</h4><p className="profile-card__profession">{person.profession}</p>{person.biography&&<p className="profile-card__bio">{person.biography}</p>}<div className="profile-card__links">{links.map(([label,url])=><a key={label} href={url} target="_blank" rel="noreferrer">{label}</a>)}</div></div></article>
}
export async function PeopleDirectory({scope='all',query={}}:{scope?:'all'|'staff';query?:PeopleQuery}) {
  const groups=organizePeople(await getPublicPeople())
  const sections=scope==='staff' ? [{key:'staff',title:'Rein staff',people:homepagePeople(groups.staff)}] : [
    {key:'staff',title:'Rein staff',people:groups.staff},
    {key:'contributors',title:'Community contributors',people:groups.contributors},
    {key:'members',title:'Community members',people:groups.members},
  ]
  return <div className="people-directory">{sections.filter(s=>s.people.length).map(section=>{
    const {items,page,pages}=paginatePeople(section.people,query[`${section.key}Page`])
    const anchor=`people-${section.key}`
    return <section key={section.key} id={anchor} data-people-tier={section.key}>
      <h3 className="article-kicker">{section.title}</h3>
      <div className={`profile-grid ${groups.compact&&section.key==='members'?'profile-grid--compact':''}`}>
        {items.map(person=> groups.compact&&(person.directoryRole==='contributor'||person.directoryRole==='community_member') ? <CompactPersonCard key={person.slug} person={person}/> : <PersonCard key={person.slug} person={person} kind={section.key==='staff'?'staff':person.directoryRole==='core_contributor'?'core':'member'}/>)}
      </div>
      {scope==='all'&&pages>1&&<nav className="people-pagination" aria-label={`${section.title} pages`}>
        {page>1&&<Link href={peoplePageHref(query,`${section.key}Page`,page-1,anchor)}>Previous</Link>}
        <span aria-live="polite">Page {page} of {pages}</span>
        {page<pages&&<Link href={peoplePageHref(query,`${section.key}Page`,page+1,anchor)}>Next</Link>}
      </nav>}
    </section>
  })}</div>
}
