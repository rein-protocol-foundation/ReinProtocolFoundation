import { CommunitySection } from '@/components/community-shell'
import { ParticipantForm } from '@/components/forms/participant-form'
import { githubOrganizationUrl } from '@/lib/github'
import { PeopleDirectory } from '@/components/people-directory'
import Link from 'next/link'
import { Suspense } from 'react'
import sanFrancisco from '@/src/assets/scenes/san-francisco.webp'
import santaClara from '@/src/assets/scenes/santa-clara.webp'
import stanford from '@/src/assets/scenes/stanford.webp'
import paloAlto from '@/src/assets/scenes/palo-alto.webp'
import losAngeles from '@/src/assets/scenes/los-angeles.webp'
import { ArticleHero, TextLink } from '@/components/primitives'
import { getPublicMemberMetrics } from '@/lib/community/data'
import { publicCommunityAudience } from '@/lib/community/presentation'

const audioAgentPaper = {
  title: 'A³: Adaptive Audio Agent Framework for Collaborative Edge Computing',
  url: 'https://arxiv.org/abs/2611.18064',
}

const fundPath = [
  { label: 'Accept', text: 'Only through verified channels and approved assets.' },
  { label: 'Safeguard', text: 'Segregated custody, policy limits and accountable signers.' },
  { label: 'Allocate', text: 'Mission budgets governed by humans, DAO and policy.' },
  { label: 'Publish', text: 'Transactions, decisions, expenses and outcomes.' },
]

const governanceActors = [
  { label: 'Human Board', role: 'Legally accountable', text: 'Fiduciary duties, legal standing, people, major direction and Agent oversight.' },
  { label: 'DAO', role: 'Proposed voting role', text: 'The founding model gives authenticated community members one collective vote.' },
  { label: 'AI Agents', role: 'Operating by default', text: 'Planning, research, reporting and policy-bound program execution.' },
]

const disclosureCadence = [
  ['Live', 'Wallets, material transactions, proposals and votes'],
  ['Monthly', 'Treasury movement, expenses, programs and Agent activity'],
  ['Quarterly', 'Budget, outcomes, risks, failures and control improvements'],
  ['Annual', 'Financial, governance, impact and filing record'],
]

async function HomeAudience() {
  const metrics = await getPublicMemberMetrics()
  return <>{publicCommunityAudience(metrics.allTime)}</>
}

