import { getPublicPeople } from '@/lib/community/data'
import type { PublicPerson } from '@/lib/community/types'

type Profile = Pick<PublicPerson, 'slug' | 'display_name' | 'role' | 'photo_url' | 'photo_alt' | 'biography'> & {
  profession?: string
  website_url?: string | null
  github_url?: string | null
  scholar_url?: string | null
  linkedin_url?: string | null
}

const boardProfiles: Profile[] = [
  {
    slug: 'tempest-ren',
    website_url: 'https://tempest.fun/',
    display_name: 'Tempest Ren',
    role: 'Founder & Board Chair',
    profession: 'AI Agent Builder & Researcher · ex-TikTok engineer',
    photo_url: '/people/tempest-ren.webp',
    photo_alt: 'Portrait of Tempest Ren',
    biography: 'Tempest builds super agents and studies how people can evaluate and oversee their work. As founder and board chair, he sets Rein’s research and community priorities to advance AI agent safety.',
  },
  {
    slug: 'zexin-li',
    display_name: 'Zexin Li',
    role: 'Board Director',
    profession: 'Postdoctoral Research Fellow, Nanyang Technological University',
    photo_url: '/people/zexin-li.webp',
    photo_alt: 'Illustrated portrait of Zexin Li',
    biography: 'Zexin studies how machine learning models can run reliably on devices with limited computing power. His research spans real-time embedded systems and on-device learning.',
    website_url: 'https://zexinli.com/',
  },
]

const communityProfiles: Profile[] = [
  {
    slug: 'yiming-zeng',
    display_name: 'Yiming Zeng',
    role: 'Researcher Scientist Intern at ByteDance, Seed Team',
    website_url: 'https://yiming-zeng.github.io/',
    photo_url: '/people/yiming-zeng.webp',
    photo_alt: 'Illustrated portrait of Yiming Zeng',
    biography: null,
  },
]

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
  const boardSlugs = new Set(boardProfiles.map((profile) => profile.slug))
  const remaining = people.filter((person) => !boardSlugs.has(person.slug))
  const directors = [
    ...boardProfiles.map((profile) => ({
      ...people.find((person) => person.slug === profile.slug),
      ...profile,
    })),
    ...remaining.filter((person) => person.person_type === 'director'),
  ]
  const communitySlugs = new Set(communityProfiles.map((profile) => profile.slug))
  const members = [
    ...communityProfiles,
    ...remaining.filter((person) => person.person_type !== 'director' && !communitySlugs.has(person.slug)),
  ]

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
