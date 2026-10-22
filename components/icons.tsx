export function FoundationMark({ variant = 'header' }: { variant?: 'header' | 'footer' }) {
  return (
    <img
      className={`foundation-mark foundation-mark--${variant}`}
      src={`/brand/rein-mark-${variant}.png`}
      width={42}
      height={42}
      alt=""
      aria-hidden="true"
    />
  )
}

export function Arrow() {
  return (
    <svg className="arrow" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M2 9h13M10 4l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

export function MailIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </svg>
}