export function InstitutionalHomePage() {
  return (
    <main id="main-content">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-hero__art" aria-hidden="true"><img src={sanFrancisco.src} alt="" width="971" height="1619" fetchPriority="high" /></div>
        <div className="home-hero__content page-shell">
          <p className="eyebrow hero-enter hero-enter--1">A NONPROFIT ORGANIZATION FOR AI AGENT SAFETY</p>
          <h1 id="home-title">Making AI agents <span className="home-hero__accent">safe</span> <em>for <span className="home-hero__accent">people</span> and <span className="home-hero__accent">society</span>.</em></h1>
          <p className="home-hero__mission hero-enter hero-enter--3">We bring people together and support open-source projects and research to make AI agents safe, with a focus on transparency, observability, and policy controls.</p>
          <div className="home-hero__actions">
            <a className="primary-action" href="#register">Register for community updates</a>
          </div>
        </div>
        <div className="home-hero__principles page-shell hero-enter hero-enter--5" aria-label="Founding principles"><span>Open participation</span><span>AI-native operations</span><span>Human accountable</span></div>
      </section>

      <section className="position-section" id="mission" aria-labelledby="position-title">
        <div className="page-shell position-grid">
          <p className="section-index" data-reveal>01 / Why agent safety</p>
          <div data-reveal><h2 id="position-title">Intelligence is becoming public power.</h2><p className="position-lead">Agents use tools, access systems, and carry out tasks. We support the research, open-source work, and shared knowledge that help people understand and oversee those actions.</p><TextLink href="/mission">Our approach to AI agent safety</TextLink></div>
          <div className="value-line" data-reveal>
            <div><strong>Benefit</strong><span>Help agents do useful work for people and communities.</span></div>
            <div><strong>Visibility</strong><span>Make agent actions understandable and inspectable.</span></div>
            <div><strong>Governance</strong><span>Set clear permissions and keep people responsible.</span></div>
          </div>
        </div>
      </section>

      <section className="work-section" id="programs" aria-labelledby="work-title">
        <div className="work-visual" aria-hidden="true" data-reveal><img className="deferred-image is-loaded" src={stanford.src} width="972" height="1619" alt="" loading="lazy" /><span>Knowledge bears duty</span></div>
        <div className="work-content" data-reveal>
          <h2 id="work-title">Open source and research.</h2>
          <div className="home-projects">
            <article>
              <h3><a href="https://nori.rein-protocol.org/">Nori</a></h3>
              <p>Nori is the open-source Super Agent that autonomously runs operations across Rein Protocol Foundation.</p>
            </article>
            <article>
              <h3><a href={audioAgentPaper.url}>{audioAgentPaper.title}</a></h3>
              <p>November 2026 preprint by Zexin Li, Xueyi Zhang, Tao Ren, and Yiming Chen. The authors study how an audio agent can keep answering on-device when it loses its server connection.</p>
            </article>
          </div>
          <p><a className="text-action" href={githubOrganizationUrl}>Browse Rein’s repositories on GitHub</a></p>
          <TextLink href="/programs">Explore our programs</TextLink>
        </div>
      </section>

      <section className="stewardship-section" id="governance" aria-labelledby="stewardship-title">
        <div className="stewardship-art" aria-hidden="true"><img className="deferred-image is-loaded" src={paloAlto.src} width="971" height="1619" alt="" loading="lazy" /></div>
        <div className="page-shell stewardship-content">
          <div className="stewardship-heading" data-reveal><p className="section-index section-index--light">03 / An AI-native organization</p><h2 id="stewardship-title">AI agents help run Rein and advance agent safety.</h2><p>We use AI agents to support research, coordination, and operations. We also explore how they can help monitor other agents. People set limits, review consequential decisions, and remain responsible for the outcomes.</p></div>
          <div className="accountability-line" data-reveal><p><strong>Human Board</strong> carries legal accountability.</p><p><strong>DAO</strong> would participate through one collective vote under the proposed model.</p><p><strong>AI Agents</strong> execute within visible policy.</p></div>
          <p className="stewardship-support" id="giving" data-reveal>Our funding priorities are accessible events, shared learning, open-source projects, and safety research. Giving channels remain subject to legal and operational approval.</p>
        </div>
      </section>

      <CommunitySection id="register" title="Register for community updates." eyebrow="Stay connected" lead="Get news about Rein’s research, learning resources, and community activities by email.">
        <ParticipantForm />
      </CommunitySection>

      <section className="community-section community-section--soft" aria-labelledby="home-community-title">
        <div className="page-shell">
          <div className="community-heading"><p className="section-index">04 / Community</p><div><h2 id="home-community-title">A public network of <Suspense fallback={<span className="audience-pending">many active participants</span>}><HomeAudience /></Suspense>.</h2><p>Meet people working with AI agents, join local and online events, share learning materials, and help each other prepare for AI agent roles.</p><TextLink href="/community/learn">Browse AI agent learning resources</TextLink></div></div>
          <Link href="/community" className="text-action">Explore the community</Link>
          <Suspense fallback={null}>
            <PeopleDirectory featured />
          </Suspense>
        </div>
      </section>
    </main>
  )
}

function ArticleLayout({ summaryLabel, summary, children }: { summaryLabel: string; summary: string; children: React.ReactNode }) {
  return <section className="article-body"><div className="page-shell article-layout"><aside className="article-rail"><span>{summaryLabel}</span><p>{summary}</p></aside><article className="article-copy">{children}</article></div></section>
}

