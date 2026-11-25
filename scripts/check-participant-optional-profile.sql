-- Safe against a populated database: unique test addresses, all writes rolled back.
-- Run with a database owner through SQL Editor or the database query tool.
begin;
do $$
declare
  env text;
  test_email text := 'optional-profile-' || gen_random_uuid() || '@example.test';
  saved record;
begin
  foreach env in array array['dev', 'prod'] loop
    execute format('select * from public.%I($1,null,null,null,$2,$3,$4,$5,true,true)', env || '_register_community_participant')
      using test_email, 'united_states', 'United States', 'CA', 'San Francisco';
    execute format('select name, industry from public.%I where email=$1', env || '_community_participants') into strict saved using test_email;
    if saved.name is not null or saved.industry is not null then
      raise exception '%: optional fields must remain null', env;
    end if;
    -- Exercise the ON CONFLICT path, including clearing an existing industry.
    execute format('select * from public.%I($1,null,$2,null,$3,$4,$5,$6,true,true)', env || '_register_community_participant')
      using test_email, 'Student', 'united_states', 'United States', 'CA', 'San Francisco';
    execute format('select * from public.%I($1,null,null,null,$2,$3,$4,$5,true,true)', env || '_register_community_participant')
      using test_email, 'united_states', 'United States', 'CA', 'San Francisco';
    execute format('select name, industry from public.%I where email=$1', env || '_community_participants') into strict saved using test_email;
    if saved.industry is not null then
      raise exception '%: repeated registration must accept omitted industry', env;
    end if;
  end loop;
end;
$$;
-- Exercise all form RPCs and stored fields in both environments; never send email.
do $audit$
declare
  env text;
  created record;
  saved jsonb;
