'use client'

import { useEffect, useState } from 'react'
import { useAdminI18n } from './admin-i18n'
import { emailErrors, organizationDomain, type Mailbox } from '@/lib/organization-email/contracts'
import type { RoutingRule } from '@/lib/organization-email/cloudflare'

type Snapshot = { mailboxes: Mailbox[]; rules: RoutingRule[] }
function forwardingRecords(snapshot: Snapshot) {
  const records = new Map<string, { address: string; mailbox?: Mailbox; rules: RoutingRule[] }>()
  for (const mailbox of snapshot.mailboxes) {
    records.set(mailbox.address, { address: mailbox.address, mailbox, rules: [] })
  }
  for (const rule of snapshot.rules) {
    for (const matcher of rule.matchers) {
      if (matcher.type !== 'literal' || matcher.field !== 'to' || !matcher.value) continue
      const address = matcher.value.toLowerCase()
      const record = records.get(address) ?? { address, rules: [] as RoutingRule[] }
      if (!record.rules.includes(rule)) record.rules.push(rule)
      records.set(address, record)
    }
  }
  return Array.from(records.values()).sort((a, b) => a.address.localeCompare(b.address))
}

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
      setNotice(data.mailbox.status === 'active' ? 'Email forwarding is active.' : 'Forwarding will activate automatically after verification.')
      await load()
    } catch (e) { setError(e instanceof Error ? e.message : emailErrors.provider_error) }
    finally { setBusy(false) }
  }
  const records = snapshot ? forwardingRecords(snapshot) : []
  const isPending = (record: typeof records[number]) => record.mailbox?.status === 'pending' && !record.rules.length
  const pending = records.filter(isPending)
  const other = records.filter(record => !isPending(record))

  function renderRecord({ address, mailbox, rules }: typeof records[number]) {
    const rule = rules[0]
    const matches = rules.length === 1 && rule.matchers.length === 1 && rule.actions.length === 1 &&
      rule.actions[0].type === 'forward' && rule.actions[0].value?.length === 1 &&
      rule.actions[0].value[0].toLowerCase() === mailbox?.destination
    const needsAttention = mailbox && (rules.length ? !matches || !rule.enabled : mailbox.status !== 'pending')
    return <article key={address} className="admin-record" style={{ padding: '1rem', overflowWrap: 'anywhere' }}>
      <h4>{address}</h4>
      {rules.map(rule => <div key={rule.id}>
        <p>{rule.actions.map(action => action.type === 'forward' ? '→ ' + action.value?.join(', ') : [action.type, ...(action.value ?? [])].join(' ')).join(' · ')}</p>
        <span className="status-badge">{t(rule.enabled ? 'Enabled' : 'Disabled')}</span>
      </div>)}
      {mailbox && !matches && <p>{rules.length > 0 && t('Requested destination') + ' '}→ {mailbox.destination}</p>}
      {mailbox && !rules.length && !needsAttention && <span className="status-badge">{t('Awaiting verification')}</span>}
      {needsAttention && <>
        <span className="status-badge">{t('Needs attention')}</span>
        {mailbox.last_error && <p>{t(emailErrors[mailbox.last_error] ?? emailErrors.provider_error)}</p>}
        <p><button className="admin-button admin-button--quiet" type="button" disabled={busy} onClick={() => void submit(address.split('@')[0], mailbox.destination)}>{t('Retry activation')}</button></p>
      </>}
    </article>
  }

  return <>
    <aside className="admin-note">{t('Stage and production manage the same live organization email addresses. This creates inbound forwarding, not a separate inbox or outbound email account.')}</aside>
    <section className="admin-panel" style={{ marginBlock: '1.5rem' }}>
      <h2>{t('Create organization email')}</h2>
      <form className="admin-form admin-form--grid" onSubmit={event => { event.preventDefault(); void submit(localPart, destination) }}>
        <label>{t('Mailbox name')}<input name="localPart" value={localPart} onChange={event => setLocalPart(event.target.value)} required maxLength={64} pattern="[a-zA-Z0-9]+([._\-][a-zA-Z0-9]+)*" placeholder="tom.wang" disabled={busy} /><small>@{organizationDomain}</small></label>
        <label>{t('Destination email')}<input name="destination" value={destination} onChange={event => setDestination(event.target.value)} type="email" required maxLength={254} placeholder="name@example.org" disabled={busy} /></label>
        <p className="admin-note admin-field--wide">{t('Cloudflare sends a verification link to each new destination. Forwarding activates after verification. Previously verified destinations activate immediately.')}</p>
        <button className="admin-button" disabled={busy} type="submit">{t(busy ? 'Processing…' : 'Create forwarding address')}</button>
      </form>
    </section>
    {error && <p role="alert" className="admin-note">{t(error)}</p>}
    {notice && <p role="status" className="admin-note">{t(notice)}</p>}
    <div className="admin-toolbar"><h2>{t('Email forwarding records')}</h2><button type="button" className="admin-button admin-button--quiet" disabled={busy} onClick={() => void refresh()}>{t('Refresh')}</button></div>
    {!snapshot && !error && <p role="status">{t('Loading…')}</p>}
    {snapshot && <>
      <section aria-label={t('Awaiting verification')}>
        <h3>{t('Awaiting verification')} ({pending.length})</h3>
        <div className="admin-record-list">{pending.map(renderRecord)}</div>
        {!pending.length && <p>{t('No addresses awaiting verification.')}</p>}
      </section>
      {other.length > 0 && <section aria-label={t('Other forwarding records')}>
        <h3>{t('Other forwarding records')}</h3>
        <div className="admin-record-list">{other.map(renderRecord)}</div>
      </section>}
    </>}
  </>
}
