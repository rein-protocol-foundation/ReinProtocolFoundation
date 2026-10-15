-- Recommendation and provenance data for curated, publicly accessible resources.
-- Keep both environments identical; existing publication and RLS rules apply.
begin;

alter table public.dev_resources
  add column learning_metadata jsonb not null default '{}'::jsonb,
  add constraint dev_resources_learning_metadata_object
    check (jsonb_typeof(learning_metadata) = 'object');

alter table public.prod_resources
  add column learning_metadata jsonb not null default '{}'::jsonb,
  add constraint prod_resources_learning_metadata_object
    check (jsonb_typeof(learning_metadata) = 'object');

comment on column public.dev_resources.learning_metadata is
  'Versioned learning recommendations, access costs, rights provenance, and dated official-source verification. See docs/learning-resource-catalog.md.';
comment on column public.prod_resources.learning_metadata is
  'Versioned learning recommendations, access costs, rights provenance, and dated official-source verification. See docs/learning-resource-catalog.md.';

commit;
