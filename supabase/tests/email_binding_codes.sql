-- Synthetic-only direct email-code integration tests. No email is sent.
begin;
select no_plan();

create or replace function pg_temp.email_session(token text, platform_name text, user_name text) returns void language sql as $$
  insert into public.dev_rein_link_sessions(platform,platform_workspace_id,platform_user_id,platform_channel_id,session_token_hash,expires_at)
  values(platform_name,'W-EMAIL',user_name,'C-EMAIL',token,clock_timestamp()+interval '30 minutes');
$$;
create or replace function pg_temp.email_issue(token text, code text, email text default 'email-code@example.test') returns boolean language sql as $$
  select ok from public.dev_rein_issue_link_email_binding_code(token,email,encode(digest(email,'sha256'),'hex'),'e***@example.test',
    token||'-receipt-'||code,code,clock_timestamp()+interval '10 minutes',null,5,20);
$$;
create or replace function pg_temp.email_complete(token text, code text, platform_name text, user_name text) returns text language sql as $$
  select reason from public.dev_rein_complete_platform_link(token,code,interval '10 years',platform_name,'W-EMAIL',user_name,'agent');
$$;
insert into public.dev_community_contacts(id,first_source) values('00000000-0000-4000-8000-00000000e001','manual');
insert into public.dev_contact_identities(contact_id,identity_kind,normalized_value)
values('00000000-0000-4000-8000-00000000e001','email','email-code@example.test');
select is(has_function_privilege('anon','public.dev_rein_issue_link_email_binding_code(text,text,text,text,text,text,timestamptz,text,integer,integer)','execute'),false,'dev_ anonymous cannot issue codes');
select is(has_function_privilege('authenticated','public.dev_rein_issue_link_email_binding_code(text,text,text,text,text,text,timestamptz,text,integer,integer)','execute'),false,'dev_ signed-in client cannot issue codes');
select is(has_function_privilege('service_role','public.dev_rein_issue_link_email_binding_code(text,text,text,text,text,text,timestamptz,text,integer,integer)','execute'),true,'dev_ backend can issue codes');

select pg_temp.email_session('slack','slack','U-slack');
select is(pg_temp.email_issue('slack','code-slack'),true,'dev_slack: issue email code');
select is((select state from public.dev_rein_link_sessions where session_token_hash='slack'),'awaiting_email','slack: sending email does not prove possession');
select is((select email_verified_at from public.dev_rein_link_sessions where session_token_hash='slack'),null::timestamptz,'slack: email not verified on issue');
select is(pg_temp.email_complete('slack','code-slack','discord','U-slack'),'binding_tuple_mismatch','slack: reject another platform');
select is(pg_temp.email_complete('slack','code-slack','slack','U-other'),'binding_tuple_mismatch','slack: reject another user');
select is((select reason from public.dev_rein_complete_platform_link('slack','code-slack','10 years','slack','OTHER-WORKSPACE','U-slack','agent')),'binding_tuple_mismatch','slack: reject another workspace');
select is(pg_temp.email_complete('slack','wrong','slack','U-slack'),'binding_code_invalid','slack: reject wrong code');
select is((select email_verified_at from public.dev_rein_link_sessions where session_token_hash='slack'),null::timestamptz,'slack: failed attempts cannot verify email');
select is(pg_temp.email_complete('slack','code-slack','slack','U-slack'),'linked','slack: one redemption verifies email and links account');
select is(pg_temp.email_complete('slack','code-slack','slack','U-slack'),'binding_already_completed','slack: replay refused');
select is((select count(*) from public.dev_rein_platform_links where platform='slack' and platform_user_id='U-slack' and status='verified'),1::bigint,'slack: exactly one verified link');

select pg_temp.email_session('slack-resend','slack','U-slack');
select is(pg_temp.email_issue('slack-resend','old-slack'),true,'slack: first email issued');
select is(pg_temp.email_issue('slack-resend','new-slack'),true,'slack: resend issued');
select is(pg_temp.email_complete('slack-resend','old-slack','slack','U-slack'),'binding_code_invalid','slack: resend invalidates old code');
select is(pg_temp.email_complete('slack-resend','new-slack','slack','U-slack'),'linked','slack: latest code works');

