-- Cloudflare addresses are global: stage and prod intentionally share reservations
-- and leases, rather than creating competing dev_/prod_ copies for one domain.
begin;
create table public.organization_email_mailboxes (
  address text primary key,
  destination text not null,
  status text not null default 'pending' check (status in ('pending', 'active', 'error')),
  rule_id text,
  last_error text,
  requested_by uuid not null,
  last_actor_id uuid not null,
  lock_token uuid,
  lock_until timestamptz not null default 'epoch',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (address = lower(address) and address ~ '^[a-z0-9]+([._-][a-z0-9]+)*@rein-protocol[.]org$'),
  check (destination = lower(destination) and destination not like '%@rein-protocol.org')
);
alter table public.organization_email_mailboxes enable row level security;
revoke all on public.organization_email_mailboxes from public, anon, authenticated;
grant select, insert, update on public.organization_email_mailboxes to service_role;
comment on table public.organization_email_mailboxes is 'Shared Cloudflare mailbox requests. Server-only; no public or authenticated Data API access.';
commit;