begin
  foreach env in array array['dev', 'prod'] loop
    execute format($call$select * from public.%I(p_email => gen_random_uuid()::text || '@example.test',
      p_name => '测试姓名',
      p_industry => 'Other',
      p_industry_other => '社区研究',
      p_location_scope => 'international',
      p_country => 'China',
      p_us_state => null,
      p_city_region => '上海',
      p_communications_consent => true,
      p_privacy_consent => true)$call$, env || '_register_community_participant') into created;
    execute format('select to_jsonb(t) from public.%I t where id = $1', env || '_community_participants') into strict saved using created.participant_id;
    if not saved @> '{"name": "测试姓名", "industry": "Other", "industry_other": "社区研究", "location_scope": "international", "country": "China", "us_state": null, "city_region": "上海"}'::jsonb then
      raise exception '%: register_community_participant case 1 stored values differ', env;
    end if;
    execute format($call$select * from public.%I(p_name => '测试申请',
      p_email => gen_random_uuid()::text || '@example.test',
      p_industry => null,
      p_industry_other => null,
      p_location_scope => 'international',
      p_country => 'China',
      p_us_state => null,
      p_city_region => '上海',
      p_participation_reasons => array['Learn more about AI Agents']::text[],
      p_participation_reason_other => null,
      p_contribution_areas => array['Research and paper discussions']::text[],
      p_contribution_area_other => null,
      p_personal_website => null,
      p_github_url => null,
      p_scholar_url => null,
      p_linkedin_url => null,
      p_profile_willingness => null,
      p_verification_token_hash => gen_random_uuid()::text,
      p_verification_expires_at => '2030-01-01T00:00:00Z',
      p_privacy_consent => true,
      p_conduct_consent => true)$call$, env || '_create_contributor_application') into created;
    execute format('select to_jsonb(t) from public.%I t where id = $1', env || '_contributor_applications') into strict saved using created.application_id;
    if not saved @> '{"name": "测试申请", "industry": null, "industry_other": null, "location_scope": "international", "country": "China", "us_state": null, "city_region": "上海", "participation_reasons": ["Learn more about AI Agents"], "participation_reason_other": null, "contribution_areas": ["Research and paper discussions"], "contribution_area_other": null, "personal_website": null, "github_url": null, "scholar_url": null, "linkedin_url": null, "profile_willingness": null, "status": "email_pending"}'::jsonb then
      raise exception '%: create_contributor_application case 2 stored values differ', env;
    end if;
    execute format($call$select * from public.%I(p_name => '测试申请',
      p_email => gen_random_uuid()::text || '@example.test',
      p_industry => 'Other',
      p_industry_other => '开源社区',
      p_location_scope => 'united_states',
      p_country => 'United States',
      p_us_state => 'CA',
      p_city_region => 'Oakland',
      p_participation_reasons => array['Learn more about AI Agents','Other']::text[],
      p_participation_reason_other => '学习',
      p_contribution_areas => array['Research and paper discussions','Other']::text[],
      p_contribution_area_other => '分享',
      p_personal_website => 'https://example.org',
      p_github_url => 'https://github.com/example',
      p_scholar_url => 'https://scholar.google.com/citations?user=example',
      p_linkedin_url => 'https://www.linkedin.com/in/example',
      p_profile_willingness => 'yes_if_invited',
      p_verification_token_hash => gen_random_uuid()::text,
      p_verification_expires_at => '2030-01-01T00:00:00Z',
      p_privacy_consent => true,
      p_conduct_consent => true)$call$, env || '_create_contributor_application') into created;
    execute format('select to_jsonb(t) from public.%I t where id = $1', env || '_contributor_applications') into strict saved using created.application_id;
    if not saved @> '{"name": "测试申请", "industry": "Other", "industry_other": "开源社区", "location_scope": "united_states", "country": "United States", "us_state": "CA", "city_region": "Oakland", "participation_reasons": ["Learn more about AI Agents", "Other"], "participation_reason_other": "学习", "contribution_areas": ["Research and paper discussions", "Other"], "contribution_area_other": "分享", "personal_website": "https://example.org", "github_url": "https://github.com/example", "scholar_url": "https://scholar.google.com/citations?user=example", "linkedin_url": "https://www.linkedin.com/in/example", "profile_willingness": "yes_if_invited", "status": "email_pending"}'::jsonb then
      raise exception '%: create_contributor_application case 3 stored values differ', env;
    end if;
    execute format($call$select * from public.%I(p_name => '测试申请',
      p_email => gen_random_uuid()::text || '@example.test',
      p_industry => 'Other',
      p_industry_other => '开源社区',
      p_location_scope => 'united_states',
      p_country => 'United States',
      p_us_state => 'CA',
      p_city_region => 'Oakland',
      p_participation_reasons => array['Learn more about AI Agents','Other']::text[],
      p_participation_reason_other => '学习',
      p_contribution_areas => array['Research and paper discussions','Other']::text[],
      p_contribution_area_other => '分享',
      p_personal_website => 'https://example.org',
      p_github_url => 'https://github.com/example',
      p_scholar_url => 'https://scholar.google.com/citations?user=example',
      p_linkedin_url => 'https://www.linkedin.com/in/example',
      p_profile_willingness => 'not_now',
      p_verification_token_hash => gen_random_uuid()::text,
      p_verification_expires_at => '2030-01-01T00:00:00Z',
      p_privacy_consent => true,
      p_conduct_consent => true)$call$, env || '_create_contributor_application') into created;
    execute format('select to_jsonb(t) from public.%I t where id = $1', env || '_contributor_applications') into strict saved using created.application_id;
    if not saved @> '{"name": "测试申请", "industry": "Other", "industry_other": "开源社区", "location_scope": "united_states", "country": "United States", "us_state": "CA", "city_region": "Oakland", "participation_reasons": ["Learn more about AI Agents", "Other"], "participation_reason_other": "学习", "contribution_areas": ["Research and paper discussions", "Other"], "contribution_area_other": "分享", "personal_website": "https://example.org", "github_url": "https://github.com/example", "scholar_url": "https://scholar.google.com/citations?user=example", "linkedin_url": "https://www.linkedin.com/in/example", "profile_willingness": "not_now", "status": "email_pending"}'::jsonb then
      raise exception '%: create_contributor_application case 4 stored values differ', env;
    end if;
    execute format($call$select * from public.%I(p_name => '测试申请',
      p_email => gen_random_uuid()::text || '@example.test',
      p_industry => 'Other',
      p_industry_other => '开源社区',
      p_location_scope => 'united_states',
      p_country => 'United States',
      p_us_state => 'CA',
      p_city_region => 'Oakland',
      p_participation_reasons => array['Learn more about AI Agents','Other']::text[],
      p_participation_reason_other => '学习',
      p_contribution_areas => array['Research and paper discussions','Other']::text[],
      p_contribution_area_other => '分享',
      p_personal_website => 'https://example.org',
      p_github_url => 'https://github.com/example',
      p_scholar_url => 'https://scholar.google.com/citations?user=example',
      p_linkedin_url => 'https://www.linkedin.com/in/example',
      p_profile_willingness => 'discuss_later',
      p_verification_token_hash => gen_random_uuid()::text,
      p_verification_expires_at => '2030-01-01T00:00:00Z',
      p_privacy_consent => true,
      p_conduct_consent => true)$call$, env || '_create_contributor_application') into created;
    execute format('select to_jsonb(t) from public.%I t where id = $1', env || '_contributor_applications') into strict saved using created.application_id;
    if not saved @> '{"name": "测试申请", "industry": "Other", "industry_other": "开源社区", "location_scope": "united_states", "country": "United States", "us_state": "CA", "city_region": "Oakland", "participation_reasons": ["Learn more about AI Agents", "Other"], "participation_reason_other": "学习", "contribution_areas": ["Research and paper discussions", "Other"], "contribution_area_other": "分享", "personal_website": "https://example.org", "github_url": "https://github.com/example", "scholar_url": "https://scholar.google.com/citations?user=example", "linkedin_url": "https://www.linkedin.com/in/example", "profile_willingness": "discuss_later", "status": "email_pending"}'::jsonb then
      raise exception '%: create_contributor_application case 5 stored values differ', env;
    end if;
    execute format($call$select * from public.%I(p_contact_email => gen_random_uuid()::text || '@example.test',
      p_submitter_name => null,
      p_title => '测试资源',
      p_public_url => 'https://example.org/resource',
      p_format => 'Video',
      p_language => '中文',
      p_description => '说明',
      p_ai_agent_relevance => '说明',
      p_author_publisher => '作者',
      p_access_confirmation => true,
      p_copyright_confirmation => true,
      p_privacy_consent => true)$call$, env || '_create_resource_submission') into created;
    execute format('select to_jsonb(t) from public.%I t where id = $1', env || '_resource_submissions') into strict saved using created.submission_id;
    if not saved @> '{"submitter_name": null, "title": "测试资源", "public_url": "https://example.org/resource", "format": "Video", "language": "中文", "description": "说明", "ai_agent_relevance": "说明", "author_publisher": "作者", "status": "pending"}'::jsonb then
      raise exception '%: create_resource_submission case 6 stored values differ', env;
    end if;
    execute format($call$select * from public.%I(p_contact_email => gen_random_uuid()::text || '@example.test',
      p_submitter_name => null,
      p_title => '测试资源',
      p_public_url => 'https://example.org/resource',
      p_format => 'Article / Document',
      p_language => '中文',
      p_description => '说明',
      p_ai_agent_relevance => '说明',
      p_author_publisher => '作者',
      p_access_confirmation => true,
      p_copyright_confirmation => true,
      p_privacy_consent => true)$call$, env || '_create_resource_submission') into created;
    execute format('select to_jsonb(t) from public.%I t where id = $1', env || '_resource_submissions') into strict saved using created.submission_id;
    if not saved @> '{"submitter_name": null, "title": "测试资源", "public_url": "https://example.org/resource", "format": "Article / Document", "language": "中文", "description": "说明", "ai_agent_relevance": "说明", "author_publisher": "作者", "status": "pending"}'::jsonb then
      raise exception '%: create_resource_submission case 7 stored values differ', env;
    end if;
    execute format($call$select * from public.%I(p_contact_email => gen_random_uuid()::text || '@example.test',
      p_submitter_name => null,
      p_title => '测试资源',
      p_public_url => 'https://example.org/resource',
      p_format => 'Course',
      p_language => '中文',
      p_description => '说明',
      p_ai_agent_relevance => '说明',
      p_author_publisher => '作者',
      p_access_confirmation => true,
      p_copyright_confirmation => true,
      p_privacy_consent => true)$call$, env || '_create_resource_submission') into created;
    execute format('select to_jsonb(t) from public.%I t where id = $1', env || '_resource_submissions') into strict saved using created.submission_id;
    if not saved @> '{"submitter_name": null, "title": "测试资源", "public_url": "https://example.org/resource", "format": "Course", "language": "中文", "description": "说明", "ai_agent_relevance": "说明", "author_publisher": "作者", "status": "pending"}'::jsonb then
      raise exception '%: create_resource_submission case 8 stored values differ', env;
    end if;
    execute format($call$select * from public.%I(p_contact_email => gen_random_uuid()::text || '@example.test',
      p_submitter_name => null,
      p_title => '测试资源',
      p_public_url => 'https://example.org/resource',
      p_format => 'Paper Discussion',
      p_language => '中文',
      p_description => '说明',
      p_ai_agent_relevance => '说明',
      p_author_publisher => '作者',
      p_access_confirmation => true,
      p_copyright_confirmation => true,
      p_privacy_consent => true)$call$, env || '_create_resource_submission') into created;
    execute format('select to_jsonb(t) from public.%I t where id = $1', env || '_resource_submissions') into strict saved using created.submission_id;
    if not saved @> '{"submitter_name": null, "title": "测试资源", "public_url": "https://example.org/resource", "format": "Paper Discussion", "language": "中文", "description": "说明", "ai_agent_relevance": "说明", "author_publisher": "作者", "status": "pending"}'::jsonb then
      raise exception '%: create_resource_submission case 9 stored values differ', env;
    end if;
    execute format($call$select * from public.%I(p_contact_email => gen_random_uuid()::text || '@example.test',
      p_submitter_name => null,
      p_title => '测试资源',
      p_public_url => 'https://example.org/resource',
      p_format => 'Tool / Reference',
      p_language => '中文',
      p_description => '说明',
      p_ai_agent_relevance => '说明',
      p_author_publisher => '作者',
      p_access_confirmation => true,
      p_copyright_confirmation => true,
      p_privacy_consent => true)$call$, env || '_create_resource_submission') into created;
    execute format('select to_jsonb(t) from public.%I t where id = $1', env || '_resource_submissions') into strict saved using created.submission_id;
    if not saved @> '{"submitter_name": null, "title": "测试资源", "public_url": "https://example.org/resource", "format": "Tool / Reference", "language": "中文", "description": "说明", "ai_agent_relevance": "说明", "author_publisher": "作者", "status": "pending"}'::jsonb then
      raise exception '%: create_resource_submission case 10 stored values differ', env;
    end if;
  end loop;
end;
$audit$;
rollback;
