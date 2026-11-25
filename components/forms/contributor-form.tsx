'use client'

import Link from 'next/link'
import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from 'react'
import { submitContributorApplication } from '@/lib/community/actions'
import { CONTRIBUTION_AREAS, INDUSTRIES, PARTICIPATION_REASONS } from '@/lib/community/constants'
import { initialActionState } from '@/lib/community/types'
import { FieldError, FormStatus, LocationFields, SubmitButton } from '@/components/forms/form-controls'

export function ContributorForm() {
  const [state, action, pending] = useActionState(submitContributorApplication, initialActionState)
  const [otherReason, setOtherReason] = useState(false)
  const [otherContribution, setOtherContribution] = useState(false)
  const [industry, setIndustry] = useState('')
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.status !== 'success') return
    setIndustry('')
    setOtherReason(false)
    setOtherContribution(false)
    formRef.current?.reset()
  }, [state])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    startTransition(() => action(formData))
  }

  return (
    <form ref={formRef} className="community-form" action={action} onSubmit={handleSubmit} noValidate>
      <FormStatus state={state} />
      <fieldset className="form-content">
        <legend className="visually-hidden">Contributor application fields</legend>
      <div className="field-grid">
        <label className="field-group"><span className="field-label">Name <span aria-hidden="true">*</span></span><input type="text" name="name" autoComplete="name" maxLength={120} required /><FieldError state={state} name="name" /></label>
        <label className="field-group"><span className="field-label">Email <span aria-hidden="true">*</span></span><input type="email" name="email" autoComplete="email" maxLength={320} required /><FieldError state={state} name="email" /></label>
        <LocationFields state={state} />
        <label className="field-group field-group--full"><span className="field-label">Field or industry <span className="required-note">Optional</span></span><select name="industry" defaultValue="" onChange={(event) => setIndustry(event.target.value)}><option value="">Prefer not to say</option>{INDUSTRIES.map((option) => <option key={option}>{option}</option>)}</select><FieldError state={state} name="industry" /></label>
        {industry === 'Other' ? <label className="field-group field-group--full"><span className="field-label">Your field or industry <span aria-hidden="true">*</span></span><input name="industry_other" type="text" maxLength={120} required /><FieldError state={state} name="industry_other" /></label> : null}
      </div>

      <fieldset><legend>Why do you want to participate? <span aria-hidden="true">*</span></legend><div className="choice-list choice-list--columns">{PARTICIPATION_REASONS.map((option) => <label className="choice" key={option}><input type="checkbox" name="participation_reasons" value={option} onChange={option === 'Other' ? (event) => setOtherReason(event.target.checked) : undefined} /><span>{option}</span></label>)}</div><FieldError state={state} name="participation_reasons" />{otherReason ? <label className="field-group" style={{ marginTop: '1rem' }}><span className="field-label">Other reason</span><textarea name="participation_reason_other" maxLength={500} required /><FieldError state={state} name="participation_reason_other" /></label> : null}</fieldset>

      <fieldset><legend>What would you like to contribute? <span aria-hidden="true">*</span></legend><div className="choice-list choice-list--columns">{CONTRIBUTION_AREAS.map((option) => <label className="choice" key={option}><input type="checkbox" name="contribution_areas" value={option} onChange={option === 'Other' ? (event) => setOtherContribution(event.target.checked) : undefined} /><span>{option}</span></label>)}</div><FieldError state={state} name="contribution_areas" />{otherContribution ? <label className="field-group" style={{ marginTop: '1rem' }}><span className="field-label">Other contribution</span><textarea name="contribution_area_other" maxLength={500} required /><FieldError state={state} name="contribution_area_other" /></label> : null}</fieldset>

      <fieldset><legend>Professional links <span className="required-note">Optional</span></legend><p className="field-hint">Optional links help us understand your background.</p><div className="field-grid">
        <label><span className="field-label">Personal website</span><input type="url" name="personal_website" placeholder="https://" inputMode="url" maxLength={2048} /><FieldError state={state} name="personal_website" /></label>
        <label><span className="field-label">GitHub</span><input type="url" name="github_url" placeholder="https://github.com/…" inputMode="url" maxLength={2048} /><FieldError state={state} name="github_url" /></label>
        <label><span className="field-label">Google Scholar</span><input type="url" name="scholar_url" placeholder="https://scholar.google.com/…" inputMode="url" maxLength={2048} /><FieldError state={state} name="scholar_url" /></label>
        <label><span className="field-label">LinkedIn</span><input type="url" name="linkedin_url" placeholder="https://www.linkedin.com/…" inputMode="url" maxLength={2048} /><FieldError state={state} name="linkedin_url" /></label>
      </div></fieldset>

      <fieldset><legend>Would you be willing to publish a profile in the future? <span className="required-note">Optional</span></legend><div className="choice-list"><label className="choice"><input type="radio" name="profile_willingness" value="yes_if_invited" /><span>Yes, if invited</span></label><label className="choice"><input type="radio" name="profile_willingness" value="not_now" /><span>Not at this time</span></label><label className="choice"><input type="radio" name="profile_willingness" value="discuss_later" /><span>Prefer to discuss later</span></label></div><p className="field-hint">We will ask for separate consent before publishing a profile.</p></fieldset>

      <fieldset><legend>Agreements <span aria-hidden="true">*</span></legend><div className="choice-list"><label className="choice"><input type="checkbox" name="conduct_consent" required /><span>I agree to the <Link href="/community/code-of-conduct" target="_blank">Code of Conduct</Link>.</span></label><label className="choice"><input type="checkbox" name="privacy_consent" required /><span>I have read the <Link href="/privacy" target="_blank">Privacy Policy</Link> and consent to application processing.</span></label></div><FieldError state={state} name="conduct_consent" /><FieldError state={state} name="privacy_consent" /></fieldset>
      <p className="field-hint">Submitting this form does not create legal membership or employment. We will email a verification link valid for 24 hours.</p>
      <div className="form-actions"><SubmitButton pending={pending}>Submit Contributor application</SubmitButton></div>
      </fieldset>
    </form>
  )
}
