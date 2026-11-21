begin;

alter table public.dev_community_participants
  alter column industry drop not null;

alter table public.prod_community_participants
  alter column industry drop not null;

commit;
