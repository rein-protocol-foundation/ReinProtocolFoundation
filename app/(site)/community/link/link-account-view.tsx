import Link from 'next/link'
import { LinkRequestForm } from './link-forms'

export function LinkAccountView({ session, status }: { session?: string; status?: string }) {
  if (!session) {
    return <main id="main-content" className="community-shell"><div className="page-shell form-page"><section className="empty-state"><p className="eyebrow">Community / Link account</p><h1>This link is not valid.</h1><div className="empty-state__copy"><p>The link may be incomplete or expired. Ask the Rein Agent in your chat platform for a new one.</p></div><div className="empty-state__actions"><Link href="/community" className="primary-action">Return to Community</Link></div></section></div></main>
  }

  if (status === 'sent') {
    return <main id="main-content" className="community-shell"><div className="page-shell form-page"><section className="empty-state"><p className="eyebrow">Community / Link account</p><h1>Check your email.</h1><div className="empty-state__copy"><p>If that address is registered with Rein Protocol, a binding code is on its way. Send the code from the email to Nori in your original Discord or Slack chat.</p></div><div className="empty-state__actions"><Link href="/community" className="primary-action">Return to Community</Link></div></section></div></main>
  }

  return <main id="main-content" className="community-shell"><div className="page-shell form-page"><div className="form-layout"><aside className="form-intro"><p className="eyebrow">Community / Link account</p><h1>Link your account.</h1><p className="form-intro__lead">Enter the email address already registered with Rein Protocol. We will email you a one-time binding code. Send it to Nori in your original Discord or Slack chat to finish linking.</p></aside><LinkRequestForm session={session} /></div></div></main>
}
