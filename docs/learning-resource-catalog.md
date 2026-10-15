# Learning resource catalog

The organization curates first-party, freely accessible learning resources. The initial Agent collection was checked on **2026-10-15** and contains 16 resources: 15 additions and an enrichment of the previously published Hugging Face Agents Course. Production is the live catalog; development receives the same schema, without automatically copying production content.

The reviewed source dataset is [ai-agents-2026-10-15.json](../data/learning-resources/ai-agents-2026-10-15.json). Anonymous link checks are recorded in [the verification manifest](../data/learning-resources/ai-agents-2026-10-15-verification.json). The [Chinese research report](research/ai-agent-learning-resources-2026-10-15.md) provides a readable resource map.

## Inclusion and rights

- Use an official university, instructor-endorsed course site, provider academy, documentation site, or official source repository. Institution reputation is a quality signal; the catalog makes no universal “top five” ranking claim.
- Verify that the learning material or public enrollment is free. Record account requirements, incomplete releases, restricted videos, and separate API, subscription, training, or cloud costs.
- Store official links, bibliographic facts, original summaries, and recommendation metadata. The catalog does not mirror source PDFs, course text, slides, images, or recordings.
- Free public access does **not** establish an open redistribution license. An unverified license is `null`, not “public domain.” A repository license applies only within its actual scope; externally linked videos and third-party assets need separate checks.
- MIT was verified for Microsoft's repository and Apache-2.0 for the two Hugging Face course repositories. Attribution and other license conditions still apply to any future reuse.
- Verify multilingual support against real language content. Directory presence does not establish translation completeness. The MCP course's Vietnamese translation is linked as repository source because the hosted introduction returned 404.

## Storage contract

Existing resource fields retain the public title, English original summary, official URL, resource type, language label, difficulty, topics, publisher, and access notes. Both `dev_resources` and `prod_resources` also have a non-null `learning_metadata jsonb` object. Existing rows default to `{}` and remain usable; recommenders should treat missing metadata as unknown, not as proof of eligibility.

Schema version 1 uses these fields:

| Field | Meaning |
| --- | --- |
| `schema_version`, `catalog_batch` | Metadata version and dated curation batch. |
| `summary_zh_CN` | Original Chinese summary, not a source translation. |
| `provider_kind`, `course_code`, `term` | Provider provenance and optional academic identity. |
| `level`, `beginner_suitable` | Curator classification. Beginner suitability refers to the **Agent topic**, after prerequisites; it does not mean zero programming experience. |
| `audiences`, `goals`, `prerequisites` | Stable lowercase tags for filtering. Tags are guidance; `prerequisite_notes` identifies explicit provider requirements. |
| `coding_requirement` | `none`, `optional`, or `required_for_exercises`. Reading an article and implementing its ideas can have different requirements. |
| `formats`, `languages` | Verified material formats and language-specific URLs. A language may specify `delivery: "repository"`. |
| `duration_minutes` | `{min,max}` only where the provider gives a duration; otherwise `null`. `duration_basis` states the evidence and limits. |
| `access` | Free material status, registration, public-material scope, and separate practice costs. |
| `rights` | Catalog use, explicit verified license or `null`, scope, evidence URL, and reuse limits. |
| `availability` | `available`, `in_progress`, or `beta`, plus specific limitations. |
| `quality` | Factual basis for inclusion, with no fabricated scores or rankings. |
| `verification` | Check date, method, official evidence URLs, and anonymous HTTP results. HTTP 200 does not prove unrestricted lesson access, enrollment, or successful execution of exercises. |
| `recommendation` | Fit notes and related resource slugs. |

Scope values currently include `self_paced_course`, `learning_track`, `article`, `public_learning_materials`, `public_course_materials`, and `public_slides_and_assignments`. Microsoft's AI Agents for Beginners uses `public_learning_materials` for its public repository lessons and code samples. Stanford CS329Z is deliberately an `Article / Document` entry for public materials; its Canvas-only recordings are not described as an open video course.

The existing public reader selects a subset of resource columns. A future recommender must explicitly select `learning_metadata` from the database or its own authorized data layer. No recommendation service is implemented by this catalog change.

## Recommendation examples

First filter published resources and access eligibility, then match language, prerequisites, goal, and preferred format. Use reputation as supporting evidence, not as a substitute for learner fit. CMU 11-768 requires prior neural language model training experience; introductory provider resources are a better first step for most new learners.

For a non-programmer learning to delegate work:

```sql
select slug, title, public_url, learning_metadata
from public.prod_resources
where publication_status = 'published'
  and learning_metadata @> '{"beginner_suitable":true,"coding_requirement":"none","audiences":["nontechnical_professional"]}'::jsonb;
```

For a Chinese-speaking developer:

```sql
select slug, title, public_url,
       learning_metadata->'languages' as language_links,
       learning_metadata->'access' as access
from public.prod_resources
where publication_status = 'published'
  and learning_metadata @> '{"audiences":["developer"],"languages":[{"code":"zh-CN"}]}'::jsonb;
```

For someone already training models who wants Agent research:

```sql
select slug, title, public_url,
       learning_metadata->'prerequisites' as prerequisites,
       learning_metadata->'availability' as availability
from public.prod_resources
where publication_status = 'published'
  and learning_metadata @> '{"level":"advanced","audiences":["researcher"]}'::jsonb;
```

For an API-backed data layer, use the same containment filter:

```js
const { data, error } = await client.from('prod_resources')
  .select('slug,title,public_url,learning_metadata')
  .eq('publication_status', 'published')
  .contains('learning_metadata', { audiences: ['developer'], goals: ['evaluate_agents'] })
```

An application client already wrapped by `scopeDatabaseClient` uses `from('resources')` instead. Published resources and their public metadata use the existing RLS policies. Never put secret keys, private account data, or private learner profiles in this metadata.

For a zero-budget learner, distinguish free reading/watching from executing billable exercises. Do not infer a free subscription, certificate, institution credit, API credit, or cloud entitlement from the course being free. Recheck access and release status before recommending evolving semester courses or current product workflows; a stored verification date is historical evidence.

## Applying a reviewed dataset

The schema migration is [20261015094954_resource_learning_metadata.sql](../supabase/migrations/20261015094954_resource_learning_metadata.sql), matching the production migration version. It adds the same object-checked column to both environments without changing existing RLS or publication checks.

The preparation script validates a dataset and prints SQL; it has no network or database credentials and performs no write itself:

```sh
node scripts/prepare-learning-resource-import.mjs data/learning-resources/ai-agents-2026-10-15.json prod > /tmp/rein-learning-import.sql
```

Apply the generated SQL through an authorized database connection. It upserts by slug inside a transaction and writes an agent audit entry for every imported resource. It rejects conflicting URLs/slugs and archived entries. Existing editorial ordering and featured flags are preserved on updates. Reapplying does not create duplicate resources, but intentionally records a new verification and audit event.

`access_verified_by` is currently a verifier UUID without an `auth.users` foreign key. The import generates an automated verifier UUID and records it as such in the audit details; it does not attribute automated verification to a human administrator. The original website publication constraint continues to require verification before publication.
