import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import communityConvergence from '@/src/assets/scenes/community-convergence.webp'
import { CommunitySection } from '@/components/community-shell'
import { DiscordInvitation } from '@/components/discord-invitation'
import { ContributionPaths, getContributionIssueLinks } from '@/components/contribution-paths'
import { ParticipantForm } from '@/components/forms/participant-form'
import { PeopleDirectory } from '@/components/people-directory'
import { ResourceCard } from '@/components/resource-card'
import { getPublishedEvents, getPublishedResources, getPublicMemberMetrics } from '@/lib/community/data'
import { publicCommunityAudience } from '@/lib/community/presentation'

export const metadata: Metadata = { alternates: { canonical: '/community' }, title: 'AI Agent Community', description: 'Join in-person events and online conversations, share learning materials, and find peer guidance for a career working with AI agents.' }
export const maxDuration = 60

function firstStart(event: NonNullable<Awaited<ReturnType<typeof getPublishedEvents>>>[number]) {
  return event.event_sessions.map((session) => new Date(session.starts_at)).sort((a, b) => a.getTime() - b.getTime())[0]
}

async function CommunityAudience() {
  const metrics = await getPublicMemberMetrics()
  return <>{publicCommunityAudience(metrics.allTime)}</>
}

async function ResourcePreview() {
  const { resources, hasMore, unavailable } = await getPublishedResources({ limit: 3 })
  if (unavailable) return <p>Learning resources are temporarily unavailable.</p>
  if (!resources.length) return null
  return (
    <div className="resource-preview">
      <div className="resource-list resource-list--preview">
        {resources.map(resource => <ResourceCard key={resource.id} resource={resource} headingLevel={4} />)}
      </div>
      {hasMore && <Link href="/community/learn" className="text-action resource-preview__more">Browse all learning resources</Link>}
    </div>
  )
}

async function EventList() {
  const events = await getPublishedEvents()
  if (events === null) return <p>The event list is temporarily unavailable.</p>
  const upcomingEvents = events.filter(event => (firstStart(event)?.getTime() ?? 0) >= Date.now() && event.attendance_status !== 'closed')
  if (!upcomingEvents.length) return null
  return (
    <article>
      <div><p className="article-kicker">Event calendar</p><h3>Upcoming events.</h3><p>Explore in-person, online, and hybrid sessions.</p></div>
      <div className="event-list">
        {upcomingEvents.map(event => {
          const start = firstStart(event)
          return (
            <article className="event-card" key={event.id}>
              <span className="event-card__meta">{event.format.replace('_', ' ')} · {event.attendance_status}</span>
              <h4>{event.title}</h4><p>{event.summary}</p>
              {start && <p className="field-hint">{new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeStyle: 'short', timeZone: event.timezone }).format(start)}</p>}
              <Link href={`/community/gather/${event.slug}`}>Event details</Link>
            </article>
          )
        })}
      </div>
    </article>
  )
}

function CommunityProgram() {
  return (
    <div className="community-program-list">
      <article>
        <div><p className="article-kicker">01 / Meet in person</p><h3>In-person events.</h3><p>Meet people working with AI agents through local meetups, workshops, presentations, and discussions. Share a project, explore safety research, or help organize an event in your community.</p></div>
      </article>
      <article>
        <div><p className="article-kicker">02 / Connect online</p><h3>Online community and learning.</h3><p>Continue the conversation on Discord, take part in online presentations and events, and exchange questions and ideas about AI agents. Contributors also collaborate in our Slack workspace.</p><p>Share learning materials, discuss research, and offer project feedback or career guidance to members preparing for AI agent roles. Bring your experience, whether you are new to the field or already working in it.</p></div>
        <Suspense fallback={null}><ResourcePreview /></Suspense>
      </article>
      <Suspense fallback={null}><EventList /></Suspense>
    </div>
  )
}

async function CommunityContribute() {
  const contributionIssueLinks = await getContributionIssueLinks()
  return <ContributionPaths issueLinks={contributionIssueLinks} />
}

function ContributeFallback() {
  return (
    <ol className="contribution-list" aria-hidden="true">
      {[0, 1, 2].map((index) => (
        <li key={index}>
          <span className="skeleton-line skeleton-line--index" />
          <div><span className="skeleton-line skeleton-line--title" /><span className="skeleton-line skeleton-line--bio" /><span className="skeleton-line skeleton-line--bio skeleton-line--short" /></div>
        </li>
      ))}
    </ol>
  )
}

export default function CommunityPage() {
  return <main id="main-content" className="community-shell">
    <header className="community-hero" aria-labelledby="community-title">
      <div className="page-shell community-hero__grid">
        <div className="community-hero__content">
          <p className="eyebrow">Rein Community</p>
          <h1 id="community-title">A community of <Suspense fallback={<span className="audience-pending">many active participants</span>}><CommunityAudience /></Suspense>.</h1>
          <p className="community-hero__lead">Meet people working with AI agents, learn together at events and online, and help each other grow. Share your knowledge and find guidance for your next step in the field.</p>
          <p className="community-hero__welcome">Start with a conversation, a resource, or an event. Public resources and events are open without registration.</p>
          <DiscordInvitation />
        </div>
        <figure className="community-hero__figure"><img src={communityConvergence.src} alt="" width="1619" height="971" fetchPriority="high" /><figcaption>Paths converge / Community study</figcaption></figure>
      </div>
    </header>

    <CommunitySection eyebrow="01 / Our early programs" title="Meet in person. Stay connected online." lead="Two connected priorities: local events and an online community for conversations, presentations, shared learning, and career guidance." id="program" tone="soft">
      <p className="community-contribution-context"><Link href="/community/learn">Browse AI agent learning resources</Link> for free courses, tutorials, and research discussions.</p>
      <CommunityProgram />
    </CommunitySection>

    <CommunitySection eyebrow="02 / People" title="People behind the work." id="people">
      <Suspense fallback={null}><PeopleDirectory /></Suspense>
    </CommunitySection>

    <CommunitySection eyebrow="03 / Stay connected" title="Register for community updates." lead="Hear about local events, online presentations, learning materials, and ways to contribute, with updates relevant to your field and region." id="register" tone="soft">
      <ParticipantForm />
    </CommunitySection>

    <CommunitySection eyebrow="04 / Contribute" title="Choose how you want to contribute." lead="Organize an event, give a presentation, share learning materials, or help another member prepare for work with AI agents." id="contribute">
      <p className="community-contribution-context">You can participate in public activities without applying. Registering for updates makes you a Community Participant. Apply as a Contributor when you want to organize or take responsibility for ongoing work; Core Contributors are recognized for sustained responsibility.</p>
      <Suspense fallback={<ContributeFallback />}><CommunityContribute /></Suspense>
    </CommunitySection>
  </main>
}