export function MissionPage() {
  return <main id="main-content"><ArticleHero eyebrow="Our mission" title="AI agent safety, with people accountable." lead="Rein supports AI agent development through community, open-source projects, and research into transparency, observability, and policy controls. We want people to benefit from agents they can understand and oversee." image={santaClara} imagePosition="50% 58%" caption="Institutional memory / Santa Clara" />
    <ArticleLayout summaryLabel="Our focus" summary="Support AI agent development and the people, research, and open infrastructure needed for safe use.">
      <p className="article-standfirst" data-reveal>AI agents connect language models to tools, software, and real tasks. That ability to act makes security, visibility, and oversight essential parts of their development.</p>
      <section id="constructive" data-reveal><p className="article-kicker">01 / Community and participation</p><h2>Help more people participate in AI agent development.</h2><p>Rein brings learners, researchers, and practitioners together to share knowledge and work on agent safety. Our role as a nonprofit includes supporting open-source projects, research, public discussion, and access to learning.</p><p>Members can meet at events, exchange ideas online, contribute learning materials, and guide peers moving into AI agent roles. These relationships help people turn an interest in the field into informed participation.</p><TextLink href="/community/learn">Explore AI agent learning resources</TextLink></section>
      <section id="protective" data-reveal><p className="article-kicker">02 / Security, visibility, and oversight</p><h2>Understand what agents do. Keep their actions accountable.</h2><p>Agent safety includes the systems around a language model: the harness that coordinates its work, the tools it can use, and the permissions it receives. We support work that makes those systems easier to inspect, test, and supervise.</p><p>Our areas of interest include monitoring agent behavior, detecting security threats and failures, explaining actions, and enabling human intervention. The long-term goal is to prevent serious harm to people and society as agents take on greater responsibilities.</p></section>
      <blockquote className="article-proposition" data-reveal>We believe AI agents can help monitor and supervise other agents, with people setting the rules and remaining accountable.</blockquote>
      <section id="practice" data-reveal><p className="article-kicker">03 / An AI-native organization</p><h2>Use agents to advance agent safety.</h2><p>We use AI agents to help operate and grow Rein. Applying them to research, coordination, and oversight also helps us understand the safety infrastructure an AI-native organization needs.</p><p>Our programs connect people through events and campus outreach, support AI researchers, and help open-source communities develop and maintain their projects.</p><TextLink href="/programs">Explore our programs</TextLink></section>
    </ArticleLayout>
  </main>
}

export function ProgramsPage() {
  return (
    <main id="main-content">
      <ArticleHero eyebrow="Our programs" title="Community, research, and open source."
        lead="Rein brings people together to learn about AI agents, supports the researchers who study them, and helps maintainers build tools others can use."
        image={stanford} imagePosition="50% 58%" caption="Knowledge and duty / Stanford" />
      <section className="article-body">
        <div className="page-shell article-layout">
          <nav className="article-rail" aria-label="Programs on this page">
            <span>Our programs</span>
            <p><a href="#community">Community</a><br /><a href="#research">Research</a><br /><a href="#open-source">Open source</a></p>
          </nav>
          <article className="article-copy">
            <section id="community" data-reveal>
              <h2>Community</h2>
              <p>Local meetups, online talks, and workshops give people a place to share projects and ask questions about AI agents. Through campus outreach, students can introduce their peers to the field or help organize an event at their school.</p>
              <p>On Discord, members can keep a discussion going after a talk, exchange job opportunities, and get career guidance from peers. Our <Link href="/community/learn">learning library</Link> collects free courses and tutorials for people studying on their own.</p>
              <TextLink href="/community">Join the community</TextLink>
            </section>
            <section id="research" data-reveal>
              <h2>Research</h2>
              <p>Rein’s in-house research team collaborates with researchers at Nanyang Technological University (NTU), UC Riverside (UCR), UC Irvine (UCI), and UCLA. We also work with research teams at ByteDance and Tencent.</p>
              <p>Through our research sponsorship program, we support AI researchers, including PhD students.</p>
              <p>In the preprint <a href={audioAgentPaper.url}>{audioAgentPaper.title}</a>, Zexin Li, Xueyi Zhang, Tao Ren, and Yiming Chen describe and test an audio agent that can continue answering on the device during an outage.</p>
            </section>
            <section id="open-source" data-reveal>
              <h2>Open source</h2>
              <p>Rein’s open-source program sponsors independent open-source communities and incubates projects within the Foundation.</p>
              <p>Rein incubated <a href="https://nori.rein-protocol.org/">Nori</a>, an open-source Super Agent that runs the Foundation’s day-to-day operations autonomously. It connects the people, tools, and work of the entire organization.</p>
              <TextLink href={githubOrganizationUrl}>Explore Rein’s projects on GitHub</TextLink>
            </section>
          </article>
        </div>
      </section>
    </main>
  )
}

