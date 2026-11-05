-- Direct email codes: no website confirmation or repeated email input for new requests.
-- Legacy receipt challenges remain valid. All functions stay service-role-only.
begin;
do $email_binding$
declare
  prefix text;
  digest_schema text;
  complete_template text;
  issue_template text;
begin
  select n.nspname into digest_schema from pg_namespace n
   where n.nspname in ('public', 'extensions')
     and to_regprocedure(format('%I.digest(text,text)', n.nspname)) is not null
   order by (n.nspname = 'public') desc limit 1;
  if digest_schema is null then raise exception 'pgcrypto digest is required'; end if;
  issue_template := $template$
declare
  v_result record;
  v_expires_at timestamptz;
begin
  if p_code_hash is null or p_code_hash = '' or p_code_expires_at is null or p_code_expires_at <= clock_timestamp() then
    return query select false, 'binding_code_invalid', null::uuid; return;
  end if;
  -- Cap lifetime using the database clock without rejecting normal application clock skew.
  v_expires_at := least(p_code_expires_at, clock_timestamp() + interval '10 minutes');
  -- Existing issuer owns session locking, expiry, request limits and resend invalidation.
  select * into v_result from public.{p}rein_issue_link_email_challenge(
    p_session_token_hash, p_email, p_email_hash, p_email_masked, p_receipt_token_hash,
    p_code_hash, v_expires_at, p_ip_hash, p_max_per_session, p_max_per_ip);
  if v_result.ok then
    update public.{p}rein_link_email_challenges set delivery_method = 'email_code'
      where id = v_result.challenge_id;
    -- Index the digest for the existing completion API, without claiming mailbox verification.
    update public.{p}rein_link_sessions set binding_code_hash = p_code_hash,
      binding_code_expires_at = v_expires_at, binding_code_consumed_at = null, updated_at = now()
      where session_token_hash = p_session_token_hash;
  end if;
  return query select v_result.ok, v_result.reason, v_result.challenge_id;
end;
$template$;
  complete_template := $template$
declare
  v_session public.{p}rein_link_sessions%rowtype;
  v_existing public.{p}rein_platform_links%rowtype;
  v_other public.{p}rein_platform_links%rowtype;
  v_id uuid;
  v_challenge public.{p}rein_link_email_challenges%rowtype;
  v_matches integer;
  v_contact uuid;
