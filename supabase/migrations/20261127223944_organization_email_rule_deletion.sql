begin;
alter table public.organization_email_mailboxes
  drop constraint organization_email_mailboxes_status_check,
  add constraint organization_email_mailboxes_status_check
    check (status in ('pending', 'active', 'error', 'deleting'));
grant delete on public.organization_email_mailboxes to service_role;
commit;
