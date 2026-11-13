'use client'

import { useEffect, useState } from 'react'
import { useAdminI18n } from './admin-i18n'
import { emailErrors, organizationDomain, type Mailbox } from '@/lib/organization-email/contracts'
import type { RoutingRule } from '@/lib/organization-email/cloudflare'

type Snapshot = { mailboxes: Mailbox[]; rules: RoutingRule[] }
export function AdminOrganizationEmail() {
  const { t } = useAdminI18n()
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [localPart, setLocalPart] = useState('')
  const [destination, setDestination] = useState('')

  async function load() {
    const response = await fetch('/api/admin/organization-email', { cache: 'no-store' })
    if (!response.ok || response.redirected) throw new Error('Could not load organization email. Check configuration and sign in again if needed.')
    setSnapshot(await response.json())
  }
  useEffect(() => { void load().catch(e => setError(e.message)) }, [])
  async function refresh() {
    setBusy(true); setError('')
    try { await load() } catch (e) { setError(e instanceof Error ? e.message : emailErrors.provider_error) }
    finally { setBusy(false) }
  }
  async function submit(name: string, target: string) {
    setBusy(true); setError(''); setNotice('')
    try {
      const response = await fetch('/api/admin/organization-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ localPart: name, destination: target }),
      })
      if (response.redirected) throw new Error('Please sign in again.')
      const data = await response.json()
      if (!response.ok) throw new Error(emailErrors[data.error] ?? emailErrors.provider_error)
      setNotice(data.mailbox.status === 'active' ? 'Email forwarding is active.' : 'Waiting for the recipient to verify their email. Then choose Check and activate.')
      await load()
    } catch (e) { setError(e instanceof Error ? e.message : emailErrors.provider_error) }
    finally { setBusy(false) }
  }
  return <>
    <aside className="admin-note">{t('Stage and production manage the same live organization email addresses. This creates inbound forwarding, not a separate inbox or outbound email account.')}</aside>
    <section className="admin-panel" style={{ marginBlock: '1.5rem' }}>
      <h2>{t('Create organization email')}</h2>
      <form className="admin-form admin-form--grid" onSubmit={event => { event.preventDefault(); void submit(localPart, destination) }}>
        <label>{t('Mailbox name')}<input name="localPart" value={localPart} onChange={event => setLocalPart(event.target.value)} required maxLength={64} pattern="[a-zA-Z0-9]+([._\-][a-zA-Z0-9]+)*" placeholder="zexin.li" disabled={busy} /><small>@{organizationDomain}</small></label>
        <label>{t('Destination email')}<input name="destination" value={destination} onChange={event => setDestination(event.target.value)} type="email" required maxLength={254} placeholder="name@example.org" disabled={busy} /></label>
        <p className="admin-note admin-field--wide">{t('New destinations receive a Cloudflare verification email. After the recipient verifies, choose Check and activate. Existing mappings to other recipients will not be overwritten.')}</p>
        <button className="admin-button" disabled={busy} type="submit">{t(busy ? 'Processing…' : 'Create forwarding address')}</button>
      </form>
    </section>
    {error && <p role="alert" className="admin-note">{t(error)}</p>}
    {notice && <p role="status" className="admin-note">{t(notice)}</p>}
    <div className="admin-toolbar"><h2>{t('Mailbox requests')}</h2><button type="button" className="admin-button admin-button--quiet" disabled={busy} onClick={() => void refresh()}>{t('Refresh')}</button></div>
    {!snapshot && !error && <p role="status">{t('Loading…')}</p>}
    {snapshot && <>
      <div className="admin-record-list">
        {snapshot.mailboxes.map(mailbox => <article key={mailbox.address} className="admin-record" style={{ padding: '1rem' }}>
          <h3 style={{ overflowWrap: 'anywhere' }}>{mailbox.address}</h3>
          <p style={{ overflowWrap: 'anywhere' }}>→ {mailbox.destination}</p>
          <span className="status-badge">{t(mailbox.status === 'active' ? 'Active' : mailbox.status === 'pending' ? 'Awaiting verification' : 'Needs attention')}</span>
          {mailbox.last_error && <p>{t(emailErrors[mailbox.last_error] ?? emailErrors.provider_error)}</p>}
          <p><button className="admin-button admin-button--quiet" type="button" disabled={busy} onClick={() => void submit(mailbox.address.split('@')[0], mailbox.destination)}>{t('Check and activate')}</button></p>
        </article>)}
        {!snapshot.mailboxes.length && <p>{t('No mailbox requests yet.')}</p>}
      </div>
      <h2>{t('Cloudflare routing rules')}</h2>
      <p className="admin-note">{t('Live rules include addresses created outside this dashboard. Refresh to reload them.')}</p>
      <div className="admin-record-list">{snapshot.rules.filter(rule => rule.matchers.some(m => m.type === 'literal' && m.field === 'to')).map(rule => <article className="admin-record" style={{ padding: '1rem', overflowWrap: 'anywhere' }} key={rule.id}>
        <strong>{rule.matchers.find(m => m.field === 'to')?.value}</strong>
        <p>{rule.actions.map(action => `${action.type}: ${action.value?.join(', ') ?? '—'}`).join('; ')}</p>
        <span className="status-badge">{t(rule.enabled ? 'Enabled' : 'Disabled')}</span>
      </article>)}</div>
    </>}
  </>
}
