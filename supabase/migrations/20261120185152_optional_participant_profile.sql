begin;

alter table public.dev_community_participants
  alter column industry drop not null,
  alter column location_scope drop not null,
  alter column country drop not null,
  alter column city_region drop not null;

alter table public.prod_community_participants
  alter column industry drop not null,
  alter column location_scope drop not null,
  alter column country drop not null,
  alter column city_region drop not null;

commit;
