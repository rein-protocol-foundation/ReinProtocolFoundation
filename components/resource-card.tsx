import type { PublicResource } from '@/lib/community/types'

export function ResourceCard({ resource, headingLevel = 3, language }: { resource: PublicResource; headingLevel?: 3 | 4; language?: string }) {
  const Heading = headingLevel === 4 ? 'h4' : 'h3'

  const edition = Array.isArray(resource.languages) && resource.languages.find(item => item?.code === language && /^https?:\/\//i.test(item.url))
  return (
    <article className="resource-card">
      <span className="resource-card__meta">
        {resource.resource_type} · {resource.language}{resource.difficulty ? ` · ${resource.difficulty}` : ''}
      </span>
      <Heading><a href={edition ? edition.url : resource.public_url}>{resource.title}</a></Heading>
      {resource.background && <p><strong>Background:</strong> {resource.background}</p>}
      <p className="resource-card__summary">{resource.summary}</p>
    </article>
  )
}