select pg_temp.email_session('slack-expiry','slack','U-slack');
select is(pg_temp.email_issue('slack-expiry','expired-slack'),true,'slack: issue expiry fixture');
update public.dev_rein_link_email_challenges set code_expires_at=clock_timestamp()-interval '1 second'
 where session_id=(select id from public.dev_rein_link_sessions where session_token_hash='slack-expiry');
select is(pg_temp.email_complete('slack-expiry','expired-slack','slack','U-slack'),'binding_expired','slack: expired code refused');

select pg_temp.email_session('slack-attempts','slack','U-slack');
select is(pg_temp.email_issue('slack-attempts','attempts-slack'),true,'slack: issue attempts fixture');
select pg_temp.email_complete('slack-attempts','wrong','slack','U-slack') from generate_series(1,5);
select is(pg_temp.email_complete('slack-attempts','attempts-slack','slack','U-slack'),'binding_expired','slack: five failures lock the code');

select pg_temp.email_session('slack-unknown','slack','U-slack-unknown');
select is(pg_temp.email_issue('slack-unknown','unknown-slack','unregistered@example.test'),true,'slack: unknown address gets same issue result');
select is(pg_temp.email_complete('slack-unknown','unknown-slack','slack','U-slack-unknown'),'contact_not_registered','slack: mailbox possession cannot register a contact');
select is((select state from public.dev_rein_link_sessions where session_token_hash='slack-unknown'),'registration_required','slack: registration status available to original account');

select pg_temp.email_session('slack-limits','slack','U-slack');
select pg_temp.email_issue('slack-limits','limit-'||n||'-slack') from generate_series(1,5) n;
select is(pg_temp.email_issue('slack-limits','sixth-slack'),false,'slack: request limit enforced');

select pg_temp.email_session('slack-revoked','slack','U-slack');
select is(pg_temp.email_issue('slack-revoked','revoked-slack'),true,'slack: issue before revocation');
select * from public.dev_rein_revoke_platform_link((select id from public.dev_rein_platform_links where platform='slack' and platform_user_id='U-slack'),'test','synthetic test','admin');
select is(pg_temp.email_complete('slack-revoked','revoked-slack','slack','U-slack'),'identity_revoked','slack: revocation remains a tombstone');

select pg_temp.email_session('discord','discord','U-discord');
select is(pg_temp.email_issue('discord','code-discord'),true,'dev_discord: issue email code');
select is((select state from public.dev_rein_link_sessions where session_token_hash='discord'),'awaiting_email','discord: sending email does not prove possession');
select is((select email_verified_at from public.dev_rein_link_sessions where session_token_hash='discord'),null::timestamptz,'discord: email not verified on issue');
select is(pg_temp.email_complete('discord','code-discord','slack','U-discord'),'binding_tuple_mismatch','discord: reject another platform');
select is(pg_temp.email_complete('discord','code-discord','discord','U-other'),'binding_tuple_mismatch','discord: reject another user');
select is((select reason from public.dev_rein_complete_platform_link('discord','code-discord','10 years','discord','OTHER-WORKSPACE','U-discord','agent')),'binding_tuple_mismatch','discord: reject another workspace');
select is(pg_temp.email_complete('discord','wrong','discord','U-discord'),'binding_code_invalid','discord: reject wrong code');
select is((select email_verified_at from public.dev_rein_link_sessions where session_token_hash='discord'),null::timestamptz,'discord: failed attempts cannot verify email');
select is(pg_temp.email_complete('discord','code-discord','discord','U-discord'),'linked','discord: one redemption verifies email and links account');
select is(pg_temp.email_complete('discord','code-discord','discord','U-discord'),'binding_already_completed','discord: replay refused');
select is((select count(*) from public.dev_rein_platform_links where platform='discord' and platform_user_id='U-discord' and status='verified'),1::bigint,'discord: exactly one verified link');

