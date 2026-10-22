'use client'

import { useEffect, useLayoutEffect, useId, useRef, useState, type ReactNode } from 'react'

/** Supplementary information without expanding the footer's layout. */
export function FooterNote({ label, children, interactive = false, align = 'start' }: {
  label: string
  children: ReactNode
  interactive?: boolean
  align?: 'start' | 'end'
}) {
  const id = useId()
  const root = useRef<HTMLSpanElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLSpanElement>(null)
  const [offset, setOffset] = useState(0)
  const pinned = useRef(false)
  const [open, setOpen] = useState(false)
  const close = () => { pinned.current = false; setOpen(false) }

  useLayoutEffect(() => {
    if (!open) return
    const position = () => {
      const anchor = root.current?.getBoundingClientRect()
      const width = panel.current?.getBoundingClientRect().width
      if (!anchor || !width) return
      const desired = align === 'end' ? anchor.right - width : anchor.left
      const left = Math.max(12, Math.min(desired, document.documentElement.clientWidth - width - 12))
      setOffset(left - anchor.left)
    }
    position()
    window.addEventListener('resize', position)
    return () => window.removeEventListener('resize', position)
  }, [open, align])

  useEffect(() => {
    if (!open) return
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) close()
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (root.current?.contains(document.activeElement)) trigger.current?.focus()
      close()
    }
    document.addEventListener('pointerdown', dismiss)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', dismiss)
      document.removeEventListener('keydown', escape)
    }
  }, [open])

  return <span ref={root} className={`footer-note footer-note--${align}`}
    onPointerEnter={event => { if (event.pointerType === 'mouse') setOpen(true) }}
    onPointerLeave={() => { if (!pinned.current && !root.current?.contains(document.activeElement)) setOpen(false) }}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) close() }}>
    <button ref={trigger} type="button" className="footer-note__trigger"
      aria-expanded={open} aria-controls={id}
      aria-describedby={!interactive && open ? id : undefined}
      aria-haspopup={interactive ? 'dialog' : undefined}
      onFocus={() => setOpen(true)}
      onClick={() => { if (pinned.current) close(); else { pinned.current = true; setOpen(true) } }}>
      {label}<span aria-hidden="true" className="footer-note__symbol">↗</span>
    </button>
    <span ref={panel} style={{ left: offset }} id={id} hidden={!open} role={interactive ? 'dialog' : 'tooltip'}
      aria-label={interactive ? label : undefined} className="footer-note__panel">
      {children}
    </span>
  </span>
}