begin
  if current_user in ('anon', 'authenticated') then
    raise exception 'link completion rejects the Data API role %', current_user using errcode = '42501';
  end if;

  if p_platform is null or p_workspace_id is null or p_platform_user_id is null then
    return query select false, 'binding_tuple_mismatch', null::uuid, null::text, null::text, null::text, null::uuid; return;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_platform || ':' || p_workspace_id || ':' || p_platform_user_id, 0));

  select * into v_session from public.{p}rein_link_sessions
   where session_token_hash = p_session_token_hash
   for update;
  if not found then
    return query select false, 'binding_not_found', null::uuid, null::text, null::text, null::text, null::uuid; return;
  end if;
  if v_session.state = 'completed' then
    return query select false, 'binding_already_completed', v_session.contact_id, v_session.platform,
      v_session.platform_workspace_id, v_session.platform_user_id, null::uuid; return;
  end if;
  -- Check the trusted sender BEFORE touching a pending email proof.
  if v_session.platform <> p_platform
     or v_session.platform_workspace_id <> p_workspace_id
     or v_session.platform_user_id <> p_platform_user_id then
    return query select false, 'binding_tuple_mismatch', null::uuid, v_session.platform,
      v_session.platform_workspace_id, v_session.platform_user_id, null::uuid; return;
  end if;
  if v_session.state = 'awaiting_email' then
    if v_session.expires_at <= clock_timestamp() then
      update public.{p}rein_link_sessions set state = 'expired', updated_at = now() where id = v_session.id;
      return query select false, 'binding_expired', null::uuid, v_session.platform,
        v_session.platform_workspace_id, v_session.platform_user_id, null::uuid; return;
    end if;
    select * into v_challenge from public.{p}rein_link_email_challenges
     where session_id = v_session.id and outcome = 'pending' and delivery_method = 'email_code'
     for update;
    if not found then
      return query select false, 'binding_not_verified', null::uuid, v_session.platform,
        v_session.platform_workspace_id, v_session.platform_user_id, null::uuid; return;
    end if;
    if v_challenge.code_expires_at is null or v_challenge.code_expires_at <= clock_timestamp()
       or v_challenge.attempt_count >= 5 then
      update public.{p}rein_link_email_challenges set outcome = 'expired', code_hash = null, updated_at = now()
       where id = v_challenge.id;
      return query select false, 'binding_expired', null::uuid, v_session.platform,
        v_session.platform_workspace_id, v_session.platform_user_id, null::uuid; return;
    end if;
    if p_binding_code_hash is null or v_challenge.code_hash is distinct from p_binding_code_hash then
      update public.{p}rein_link_email_challenges set attempt_count = attempt_count + 1, updated_at = now()
       where id = v_challenge.id;
      return query select false, 'binding_code_invalid', null::uuid, v_session.platform,
        v_session.platform_workspace_id, v_session.platform_user_id, null::uuid; return;
    end if;
    -- Re-derive registration only AFTER the emailed secret is returned by its requesting account.
    select count(*), min(ci.contact_id::text)::uuid into v_matches, v_contact
      from public.{p}contact_identities ci
      join public.{p}community_contacts cc on cc.id = ci.contact_id and cc.deleted_at is null
     where ci.identity_kind = 'email' and {d} = v_challenge.email_hash;
    if v_matches <> 1 then
      update public.{p}rein_link_email_challenges
         set outcome = case when v_matches = 0 then 'denied_unregistered' else 'denied_ambiguous' end,
             code_hash = null, updated_at = now() where id = v_challenge.id;
      if v_matches = 0 then
        update public.{p}rein_link_sessions set state = 'registration_required', email_verified_at = now(), updated_at = now()
         where id = v_session.id;
      end if;
      insert into public.{p}admin_audit_log(actor_type, actor_id, action, entity_type, entity_id, details)
      values ('system', 'chat:email-code',
        case when v_matches = 0 then 'identity_link.registration_required' else 'identity_link.email_conflict' end,
        'link_session', v_session.id, jsonb_build_object('platform', v_session.platform,
          'platform_workspace_id', v_session.platform_workspace_id, 'email_hash', v_challenge.email_hash));
      return query select false, case when v_matches = 0 then 'contact_not_registered' else 'contact_ambiguous' end,
        null::uuid, v_session.platform, v_session.platform_workspace_id, v_session.platform_user_id, null::uuid; return;
    end if;
    update public.{p}rein_link_email_challenges set outcome = 'verified', resolved_contact_id = v_contact,
      code_consumed_at = now(), code_hash = null, updated_at = now() where id = v_challenge.id;
    update public.{p}rein_link_sessions set state = 'email_verified', contact_id = v_contact,
      email_verified_at = now(), updated_at = now() where id = v_session.id returning * into v_session;
    insert into public.{p}admin_audit_log(actor_type, actor_id, action, entity_type, entity_id, details)
    values ('system', 'chat:email-code', 'identity_link.email_verified', 'link_session', v_session.id,
      jsonb_build_object('platform', v_session.platform, 'contact_id', v_contact, 'email_hash', v_challenge.email_hash));
  end if;
  if v_session.state <> 'email_verified' then
    return query select false, 'binding_not_verified', null::uuid, v_session.platform,
      v_session.platform_workspace_id, v_session.platform_user_id, null::uuid; return;
  end if;
  if v_session.expires_at <= clock_timestamp() then
    update public.{p}rein_link_sessions set state = 'expired', updated_at = now() where id = v_session.id;
    return query select false, 'binding_expired', null::uuid, v_session.platform,
      v_session.platform_workspace_id, v_session.platform_user_id, null::uuid; return;
  end if;
  if v_session.binding_code_hash is null
     or v_session.binding_code_hash <> p_binding_code_hash
     or v_session.binding_code_consumed_at is not null
     or (v_session.binding_code_expires_at is not null and v_session.binding_code_expires_at <= clock_timestamp()) then
    return query select false, 'binding_code_invalid', null::uuid, v_session.platform,
      v_session.platform_workspace_id, v_session.platform_user_id, null::uuid; return;
  end if;
  if v_session.contact_id is null then
    return query select false, 'binding_not_verified', null::uuid, v_session.platform,
      v_session.platform_workspace_id, v_session.platform_user_id, null::uuid; return;
  end if;
  if v_session.platform <> p_platform
     or v_session.platform_workspace_id <> p_workspace_id
     or v_session.platform_user_id <> p_platform_user_id then
    return query select false, 'binding_tuple_mismatch', null::uuid, v_session.platform,
      v_session.platform_workspace_id, v_session.platform_user_id, null::uuid; return;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('contact:slack:' || v_session.contact_id::text, 0));

  select l.* into v_other from public.{p}rein_platform_links l
   where v_session.platform = 'slack' and l.platform = 'slack'
     and l.contact_id = v_session.contact_id
     and l.status = 'verified'
     and not (
       l.platform_workspace_id = v_session.platform_workspace_id
       and l.platform_user_id = v_session.platform_user_id)
   order by l.id
   limit 1
   for update;
  if found then
    return query select false, 'contact_conflict', v_other.contact_id, v_session.platform,
      v_session.platform_workspace_id, v_session.platform_user_id, v_other.id; return;
  end if;

  select * into v_existing from public.{p}rein_platform_links
   where {p}rein_platform_links.platform = v_session.platform
     and {p}rein_platform_links.platform_workspace_id = v_session.platform_workspace_id
     and {p}rein_platform_links.platform_user_id = v_session.platform_user_id
   for update;

  if v_session.expires_at <= clock_timestamp() then
    update public.{p}rein_link_sessions set state = 'expired', updated_at = now() where id = v_session.id;
    return query select false, 'binding_expired', null::uuid, v_session.platform,
      v_session.platform_workspace_id, v_session.platform_user_id, null::uuid; return;
  end if;
  if v_session.binding_code_expires_at is not null
     and v_session.binding_code_expires_at <= clock_timestamp() then
    return query select false, 'binding_code_invalid', null::uuid, v_session.platform,
      v_session.platform_workspace_id, v_session.platform_user_id, null::uuid; return;
  end if;

  if found then
    if v_existing.status = 'revoked' then
      return query select false, 'identity_revoked', v_existing.contact_id, v_session.platform,
        v_session.platform_workspace_id, v_session.platform_user_id, v_existing.id; return;
    end if;
    if v_existing.contact_id <> v_session.contact_id then
      return query select false, 'contact_conflict', v_existing.contact_id, v_session.platform,
        v_session.platform_workspace_id, v_session.platform_user_id, v_existing.id; return;
    end if;
    v_id := v_existing.id;
  else
    begin
      insert into public.{p}rein_platform_links(
        platform, platform_workspace_id, platform_user_id, platform_channel_id, contact_id,
        status, validity_expires_at, verified_at, verified_by)
      values (
        v_session.platform, v_session.platform_workspace_id, v_session.platform_user_id,
        v_session.platform_channel_id, v_session.contact_id,
        'verified', now() + p_validity, now(), 'website:email-verified')
      returning id into v_id;
    exception when unique_violation then
      return query select false, 'contact_conflict', v_session.contact_id, v_session.platform,
        v_session.platform_workspace_id, v_session.platform_user_id, null::uuid; return;
    end;
  end if;

  update public.{p}rein_link_sessions
     set state = 'completed', completed_at = now(), binding_code_consumed_at = now(), updated_at = now()
   where id = v_session.id;

  insert into public.{p}admin_audit_log(actor_type, actor_id, action, entity_type, entity_id, details)
  values (p_actor_type, p_actor_type, 'identity_link.completed', 'platform_link', v_id,
    jsonb_build_object('platform', v_session.platform,
      'platform_workspace_id', v_session.platform_workspace_id,
      'contact_id', v_session.contact_id));

  return query select true, 'linked', v_session.contact_id, v_session.platform,
    v_session.platform_workspace_id, v_session.platform_user_id, v_id; return;
