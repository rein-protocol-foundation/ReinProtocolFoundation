import { getPublicPeople } from '@/lib/community/data'
import type { PublicPerson } from '@/lib/community/types'

type Profile = Pick<PublicPerson, 'slug' | 'display_name' | 'role' | 'photo_url' | 'photo_alt' | 'biography'> & {
  directoryRole: 'board' | 'staff' | 'core_contributor' | 'contributor' | 'community_member'
  profession?: string
  website_url?: string | null
  github_url?: string | null
  scholar_url?: string | null
  linkedin_url?: string | null
}

const staffProfiles: Profile[] = [
  {
    slug: 'tempest-ren',
    directoryRole: 'board',
    website_url: 'https://tempest.fun/',
    display_name: 'Tempest Ren',
    role: 'Founder & Board Chair',
    profession: 'AI Researcher & Serial Entrepreneur',
    photo_url: '/people/tempest-ren.webp',
    photo_alt: 'Portrait of Tempest Ren',
    biography: 'Tempest is an AI researcher and serial entrepreneur studying agent safety, evaluation, and human oversight. He builds AI agents for real-world work and leads Rein’s research and community initiatives.',
  },
  {
    slug: 'zexin-li',
    directoryRole: 'board',
    display_name: 'Zexin Li',
    role: 'Board Director',
    profession: 'Postdoctoral Researcher · NTU Singapore',
    photo_url: '/people/zexin-li.webp',
    photo_alt: 'Illustrated portrait of Zexin Li',
    biography: 'Zexin studies how advanced AI agents can run reliably on edge devices. To make these agents trustworthy, he investigates how to continually adapt models while meeting response deadlines, detect system failures and recover safely, and verify that a model’s behavior on the device is consistent with its behavior before deployment.',
    website_url: 'https://zexinli.com/',
  },
]

const communityProfiles: Profile[] = [
  {
    slug: 'yicheng-zhang',
    directoryRole: 'community_member',
    display_name: 'Yicheng Zhang',
    role: 'Community Member',
    profession: 'Assistant Professor · George Mason University',
    website_url: 'https://yichez.site/',
    photo_url: '/people/yicheng-zhang.webp',
    photo_alt: 'Illustrated portrait of Yicheng Zhang',
    biography: 'Yicheng researches hardware and system security, focusing on GPU vulnerabilities, side-channel attacks, and privacy in AR/VR and AI glasses. His work helps protect computing systems.',
  },
  {
    slug: 'dwan-zhang',
    directoryRole: 'core_contributor',
    display_name: 'Dwan Zhang',
    role: 'Core Contributor',
    profession: 'Senior Researcher at ByteDance, Seed Team',
    linkedin_url: 'https://www.linkedin.com/in/dwan-zhang-b6a852295/',
    photo_url: '/people/dwan-zhang.webp',
    photo_alt: 'Illustrated portrait of Dwan Zhang',
    biography: 'Dwan studies large language model evaluation and data, developing reliable tests to understand model capabilities, identify failures, and guide improvements.',
  },
  {
    slug: 'yiming-zeng',
    directoryRole: 'core_contributor',
    display_name: 'Yiming Zeng',
    role: 'Core Contributor',
    profession: 'Researcher Scientist Intern at ByteDance, Seed Team',
    website_url: 'https://yiming-zeng.github.io/',
    photo_url: '/people/yiming-zeng.webp',
    photo_alt: 'Illustrated portrait of Yiming Zeng',
    biography: 'Yiming researches efficient, adaptive language models, post-training, and evaluation. His work spans AI agents and natural language processing for healthcare and scientific discovery.',
  },
]

function ProfileCard({ person, staff }: { person: Profile; staff?: boolean }) {
  const organizationRole = staff || person.profession ? person.role : undefined
  const profession = person.profession ?? (staff ? undefined : person.role)
  const links = [
    ['Website', person.website_url], ['GitHub', person.github_url], ['Google Scholar', person.scholar_url], ['LinkedIn', person.linkedin_url],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]))

  return (
    <article className={`profile-card ${staff ? 'profile-card--board' : 'profile-card--member'}`}>
      {person.photo_url && <img className="profile-card__portrait" src={person.photo_url} alt={person.photo_alt ?? ''} loading="lazy" />}
      <div>
        {organizationRole && <p className="profile-card__role">{organizationRole}</p>}
        <h4>{person.display_name}</h4>
        {profession && <p className="profile-card__profession">{profession}</p>}
        {person.biography && <p className="profile-card__bio">{person.biography}</p>}
        {links.length > 0 && <div className="profile-card__links">{links.map(([label, url]) => <a href={url} target="_blank" rel="noreferrer" key={label}>{label}</a>)}</div>}
      </div>
    </article>
  )
}

export async function PeopleDirectory({ featured = false, scope = 'all' }: { featured?: boolean; scope?: 'all' | 'staff' }) {
  const people = await getPublicPeople({ featured })
  const staticProfiles = [...staffProfiles, ...communityProfiles]
  const staticSlugs = new Set(staticProfiles.map((profile) => profile.slug))
  const profiles: Profile[] = [
    ...staticProfiles.map((profile) => ({
      ...people.find((person) => person.slug === profile.slug),
      ...profile,
    })),
    ...people.filter((person) => !staticSlugs.has(person.slug)).map((person): Profile => ({
      ...person,
      directoryRole: person.person_type === 'director' ? 'board' : 'core_contributor',
    })),
  ]
  const staff = profiles.filter((person) => person.directoryRole === 'board' || person.directoryRole === 'staff')
  const contributors = [
    ...profiles.filter((person) => person.directoryRole === 'core_contributor'),
    ...profiles.filter((person) => person.directoryRole === 'contributor'),
  ]
  const members = profiles.filter((person) => person.directoryRole === 'community_member')

  return (
    <div className="people-directory">
      {staff.length > 0 && <section data-people-tier="staff">
        <h3 className="article-kicker">Rein staff</h3>
        {staff.map((person) => <ProfileCard person={person} staff key={person.slug} />)}
      </section>}
      {scope === 'all' && contributors.length > 0 && <section data-people-tier="contributors">
        <h3 className="article-kicker">Community contributors</h3>
        <div className="profile-grid">{contributors.map((person) => <ProfileCard person={person} key={person.slug} />)}</div>
      </section>}
      {scope === 'all' && members.length > 0 && <section data-people-tier="members">
        <h3 className="article-kicker">Community members</h3>
        <div className="profile-grid">{members.map((person) => <ProfileCard person={person} key={person.slug} />)}</div>
      </section>}
    </div>
  )
}