select pg_temp.email_session('discord-resend','discord','U-discord');
select is(pg_temp.email_issue('discord-resend','old-discord'),true,'discord: first email issued');
select is(pg_temp.email_issue('discord-resend','new-discord'),true,'discord: resend issued');
select is(pg_temp.email_complete('discord-resend','old-discord','discord','U-discord'),'binding_code_invalid','discord: resend invalidates old code');
select is(pg_temp.email_complete('discord-resend','new-discord','discord','U-discord'),'linked','discord: latest code works');

select pg_temp.email_session('discord-expiry','discord','U-discord');
select is(pg_temp.email_issue('discord-expiry','expired-discord'),true,'discord: issue expiry fixture');
update public.dev_rein_link_email_challenges set code_expires_at=clock_timestamp()-interval '1 second'
 where session_id=(select id from public.dev_rein_link_sessions where session_token_hash='discord-expiry');
select is(pg_temp.email_complete('discord-expiry','expired-discord','discord','U-discord'),'binding_expired','discord: expired code refused');

select pg_temp.email_session('discord-attempts','discord','U-discord');
select is(pg_temp.email_issue('discord-attempts','attempts-discord'),true,'discord: issue attempts fixture');
select pg_temp.email_complete('discord-attempts','wrong','discord','U-discord') from generate_series(1,5);
select is(pg_temp.email_complete('discord-attempts','attempts-discord','discord','U-discord'),'binding_expired','discord: five failures lock the code');

select pg_temp.email_session('discord-unknown','discord','U-discord-unknown');
select is(pg_temp.email_issue('discord-unknown','unknown-discord','unregistered@example.test'),true,'discord: unknown address gets same issue result');
select is(pg_temp.email_complete('discord-unknown','unknown-discord','discord','U-discord-unknown'),'contact_not_registered','discord: mailbox possession cannot register a contact');
select is((select state from public.dev_rein_link_sessions where session_token_hash='discord-unknown'),'registration_required','discord: registration status available to original account');

select pg_temp.email_session('discord-limits','discord','U-discord');
select pg_temp.email_issue('discord-limits','limit-'||n||'-discord') from generate_series(1,5) n;
select is(pg_temp.email_issue('discord-limits','sixth-discord'),false,'discord: request limit enforced');

select pg_temp.email_session('discord-revoked','discord','U-discord');
select is(pg_temp.email_issue('discord-revoked','revoked-discord'),true,'discord: issue before revocation');
select * from public.dev_rein_revoke_platform_link((select id from public.dev_rein_platform_links where platform='discord' and platform_user_id='U-discord'),'test','synthetic test','admin');
select is(pg_temp.email_complete('discord-revoked','revoked-discord','discord','U-discord'),'identity_revoked','discord: revocation remains a tombstone');

select pg_temp.email_session('slack-cross','slack','U-slack-cross');
select is(pg_temp.email_issue('slack-cross','slack-cross'),true,'issue fresh Slack for cross-platform test');
select is(pg_temp.email_complete('slack-cross','slack-cross','slack','U-slack-cross'),'linked','fresh Slack linked');
select pg_temp.email_session('discord-cross','discord','U-discord-cross');
select is(pg_temp.email_issue('discord-cross','discord-cross'),true,'issue Discord with Slack already linked');
select is(pg_temp.email_complete('discord-cross','discord-cross','discord','U-discord-cross'),'linked','existing Slack does not block Discord');
select pg_temp.email_session('slack-second','slack','U-slack-second');
select is(pg_temp.email_issue('slack-second','slack-second'),true,'issue second Slack');
select is(pg_temp.email_complete('slack-second','slack-second','slack','U-slack-second'),'contact_conflict','second Slack still refused');
select is((select count(*) from public.dev_community_contacts where id='00000000-0000-4000-8000-00000000e001'),1::bigint,'original contact preserved');
select is((select count(*) from public.dev_contact_identities where normalized_value='unregistered@example.test'),0::bigint,'unknown address never registered');

