import Link from 'next/link'
import { FoundationMark } from '@/components/icons'
import { FooterNote } from '@/components/footer-note'
import { foundationStatus } from '@/lib/foundation-status'

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-main page-shell">
        <div className="footer-identity">
          <div className="footer-brand">
            <Link href="/" className="wordmark wordmark--footer" aria-label="Rein Protocol Foundation home">
              <FoundationMark variant="footer" />
              <span>Rein Protocol<small>Foundation</small></span>
            </Link>
            <FooterNote label="Our name">
              <strong>Rein</strong> — guidance for AI agents.<br />
              <strong>Protocol</strong> — explicit rules for AI-native operations.<br />
              <strong>Foundation</strong> — resources in service of the public good.
            </FooterNote>
          </div>
          <p className="footer-thesis">Advancing AI agent safety through research,<br className="footer-line-break" /> researcher support, and public participation.</p>
        </div>
        <div className="footer-connect">
          <nav aria-label="Footer navigation">
            <Link href="/mission">Mission</Link>
            <Link href="/programs">Programs</Link>
            <Link href="/governance">Governance</Link>
            <Link href="/community">Community</Link>
            <Link href="/giving">Giving</Link>
          </nav>
          <a className="footer-contact" href={`mailto:${foundationStatus.contactEmail}`}>{foundationStatus.contactEmail}<span aria-hidden="true"> ↗</span></a>
        </div>
      </div>
      <div className="footer-bottom page-shell">
        <div className="footer-copyright">
          <span>© 2026 Rein Protocol Foundation</span>
          <FooterNote label="Wyoming nonprofit">
            Incorporated in Oct 2026 in the State of Wyoming. IRS Employer Identification Number (EIN) obtained.
          </FooterNote>
        </div>
        <div className="footer-policies">
          <Link href="/privacy">Privacy</Link>
          <Link href="/community/code-of-conduct">Code of Conduct</Link>
          <FooterNote label="Image credits" interactive align="end">
            <span className="footer-credits-intro">Paper-collage interpretations of these sources, not documentary photographs.</span>
            <a href="https://commons.wikimedia.org/wiki/File:Golden_Gate_Bridge,_SF.jpg" target="_blank" rel="noreferrer">Golden Gate Bridge — Bernard Gagnon</a>
            <a href="https://commons.wikimedia.org/wiki/File:Mission_Santa_Clara.jpg" target="_blank" rel="noreferrer">Mission Santa Clara — JaGa</a>
            <a href="https://commons.wikimedia.org/wiki/File:Hoover_Tower_west_face.JPG" target="_blank" rel="noreferrer">Hoover Tower — © BrokenSphere, CC BY-SA</a>
            <a href="https://commons.wikimedia.org/wiki/File:Palo_Alto_Baylands_January_2013_001.jpg" target="_blank" rel="noreferrer">Palo Alto Baylands — King of Hearts, CC BY-SA 3.0</a>
            <a href="https://commons.wikimedia.org/wiki/File:Griffith_Observatory.jpg" target="_blank" rel="noreferrer">Griffith Observatory — Serouj, public domain</a>
            <span>Community convergence — original source-derived illustration</span>
          </FooterNote>
        </div>
      </div>
    </footer>
  )
}