end;
$template$;
  foreach prefix in array array['dev_', 'prod_'] loop
    execute format('alter table public.%I add column delivery_method text not null default ''receipt'' check (delivery_method in (''receipt'', ''email_code''))', prefix || 'rein_link_email_challenges');
    execute format(
      'create or replace function public.%I(p_session_token_hash text, p_email text, p_email_hash text, p_email_masked text, p_receipt_token_hash text, p_code_hash text, p_code_expires_at timestamptz, p_ip_hash text, p_max_per_session integer, p_max_per_ip integer) returns table(ok boolean, reason text, challenge_id uuid) language plpgsql security definer set search_path = public, pg_temp as %L',
      prefix || 'rein_issue_link_email_binding_code', replace(issue_template, '{p}', prefix));
    execute format('revoke all on function public.%I(text,text,text,text,text,text,timestamptz,text,integer,integer) from public, anon, authenticated', prefix || 'rein_issue_link_email_binding_code');
    execute format('grant execute on function public.%I(text,text,text,text,text,text,timestamptz,text,integer,integer) to service_role', prefix || 'rein_issue_link_email_binding_code');
    execute format(
      'create or replace function public.%I(p_session_token_hash text, p_binding_code_hash text, p_validity interval, p_platform text, p_workspace_id text, p_platform_user_id text, p_actor_type text) returns table(ok boolean, reason text, contact_id uuid, platform text, platform_workspace_id text, platform_user_id text, link_id uuid) language plpgsql security definer set search_path = public, pg_temp as %L',
      prefix || 'rein_complete_platform_link', replace(replace(complete_template, '{p}', prefix), '{d}', format('encode(%I.digest(ci.normalized_value, ''sha256''), ''hex'')', digest_schema)));
    execute format('revoke all on function public.%I(text,text,interval,text,text,text,text) from public, anon, authenticated', prefix || 'rein_complete_platform_link');
    execute format('grant execute on function public.%I(text,text,interval,text,text,text,text) to service_role', prefix || 'rein_complete_platform_link');
  end loop;
end;
$email_binding$;
commit;
