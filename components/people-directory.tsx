import { getPublicPeople } from '@/lib/community/data'
import type { PublicPerson } from '@/lib/community/types'

type Profile = Pick<PublicPerson, 'slug' | 'display_name' | 'role' | 'photo_url' | 'photo_alt' | 'biography'> & {
  profession?: string
  website_url?: string | null
  github_url?: string | null
  scholar_url?: string | null
  linkedin_url?: string | null
}

const founder: Profile = {
  slug: 'tempest-ren',
  display_name: 'Tempest Ren',
  role: 'Founder & Board Director',
  profession: 'AI Agent Builder, AI Researcher',
  photo_url: '/people/tempest-ren.webp',
  photo_alt: 'Portrait of Tempest Ren',
  biography: "I'm AI Agent Builder, AI Researcher, Ex-Tiktok Engineer. I build super agent for real work in organization and business.",
}

function ProfileCard({ person, board }: { person: Profile; board?: boolean }) {
  const profession = board ? person.profession : person.role
  const links = [
    ['Website', person.website_url], ['GitHub', person.github_url], ['Google Scholar', person.scholar_url], ['LinkedIn', person.linkedin_url],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]))

  return (
    <article className={`profile-card ${board ? 'profile-card--board' : 'profile-card--member'}`}>
      {person.photo_url && <img className="profile-card__portrait" src={person.photo_url} alt={person.photo_alt ?? ''} loading="lazy" />}
      <div>
        {board && <p className="profile-card__role">{person.role}</p>}
        <h4>{person.display_name}</h4>
        {profession && <p className="profile-card__profession">{profession}</p>}
        {board && person.biography && <p className="profile-card__bio">{person.biography}</p>}
        {links.length > 0 && <div className="profile-card__links">{links.map(([label, url]) => <a href={url} target="_blank" rel="noreferrer" key={label}>{label}</a>)}</div>}
      </div>
    </article>
  )
}

export async function PeopleDirectory({ featured = false }: { featured?: boolean }) {
  const people = await getPublicPeople({ featured })
  const publishedFounder = people.find((person) => person.slug === founder.slug)
  const directors: Profile[] = [
    { ...publishedFounder, ...founder },
    ...people.filter((person) => person.person_type === 'director' && person.slug !== founder.slug),
  ]
  const members = people.filter((person) => person.person_type !== 'director' && person.slug !== founder.slug)

  return (
    <div className="people-directory">
      <section>
        <h3 className="article-kicker">Board members</h3>
        {directors.map((person) => <ProfileCard person={person} board key={person.slug} />)}
      </section>
      {members.length > 0 && <section>
        <h3 className="article-kicker">Community members</h3>
        <div className="profile-grid">{members.map((person) => <ProfileCard person={person} key={person.slug} />)}</div>
      </section>}
    </div>
  )
}
