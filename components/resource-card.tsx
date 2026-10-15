import type { PublicResource } from '@/lib/community/types'

export function ResourceCard({ resource, headingLevel = 3 }: { resource: PublicResource; headingLevel?: 3 | 4 }) {
  const Heading = headingLevel === 4 ? 'h4' : 'h3'

  return (
    <article className="resource-card">
      <span className="resource-card__meta">
        {resource.resource_type} · {resource.language}{resource.difficulty ? ` · ${resource.difficulty}` : ''}
      </span>
      <Heading>{resource.title}</Heading>
      <p className="resource-card__summary">{resource.summary}</p>
      <a href={resource.public_url} target="_blank" rel="noreferrer">
        Open resource <span aria-hidden="true">↗</span>
      </a>
    </article>
  )
}
