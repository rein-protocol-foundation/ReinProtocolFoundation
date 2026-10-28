-- Operational records are written only through the scoped machine API.
do $migration$
declare prefix text;
begin
  foreach prefix in array array['dev_', 'prod_'] loop
    execute format($ddl$
      create table public.%I (
        deployment_id uuid primary key,
        caller_id text not null,
        repository text not null,
        environment text not null check (environment = 'production'),
        revision text not null check (revision ~ '^[a-f0-9]{40}$'),
        previous_revision text not null check (previous_revision ~ '^[a-f0-9]{40}$'),
        deployed_at timestamptz not null,
        host text not null,
        pull_requests jsonb not null check (jsonb_typeof(pull_requests) = 'array'),
        commits jsonb not null check (jsonb_typeof(commits) = 'array'),
        slack_workspace_id text not null,
        slack_channel_id text not null,
        slack_ts text,
        notified_at timestamptz,
        payload_hash text not null,
        created_at timestamptz not null default now()
      )
    $ddl$, prefix || 'rein_deployments');
    execute format('alter table public.%I enable row level security', prefix || 'rein_deployments');
    execute format('revoke all on public.%I from anon, authenticated', prefix || 'rein_deployments');
    execute format('grant select, insert, update on public.%I to service_role', prefix || 'rein_deployments');
    execute format('create index on public.%I (deployed_at desc)', prefix || 'rein_deployments');
  end loop;
end
$migration$;
