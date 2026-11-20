'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { useFormStatus } from 'react-dom'
import Image from 'next/image'
import { COUNTRIES, US_STATES } from '@/lib/community/constants'
import type { ActionState } from '@/lib/community/types'

export function FieldError({ state, name }: { state: ActionState; name: string }) {
  const errors = state.fieldErrors?.[name]
  if (!errors?.length) return null
  return <span className="field-error" id={`${name}-error`}>{errors[0]}</span>
}

export function FormStatus({ state, successAction }: { state: ActionState; successAction?: ReactNode }) {
  const statusRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const dialogTitleId = useId()
  const dialogMessageId = useId()
  useEffect(() => {
    if (state.status === 'idle') return
    if (state.presentation === 'dialog') {
      const dialog = dialogRef.current
      if (!dialog || dialog.open) return
      if (typeof dialog.showModal === 'function') dialog.showModal()
      else dialog.setAttribute('open', '')
      return
    }
    statusRef.current?.focus()
  }, [state])
  if (state.status === 'idle') return null
  if (state.presentation === 'dialog') {
    const isSuccess = state.status === 'success'
    const dialogKicker = isSuccess ? (state.dialogKicker ?? 'Submission complete') : 'Submission interrupted'
    const dialogTitle = isSuccess ? (state.dialogTitle ?? 'Submission received.') : 'We couldn’t submit the form.'
    const closeDialog = () => {
      const dialog = dialogRef.current
      if (!dialog) return
      if (typeof dialog.close === 'function') dialog.close()
      else dialog.removeAttribute('open')
    }
    return (
      <dialog ref={dialogRef} className="submission-dialog" data-kind={state.status} aria-labelledby={dialogTitleId} aria-describedby={dialogMessageId}>
        {isSuccess ? (
          <div className="submission-dialog__success-layout">
            <figure className="submission-dialog__art" aria-hidden="true">
              <Image
                src="/images/submission-sf-distillation-zine.png"
                alt=""
                width={1619}
                height={971}
                sizes="(max-width: 767px) calc(100vw - 3rem), 24rem"
              />
            </figure>
            <div className="submission-dialog__content">
              <p className="article-kicker">{dialogKicker}</p>
              <h2 id={dialogTitleId}>{dialogTitle}</h2>
              <p id={dialogMessageId}>{state.message}</p>
              {successAction}
              <button className={successAction ? 'dialog-dismiss' : 'primary-action'} type="button" onClick={closeDialog}>Done</button>
            </div>
          </div>
        ) : (
          <>
            <p className="article-kicker">{dialogKicker}</p>
            <h2 id={dialogTitleId}>{dialogTitle}</h2>
            <p id={dialogMessageId}>{state.message}</p>
            <button className="primary-action" type="button" onClick={closeDialog}>Close and try again</button>
          </>
        )}
      </dialog>
    )
  }
  const errors = state.fieldErrors ? Object.values(state.fieldErrors).flat() : []
  return (
    <div ref={statusRef} className="form-status" data-kind={state.status} role={state.status === 'error' ? 'alert' : 'status'} aria-live="polite" tabIndex={-1}>
      <strong>{state.status === 'success' ? 'Submission received' : 'Please check the form'}</strong>
      {state.message ? <p>{state.message}</p> : null}
      {errors.length ? <ul>{errors.map((error, index) => <li key={`${error}-${index}`}>{error}</li>)}</ul> : null}
    </div>
  )
}

export function SubmitButton({ children, pending: pendingOverride }: { children: React.ReactNode; pending?: boolean }) {
  const { pending } = useFormStatus()
  const isPending = pendingOverride ?? pending
  return <button className="primary-action submit-button" type="submit" disabled={isPending} aria-disabled={isPending}>{isPending ? 'Submitting…' : children}</button>
}

export function LocationFields({ state }: { state: ActionState }) {
  const [scope, setScope] = useState<'united_states' | 'international'>('united_states')
  const regionLabelId = useId()
  const isInternational = scope === 'international'
  useEffect(() => {
    if (state.status === 'success') setScope('united_states')
  }, [state])
  return (
    <div className="field-group field-group--full location-group" role="group" aria-labelledby={regionLabelId}>
      <div className="location-header">
        <span className="field-label" id={regionLabelId}>Region</span>
        <button className="location-switch" type="button" role="switch" aria-checked={isInternational} onClick={() => setScope(isInternational ? 'united_states' : 'international')}>
          <span className="location-switch__track" aria-hidden="true"><span className="location-switch__thumb" /></span>
          <span>Outside the United States</span>
        </button>
      </div>
      <input type="hidden" name="location_scope" value={scope} />
      <div className="location-grid">
        {!isInternational ? (
          <label className="field-group"><span className="field-label">State <span aria-hidden="true">*</span></span><select name="us_state" autoComplete="address-level1" required defaultValue=""><option value="" disabled>Select a state</option>{US_STATES.map(([code, name]) => <option value={code} key={code}>{name}</option>)}</select><FieldError state={state} name="us_state" /></label>
        ) : (
          <label className="field-group"><span className="field-label">Country <span aria-hidden="true">*</span></span><select name="country" autoComplete="country-name" required defaultValue=""><option value="" disabled>Select a country</option>{COUNTRIES.map((country) => <option value={country} key={country}>{country}</option>)}</select><FieldError state={state} name="country" /></label>
        )}
        <label className="field-group"><span className="field-label">{isInternational ? 'City or region' : 'City'} <span aria-hidden="true">*</span></span><input type="text" name="city_region" maxLength={120} autoComplete="address-level2" required aria-describedby="city_region-error" /><FieldError state={state} name="city_region" /></label>
      </div>
      <FieldError state={state} name="location_scope" />
    </div>
  )
}