create or replace function pg_temp.email_session(token text, platform_name text, user_name text) returns void language sql as $$
  insert into public.prod_rein_link_sessions(platform,platform_workspace_id,platform_user_id,platform_channel_id,session_token_hash,expires_at)
  values(platform_name,'W-EMAIL',user_name,'C-EMAIL',token,clock_timestamp()+interval '30 minutes');
$$;
create or replace function pg_temp.email_issue(token text, code text, email text default 'email-code@example.test') returns boolean language sql as $$
  select ok from public.prod_rein_issue_link_email_binding_code(token,email,encode(digest(email,'sha256'),'hex'),'e***@example.test',
    token||'-receipt-'||code,code,clock_timestamp()+interval '10 minutes',null,5,20);
$$;
create or replace function pg_temp.email_complete(token text, code text, platform_name text, user_name text) returns text language sql as $$
  select reason from public.prod_rein_complete_platform_link(token,code,interval '10 years',platform_name,'W-EMAIL',user_name,'agent');
$$;
insert into public.prod_community_contacts(id,first_source) values('00000000-0000-4000-8000-00000000e001','manual');
insert into public.prod_contact_identities(contact_id,identity_kind,normalized_value)
values('00000000-0000-4000-8000-00000000e001','email','email-code@example.test');
select is(has_function_privilege('anon','public.prod_rein_issue_link_email_binding_code(text,text,text,text,text,text,timestamptz,text,integer,integer)','execute'),false,'prod_ anonymous cannot issue codes');
select is(has_function_privilege('authenticated','public.prod_rein_issue_link_email_binding_code(text,text,text,text,text,text,timestamptz,text,integer,integer)','execute'),false,'prod_ signed-in client cannot issue codes');
select is(has_function_privilege('service_role','public.prod_rein_issue_link_email_binding_code(text,text,text,text,text,text,timestamptz,text,integer,integer)','execute'),true,'prod_ backend can issue codes');

select pg_temp.email_session('slack','slack','U-slack');
select is(pg_temp.email_issue('slack','code-slack'),true,'prod_slack: issue email code');
select is((select state from public.prod_rein_link_sessions where session_token_hash='slack'),'awaiting_email','slack: sending email does not prove possession');
select is((select email_verified_at from public.prod_rein_link_sessions where session_token_hash='slack'),null::timestamptz,'slack: email not verified on issue');
select is(pg_temp.email_complete('slack','code-slack','discord','U-slack'),'binding_tuple_mismatch','slack: reject another platform');
select is(pg_temp.email_complete('slack','code-slack','slack','U-other'),'binding_tuple_mismatch','slack: reject another user');
select is((select reason from public.prod_rein_complete_platform_link('slack','code-slack','10 years','slack','OTHER-WORKSPACE','U-slack','agent')),'binding_tuple_mismatch','slack: reject another workspace');
select is(pg_temp.email_complete('slack','wrong','slack','U-slack'),'binding_code_invalid','slack: reject wrong code');
select is((select email_verified_at from public.prod_rein_link_sessions where session_token_hash='slack'),null::timestamptz,'slack: failed attempts cannot verify email');
select is(pg_temp.email_complete('slack','code-slack','slack','U-slack'),'linked','slack: one redemption verifies email and links account');
select is(pg_temp.email_complete('slack','code-slack','slack','U-slack'),'binding_already_completed','slack: replay refused');
select is((select count(*) from public.prod_rein_platform_links where platform='slack' and platform_user_id='U-slack' and status='verified'),1::bigint,'slack: exactly one verified link');

select pg_temp.email_session('slack-resend','slack','U-slack');
select is(pg_temp.email_issue('slack-resend','old-slack'),true,'slack: first email issued');
select is(pg_temp.email_issue('slack-resend','new-slack'),true,'slack: resend issued');
select is(pg_temp.email_complete('slack-resend','old-slack','slack','U-slack'),'binding_code_invalid','slack: resend invalidates old code');
select is(pg_temp.email_complete('slack-resend','new-slack','slack','U-slack'),'linked','slack: latest code works');

