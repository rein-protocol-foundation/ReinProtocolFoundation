// Prepare a reviewed, transactional catalog import; this script never connects
// to a database. Apply its output through an authorized SQL connection.
import { readFileSync } from 'node:fs'

const path = process.argv[2]
const environment = process.argv[3]
if (!path || !['dev', 'prod'].includes(environment)) {
  throw new Error('Usage: node scripts/prepare-learning-resource-import.mjs <catalog.json> <dev|prod>')
}
const catalog = JSON.parse(readFileSync(path, 'utf8'))
if (catalog.schema_version !== 1 || !/^\d{4}-\d{2}-\d{2}$/.test(catalog.curated_on) || !Array.isArray(catalog.resources) || !catalog.resources.length) {
  throw new Error('Expected a nonempty version 1 resource catalog.')
}

const slugs = new Set()
const urls = new Set()
const types = new Set(['Course', 'Article / Document', 'Tool / Reference', 'Video', 'Paper Discussion'])
for (const row of catalog.resources) {
  const meta = row.learning_metadata
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.slug) || slugs.has(row.slug)) throw new Error(`Invalid/duplicate slug: ${row.slug}`)
  if (urls.has(row.public_url) || new URL(row.public_url).protocol !== 'https:') throw new Error(`Invalid/duplicate URL: ${row.slug}`)
  if (!row.title || !row.summary || row.summary.length > 600 || !row.author_publisher || !types.has(row.resource_type)) throw new Error(`Invalid content: ${row.slug}`)
  if (meta?.schema_version !== 1 || meta.verification?.checked_on !== catalog.curated_on || !meta.verification.sources.length || meta.verification.primary_http_status !== 200) throw new Error(`Missing verification: ${row.slug}`)
  if (!['beginner', 'intermediate', 'advanced'].includes(meta.level) || !meta.audiences.length || !meta.goals.length || !meta.languages.length) throw new Error(`Missing recommendation fields: ${row.slug}`)
  if (meta.access?.materials_free !== true || meta.rights?.catalog_use !== 'official_link_and_original_summary_only') throw new Error(`Invalid access/rights policy: ${row.slug}`)
  if (meta.rights.open_license && !meta.rights.license_url) throw new Error(`Missing license evidence: ${row.slug}`)
  slugs.add(row.slug)
  urls.add(row.public_url)
}

const payload = JSON.stringify(catalog.resources)
const delimiter = '$rein_learning_catalog$'
if (payload.includes(delimiter)) throw new Error('Catalog contains the SQL payload delimiter.')
const table = `public.${environment}_resources`
const auditTable = `public.${environment}_admin_audit_log`
console.log(`begin;

create temporary table incoming_learning_resources on commit drop as
select * from jsonb_to_recordset(${delimiter}${payload}${delimiter}::jsonb) as r(
  slug text, title text, summary text, public_url text, resource_type text,
  language text, difficulty text, topics text[], author_publisher text,
  access_notes text, featured boolean, sort_order integer, learning_metadata jsonb
);

-- Do not silently overwrite a different resource that happens to share a slug,
-- create a duplicate URL, or reactivate a resource archived by an administrator.
do $catalog_collisions$
begin
  if exists (
    select 1 from ${table} existing
    join incoming_learning_resources incoming
      on existing.slug = incoming.slug or existing.public_url_normalized = lower(trim(incoming.public_url))
    where existing.slug <> incoming.slug
       or existing.public_url_normalized <> lower(trim(incoming.public_url))
       or existing.publication_status = 'archived'
  ) then
    raise exception 'Catalog conflicts with an existing URL, slug, or archived resource';
  end if;
end;
$catalog_collisions$;

-- access_verified_by is an unconstrained verifier UUID, not an auth.users FK.
-- Identify this automated verification explicitly instead of impersonating an admin.
with verifier as materialized (select gen_random_uuid() as id), imported as (
  insert into ${table} (
    slug,title,summary,public_url,resource_type,language,difficulty,topics,
    author_publisher,access_notes,featured,sort_order,learning_metadata,
    publication_status,access_verified_at,access_verified_by,published_at
  )
  select r.slug,r.title,r.summary,r.public_url,r.resource_type,r.language,r.difficulty,r.topics,
    r.author_publisher,r.access_notes,r.featured,r.sort_order,r.learning_metadata,
    'published',now(),verifier.id,now()
  from incoming_learning_resources r cross join verifier
  where true
  on conflict (slug) do update set
    title=excluded.title,summary=excluded.summary,public_url=excluded.public_url,
    resource_type=excluded.resource_type,language=excluded.language,
    difficulty=excluded.difficulty,topics=excluded.topics,
    author_publisher=excluded.author_publisher,access_notes=excluded.access_notes,
    learning_metadata=excluded.learning_metadata,publication_status='published',
    access_verified_at=excluded.access_verified_at,access_verified_by=excluded.access_verified_by,
    published_at=coalesce(${environment}_resources.published_at,excluded.published_at),updated_at=now()
  returning id,slug,access_verified_by,learning_metadata
)
insert into ${auditTable}(actor_type,actor_id,action,entity_type,entity_id,details)
select 'agent','codex','resource.catalog_curated','resource',id,
  jsonb_build_object('slug',slug,'batch',learning_metadata->>'catalog_batch',
    'checked_on',learning_metadata->'verification'->>'checked_on',
    'verifier_id',access_verified_by,
    'authorization','User requested official free public AI Agent resources to be collected, organized, and added to the organization resource database.',
    'verification_method','Automated first-party source review by Codex; no human review claimed.',
    'rights_policy','Official links and original summaries; no source content redistribution.')
from imported;

select count(*) as catalog_resources,
  count(*) filter (where publication_status='published') as published,
  count(*) filter (where learning_metadata->'verification'->>'checked_on' = '${catalog.curated_on}') as verified
from ${table}
where slug in (select slug from incoming_learning_resources);

commit;`)