export function GovernancePage() {
  return <main id="main-content"><ArticleHero eyebrow="Governance and stewardship" title="AI agents help run Rein. People remain responsible." lead="Our governance model defines who sets direction, what agents may do, and how their work is reviewed. Human oversight supports the community and its mission." image={paloAlto} imagePosition="50% 62%" caption="Shared systems / Palo Alto Baylands" />
    <ArticleLayout summaryLabel="Constitutional principle" summary="Automate operations wherever responsible; never automate away legal duty, human judgment or the ability to intervene.">
      <p className="article-standfirst" data-reveal>Rein is an AI-native organization. Agents help with research, coordination, and operations within defined permissions. People remain responsible for the mission, resources, and decisions that require human judgment.</p>
      <section data-reveal><p className="article-kicker">01 / Responsibility map</p><h2>Who decides, who acts, and who reviews.</h2><p>The following roles describe Rein’s founding model. Using agents to monitor other agents still requires clear authority and a path for human intervention.</p><p>Meet the <Link href="/community#people">people behind Rein</Link> and follow current work on <a href="https://nori.rein-protocol.org/">Nori</a> and in <a href={githubOrganizationUrl}>Rein’s public repositories</a>.</p><div className="actor-ledger">{governanceActors.map((actor, index) => <div key={actor.label}><span>0{index + 1}</span><div><strong>{actor.label}</strong><small>{actor.role}</small></div><p>{actor.text}</p></div>)}</div></section>
      <aside className="article-inset" data-reveal><p className="article-kicker">Governance vote architecture</p><h2>Community voice enters a legally accountable process.</h2><p>Each natural-person director has one vote. Under the proposed voting model, the authenticated DAO community would produce one collective governance vote with equal policy weight, subject to nonprofit law and nondelegable fiduciary duties.</p></aside>
      <section data-reveal><p className="article-kicker">02 / Stewardship path</p><h2>From accepted gift to visible outcome.</h2><ol className="article-process">{fundPath.map((step, index) => <li key={step.label}><span>0{index + 1}</span><div><strong>{step.label}</strong><p>{step.text}</p></div></li>)}</ol><p>Charitable assets remain Foundation property. They do not become donor property, Token-holder property or a private protocol treasury.</p></section>
      <section data-reveal><p className="article-kicker">03 / Planned disclosures</p><h2>What Rein plans to publish.</h2><dl className="article-cadence">{disclosureCadence.map(([term, description]) => <div key={term}><dt>{term}</dt><dd>{description}</dd></div>)}</dl><TextLink href="/giving">Review the giving model</TextLink></section>
    </ArticleLayout>
  </main>
}

export function GivingPage() {
  return <main id="main-content"><ArticleHero eyebrow="Supporting the mission" title="Support AI agent safety." lead="Our funding priorities include accessible events, shared learning, open-source projects, and safety research. Giving channels are subject to legal and operational approval." image={losAngeles} imagePosition="50% 100%" caption="Looking beyond / Los Angeles" />
    <ArticleLayout summaryLabel="Official-channel policy" summary="Giving channels require approval. Do not send contributions until verified channels and their terms are published.">
      <p className="article-standfirst" data-reveal>Support for Rein would advance safety research, support researchers, and expand public learning and participation. The giving model below explains how contributions would be accepted, managed, and reported.</p>
      <aside className="article-inset" data-reveal><p className="article-kicker">Official channels</p><h2>Giving will use verified Foundation channels once approved.</h2><p>No wallet address or payment link is authorized here yet. Future official channels must publish their network, asset, custody and receipt details and meet gift-acceptance, screening and accounting controls.</p></aside>
      <section data-reveal><p className="article-kicker">01 / Giving rails</p><h2>Broad access. Asset-by-asset control.</h2><div className="giving-ledger"><div><span>Core digital assets</span><strong>BTC · ETH · BNB</strong><p>Accepted only on specifically approved networks and through published Foundation-controlled addresses.</p></div><div><span>Stable and conventional</span><strong>Approved stablecoins · ACH · cards · wires</strong><p>We recommend lower-cost routes when fees would consume a disproportionate share of a gift.</p></div><div><span>Reviewed assets</span><strong>Exchange-issued tokens · Meme Coins · other assets</strong><p>Individual review for liquidity, custody, contract, compliance, accounting and liquidation risk.</p></div></div></section>
      <aside className="article-inset" data-reveal><p className="article-kicker">Accounting rule</p><h2>A gift and its later investment result are not the same thing.</h2><div className="receipt-steps"><p><span>At receipt</span>Record quantity, chain, timestamp and defensible fair value.</p><p><span>After receipt</span>Report appreciation or loss separately from donation revenue.</p><p><span>For the donor</span>Describe donated property; do not promise or assign the donor’s tax value.</p></div></aside>
      <section data-reveal><p className="article-kicker">02 / Operational controls</p><h2>Five controls govern every gift.</h2><ol className="article-process"><li><span>01</span><strong>Legal authority and Board oversight</strong></li><li><span>02</span><strong>Custody and signer controls</strong></li><li><span>03</span><strong>Gift acceptance and screening</strong></li><li><span>04</span><strong>Accounting and receipts</strong></li><li><span>05</span><strong>Public addresses and reporting</strong></li></ol><TextLink href="/governance">See the stewardship model</TextLink></section>
    </ArticleLayout>
  </main>
}