select pg_temp.email_session('slack-expiry','slack','U-slack');
select is(pg_temp.email_issue('slack-expiry','expired-slack'),true,'slack: issue expiry fixture');
update public.prod_rein_link_email_challenges set code_expires_at=clock_timestamp()-interval '1 second'
 where session_id=(select id from public.prod_rein_link_sessions where session_token_hash='slack-expiry');
select is(pg_temp.email_complete('slack-expiry','expired-slack','slack','U-slack'),'binding_expired','slack: expired code refused');

select pg_temp.email_session('slack-attempts','slack','U-slack');
select is(pg_temp.email_issue('slack-attempts','attempts-slack'),true,'slack: issue attempts fixture');
select pg_temp.email_complete('slack-attempts','wrong','slack','U-slack') from generate_series(1,5);
select is(pg_temp.email_complete('slack-attempts','attempts-slack','slack','U-slack'),'binding_expired','slack: five failures lock the code');

select pg_temp.email_session('slack-unknown','slack','U-slack-unknown');
select is(pg_temp.email_issue('slack-unknown','unknown-slack','unregistered@example.test'),true,'slack: unknown address gets same issue result');
select is(pg_temp.email_complete('slack-unknown','unknown-slack','slack','U-slack-unknown'),'contact_not_registered','slack: mailbox possession cannot register a contact');
select is((select state from public.prod_rein_link_sessions where session_token_hash='slack-unknown'),'registration_required','slack: registration status available to original account');

select pg_temp.email_session('slack-limits','slack','U-slack');
select pg_temp.email_issue('slack-limits','limit-'||n||'-slack') from generate_series(1,5) n;
select is(pg_temp.email_issue('slack-limits','sixth-slack'),false,'slack: request limit enforced');

select pg_temp.email_session('slack-revoked','slack','U-slack');
select is(pg_temp.email_issue('slack-revoked','revoked-slack'),true,'slack: issue before revocation');
select * from public.prod_rein_revoke_platform_link((select id from public.prod_rein_platform_links where platform='slack' and platform_user_id='U-slack'),'test','synthetic test','admin');
select is(pg_temp.email_complete('slack-revoked','revoked-slack','slack','U-slack'),'identity_revoked','slack: revocation remains a tombstone');

select pg_temp.email_session('discord','discord','U-discord');
select is(pg_temp.email_issue('discord','code-discord'),true,'prod_discord: issue email code');
select is((select state from public.prod_rein_link_sessions where session_token_hash='discord'),'awaiting_email','discord: sending email does not prove possession');
select is((select email_verified_at from public.prod_rein_link_sessions where session_token_hash='discord'),null::timestamptz,'discord: email not verified on issue');
select is(pg_temp.email_complete('discord','code-discord','slack','U-discord'),'binding_tuple_mismatch','discord: reject another platform');
select is(pg_temp.email_complete('discord','code-discord','discord','U-other'),'binding_tuple_mismatch','discord: reject another user');
select is((select reason from public.prod_rein_complete_platform_link('discord','code-discord','10 years','discord','OTHER-WORKSPACE','U-discord','agent')),'binding_tuple_mismatch','discord: reject another workspace');
select is(pg_temp.email_complete('discord','wrong','discord','U-discord'),'binding_code_invalid','discord: reject wrong code');
select is((select email_verified_at from public.prod_rein_link_sessions where session_token_hash='discord'),null::timestamptz,'discord: failed attempts cannot verify email');
select is(pg_temp.email_complete('discord','code-discord','discord','U-discord'),'linked','discord: one redemption verifies email and links account');
select is(pg_temp.email_complete('discord','code-discord','discord','U-discord'),'binding_already_completed','discord: replay refused');
select is((select count(*) from public.prod_rein_platform_links where platform='discord' and platform_user_id='U-discord' and status='verified'),1::bigint,'discord: exactly one verified link');

