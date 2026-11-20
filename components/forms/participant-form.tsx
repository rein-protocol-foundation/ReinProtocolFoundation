'use client'

import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from 'react'
import { DiscordInvitation } from '@/components/discord-invitation'
import Link from 'next/link'
import { registerParticipant } from '@/lib/community/actions'
import { COUNTRIES, INDUSTRIES, US_STATES } from '@/lib/community/constants'
import { initialActionState } from '@/lib/community/types'
import { FieldError, FormStatus, SubmitButton } from '@/components/forms/form-controls'

export function ParticipantForm() {
  const [state, action, pending] = useActionState(registerParticipant, initialActionState)
  const [industry, setIndustry] = useState('')
  const [localUpdates, setLocalUpdates] = useState(false)
  const [country, setCountry] = useState('')
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.status !== 'success') return
    setIndustry('')
    setCountry('')
    setLocalUpdates(false)
    formRef.current?.reset()
  }, [state])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    startTransition(() => action(formData))
  }

  return (
    <form ref={formRef} className="community-form community-form--participant" action={action} onSubmit={handleSubmit} noValidate>
      <FormStatus state={state} successAction={<DiscordInvitation />} />
      <fieldset className="form-content">
      <legend className="visually-hidden">Community registration fields</legend>
      <div className="field-grid">
        <label className="field-group"><span className="field-label">Email <span aria-hidden="true">*</span></span><input type="email" name="email" autoComplete="email" maxLength={320} required aria-describedby="email-error" /><FieldError state={state} name="email" /></label>
        <label className="field-group"><span className="field-label">Name <span className="required-note">Optional</span></span><input type="text" name="name" autoComplete="name" maxLength={120} aria-describedby="name-error" /><FieldError state={state} name="name" /></label>
        <label className="field-group field-group--full"><span className="field-label">Field or industry <span className="required-note">Optional</span></span><select name="industry" defaultValue="" onChange={(event) => setIndustry(event.target.value)}><option value="">Prefer not to say</option>{INDUSTRIES.map((option) => <option key={option}>{option}</option>)}</select><FieldError state={state} name="industry" /></label>
        {industry === 'Other' ? <label className="field-group field-group--full"><span className="field-label">Your field or industry <span aria-hidden="true">*</span></span><input name="industry_other" type="text" maxLength={120} required /><FieldError state={state} name="industry_other" /></label> : null}
        <label className="choice field-group--full">
          <input type="checkbox" checked={localUpdates} onChange={event => setLocalUpdates(event.target.checked)} />
          <span>Include updates about events near me</span>
        </label>
        {localUpdates && <>
          <label className="field-group"><span>Country or region</span>
            <select name="country" required value={country} autoComplete="country-name" onChange={event => setCountry(event.target.value)}>
              <option value="">Select a country or region</option>
              {[...COUNTRIES, 'United States'].sort().map(value => <option key={value}>{value}</option>)}
            </select><FieldError state={state} name="country" />
          </label>
          <input type="hidden" name="location_scope" value={country === 'United States' ? 'united_states' : 'international'} />
          {country === 'United States' && <label className="field-group"><span>State</span><select name="us_state" required defaultValue="">
            <option value="">Select a state</option>{US_STATES.map(([code, name]) => <option value={code} key={code}>{name}</option>)}
          </select><FieldError state={state} name="us_state" /></label>}
          <label className="field-group"><span>City (optional)</span><input name="city_region" maxLength={120} autoComplete="address-level2" /><FieldError state={state} name="city_region" /></label>
        </>}
      </div>
      <fieldset><legend>Consent</legend><div className="choice-list">
        <label className="choice"><input type="checkbox" name="communications_consent" required /><span>I agree to receive community and activity messages. I can unsubscribe at any time.</span></label>
        <label className="choice"><input type="checkbox" name="privacy_consent" required /><span>I have read the <Link href="/privacy" target="_blank">Privacy Policy</Link> and consent to this registration being processed.</span></label>
      </div><FieldError state={state} name="communications_consent" /><FieldError state={state} name="privacy_consent" /></fieldset>
      <div className="form-actions"><SubmitButton pending={pending}>Register for community updates</SubmitButton></div>
      </fieldset>
    </form>
  )
}
