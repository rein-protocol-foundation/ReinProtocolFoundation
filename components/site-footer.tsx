import Link from 'next/link'
import { FoundationMark } from '@/components/icons'
import { foundationStatus } from '@/lib/foundation-status'

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-main page-shell">
        <details className="foundation-name-note">
          <summary className="wordmark wordmark--footer" aria-label="Why we are called Rein Protocol Foundation">
            <FoundationMark variant="footer" />
            <span>Rein Protocol<sup aria-hidden="true">*</sup><small>Foundation</small></span>
          </summary>
          <div className="foundation-name-note__body">
            <p><strong>Rein</strong> means the reins used to guide and control. It points to our research into agent harnesses: the structures that guide AI agents and define how they act.</p>
            <p><strong>Protocol</strong> expresses our ambition to operate through explicit, executable rules. We pursue AI-native automation, with AI agents handling day-to-day administration, member onboarding, community growth and maintenance. Our long-term aim is autonomous operation: moving organizational processes onto a public blockchain, where smart contracts sustain automation and agents interact with them to carry out authorized treasury activities.</p>
            <p><strong>Foundation</strong> describes our purpose: raising funds and putting them to work in service of our mission.</p>
          </div>
        </details>
        <p className="footer-thesis">An AI-native community for agent safety.</p>
        <nav aria-label="Footer navigation">
          <Link href="/">Home</Link>
          <Link href="/mission">Mission</Link>
          <Link href="/programs">Programs</Link>
          <Link href="/governance">Governance</Link>
          <Link href="/community">Community</Link>
          <Link href="/giving">Giving</Link>
        </nav>
      </div>
      <div className="footer-legal page-shell">
        <p>{foundationStatus.formation} EIN obtained. <Link href="/giving#foundation-status">Foundation status</Link></p>
        <p><a href={`mailto:${foundationStatus.contactEmail}`}>{foundationStatus.contactEmail}</a></p>
        <p><Link href="/privacy">Privacy</Link> · <Link href="/community/code-of-conduct">Code of Conduct</Link></p>
        <p>© 2026 Rein Protocol Foundation</p>
      </div>
      <details className="image-credits page-shell">
        <summary>Image sources and notes</summary>
        <p>Atmospheric artworks are source-preserving paper-collage interpretations, not documentary photographs.</p>
        <ul>
          <li><a href="https://commons.wikimedia.org/wiki/File:Golden_Gate_Bridge,_SF.jpg" target="_blank" rel="noreferrer">Golden Gate Bridge — Bernard Gagnon</a></li>
          <li><a href="https://commons.wikimedia.org/wiki/File:Mission_Santa_Clara.jpg" target="_blank" rel="noreferrer">Mission Santa Clara — JaGa</a></li>
          <li><a href="https://commons.wikimedia.org/wiki/File:Hoover_Tower_west_face.JPG" target="_blank" rel="noreferrer">Hoover Tower — © BrokenSphere, CC BY-SA</a></li>
          <li><a href="https://commons.wikimedia.org/wiki/File:Palo_Alto_Baylands_January_2013_001.jpg" target="_blank" rel="noreferrer">Palo Alto Baylands — King of Hearts, CC BY-SA 3.0</a></li>
          <li><a href="https://commons.wikimedia.org/wiki/File:Griffith_Observatory.jpg" target="_blank" rel="noreferrer">Griffith Observatory — Serouj, public domain</a></li>
          <li>Community convergence study — original source-derived illustration</li>
        </ul>
      </details>
    </footer>
  )
}