select pg_temp.email_session('discord-resend','discord','U-discord');
select is(pg_temp.email_issue('discord-resend','old-discord'),true,'discord: first email issued');
select is(pg_temp.email_issue('discord-resend','new-discord'),true,'discord: resend issued');
select is(pg_temp.email_complete('discord-resend','old-discord','discord','U-discord'),'binding_code_invalid','discord: resend invalidates old code');
select is(pg_temp.email_complete('discord-resend','new-discord','discord','U-discord'),'linked','discord: latest code works');

select pg_temp.email_session('discord-expiry','discord','U-discord');
select is(pg_temp.email_issue('discord-expiry','expired-discord'),true,'discord: issue expiry fixture');
update public.prod_rein_link_email_challenges set code_expires_at=clock_timestamp()-interval '1 second'
 where session_id=(select id from public.prod_rein_link_sessions where session_token_hash='discord-expiry');
select is(pg_temp.email_complete('discord-expiry','expired-discord','discord','U-discord'),'binding_expired','discord: expired code refused');

select pg_temp.email_session('discord-attempts','discord','U-discord');
select is(pg_temp.email_issue('discord-attempts','attempts-discord'),true,'discord: issue attempts fixture');
select pg_temp.email_complete('discord-attempts','wrong','discord','U-discord') from generate_series(1,5);
select is(pg_temp.email_complete('discord-attempts','attempts-discord','discord','U-discord'),'binding_expired','discord: five failures lock the code');

select pg_temp.email_session('discord-unknown','discord','U-discord-unknown');
select is(pg_temp.email_issue('discord-unknown','unknown-discord','unregistered@example.test'),true,'discord: unknown address gets same issue result');
select is(pg_temp.email_complete('discord-unknown','unknown-discord','discord','U-discord-unknown'),'contact_not_registered','discord: mailbox possession cannot register a contact');
select is((select state from public.prod_rein_link_sessions where session_token_hash='discord-unknown'),'registration_required','discord: registration status available to original account');

select pg_temp.email_session('discord-limits','discord','U-discord');
select pg_temp.email_issue('discord-limits','limit-'||n||'-discord') from generate_series(1,5) n;
select is(pg_temp.email_issue('discord-limits','sixth-discord'),false,'discord: request limit enforced');

select pg_temp.email_session('discord-revoked','discord','U-discord');
select is(pg_temp.email_issue('discord-revoked','revoked-discord'),true,'discord: issue before revocation');
select * from public.prod_rein_revoke_platform_link((select id from public.prod_rein_platform_links where platform='discord' and platform_user_id='U-discord'),'test','synthetic test','admin');
select is(pg_temp.email_complete('discord-revoked','revoked-discord','discord','U-discord'),'identity_revoked','discord: revocation remains a tombstone');

select pg_temp.email_session('slack-cross','slack','U-slack-cross');
select is(pg_temp.email_issue('slack-cross','slack-cross'),true,'issue fresh Slack for cross-platform test');
select is(pg_temp.email_complete('slack-cross','slack-cross','slack','U-slack-cross'),'linked','fresh Slack linked');
select pg_temp.email_session('discord-cross','discord','U-discord-cross');
select is(pg_temp.email_issue('discord-cross','discord-cross'),true,'issue Discord with Slack already linked');
select is(pg_temp.email_complete('discord-cross','discord-cross','discord','U-discord-cross'),'linked','existing Slack does not block Discord');
select pg_temp.email_session('slack-second','slack','U-slack-second');
select is(pg_temp.email_issue('slack-second','slack-second'),true,'issue second Slack');
select is(pg_temp.email_complete('slack-second','slack-second','slack','U-slack-second'),'contact_conflict','second Slack still refused');
select is((select count(*) from public.prod_community_contacts where id='00000000-0000-4000-8000-00000000e001'),1::bigint,'original contact preserved');
select is((select count(*) from public.prod_contact_identities where normalized_value='unregistered@example.test'),0::bigint,'unknown address never registered');
select * from finish();
rollback;
