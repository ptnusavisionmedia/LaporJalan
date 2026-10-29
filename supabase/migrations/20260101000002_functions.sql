-- LaporJalan: helpers, triggers and RPC functions.
-- SECURITY DEFINER functions use search_path = '' and fully qualified names.
-- Invoker (read) functions use search_path = public, extensions so PostGIS operators resolve;
-- they run with the caller's privileges, so RLS applies.

-- ================================================================ generic triggers
create function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger trg_agencies_updated before update on public.agencies
  for each row execute function public.set_updated_at();
create trigger trg_reports_updated before update on public.reports
  for each row execute function public.set_updated_at();
create trigger trg_confirmations_updated before update on public.report_confirmations
  for each row execute function public.set_updated_at();
create trigger trg_device_tokens_updated before update on public.device_tokens
  for each row execute function public.set_updated_at();
create trigger trg_app_settings_updated before update on public.app_settings
  for each row execute function public.set_updated_at();

-- Append-only tables. Updates are tolerated ONLY when they null out the listed
-- user-reference columns (needed for ON DELETE SET NULL during account erasure).
create function public.enforce_immutable() returns trigger
language plpgsql as $$
declare c text;
begin
  if tg_op = 'UPDATE' and tg_nargs > 0 then
    foreach c in array tg_argv loop
      if (to_jsonb(new) ->> c) is not null then
        raise exception 'Catatan ini tidak dapat diubah' using errcode = '42501';
      end if;
    end loop;
    if (to_jsonb(new) - tg_argv) = (to_jsonb(old) - tg_argv) then
      return new;
    end if;
  end if;
  raise exception 'Catatan ini tidak dapat diubah atau dihapus' using errcode = '42501';
end $$;

create trigger trg_immutable_status_history before update or delete on public.report_status_history
  for each row execute function public.enforce_immutable('changed_by');
create trigger trg_immutable_audit before update or delete on public.admin_audit_logs
  for each row execute function public.enforce_immutable('actor_id');
create trigger trg_immutable_conf_events before update or delete on public.report_confirmation_events
  for each row execute function public.enforce_immutable('user_id');
create trigger trg_immutable_priority before update or delete on public.report_priority_scores
  for each row execute function public.enforce_immutable('created_by');

-- ================================================================ new auth user -> profile + 'user' role
-- The role is NEVER read from user metadata. Elevated roles come only from grant_role().
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 100));
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ================================================================ authorization helpers
create function public.has_role(p_role public.app_role) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.user_roles where user_id = auth.uid() and role = p_role
  );
$$;

-- Region codes the caller administers as admin_daerah.
create function public.my_jurisdiction_codes() returns text[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(distinct j.code), '{}')
  from public.agency_memberships m
  join public.agencies a on a.id = m.agency_id
  cross join lateral unnest(a.jurisdiction_codes) as j(code)
  where m.user_id = auth.uid()
    and m.member_role = 'admin_daerah'
    and exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin_daerah');
$$;

-- Super admin, or admin_daerah whose jurisdiction covers the report.
create function public.is_report_admin(p_report_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_role('super_admin') or exists (
    select 1 from public.reports r
    where r.id = p_report_id
      and array_remove(array[r.province_code, r.regency_code, r.district_code, r.village_code], null)
          && public.my_jurisdiction_codes()
  );
$$;

create function public.is_assigned_officer(p_report_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_role('petugas') and exists (
    select 1 from public.report_assignments a
    where a.report_id = p_report_id and a.officer_id = auth.uid() and a.active
  );
$$;

create function public.can_manage_report(p_report_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_report_admin(p_report_id) or public.is_assigned_officer(p_report_id);
$$;

-- May the caller view this report? (owner, public, or staff in scope)
create function public.can_view_report(p_report_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.reports r
    where r.id = p_report_id
      and (r.reporter_id = auth.uid() or r.is_public or public.can_manage_report(r.id))
  );
$$;

create function public.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role in ('super_admin', 'admin_daerah', 'petugas')
  );
$$;

-- Staff may see the profile of a reporter whose report they can manage.
create function public.staff_can_view_profile(p_user_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_role('super_admin') or exists (
    select 1 from public.reports r
    where r.reporter_id = p_user_id and public.can_manage_report(r.id)
  );
$$;

-- ================================================================ audit + notification internals
create function public.write_audit(
  p_action text, p_table text, p_record uuid, p_old jsonb, p_new jsonb
) returns void
language sql security definer set search_path = '' as $$
  insert into public.admin_audit_logs (actor_id, action, table_name, record_id, old_value, new_value)
  values (auth.uid(), p_action, p_table, p_record, p_old, p_new);
$$;

create function public.audit_row_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.admin_audit_logs (actor_id, action, table_name, record_id, old_value, new_value)
  values (
    auth.uid(), tg_op, tg_table_name,
    nullif(coalesce(to_jsonb(new) ->> 'id', to_jsonb(old) ->> 'id'), '')::uuid,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end $$;

-- the automatic base 'user' role at signup is not an administrative action
create trigger trg_audit_user_roles_iu after insert or update on public.user_roles
  for each row when (new.role <> 'user') execute function public.audit_row_change();
create trigger trg_audit_user_roles_d after delete on public.user_roles
  for each row when (old.role <> 'user') execute function public.audit_row_change();
create trigger trg_audit_agencies after insert or update or delete on public.agencies
  for each row execute function public.audit_row_change();
create trigger trg_audit_memberships after insert or update or delete on public.agency_memberships
  for each row execute function public.audit_row_change();
create trigger trg_audit_settings after insert or update or delete on public.app_settings
  for each row execute function public.audit_row_change();

-- Queue an in-app notification (push delivery is done by an Edge Function).
-- dedupe_key makes retries and repeated events idempotent.
create function public.queue_notification(
  p_user uuid, p_type text, p_title text, p_body text, p_data jsonb, p_dedupe text,
  p_pref text default null
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_user is null then return; end if;
  if p_pref is not null and not coalesce(
       (select (notification_prefs ->> p_pref)::boolean from public.profiles where id = p_user), true
     ) then
    return;
  end if;
  insert into public.notifications (user_id, type, title, body, data, dedupe_key)
  values (p_user, p_type, p_title, p_body, coalesce(p_data, '{}'::jsonb), p_dedupe)
  on conflict (user_id, dedupe_key) do nothing;
end $$;

-- ================================================================ priority scoring
-- All weights/thresholds come from app_settings('priority_config'); see seed below.
-- Traffic density is only used when enabled AND data exists; there is currently no
-- traffic data source, so the remaining weights are renormalised (never treated as 0).
create function public.calculate_priority(p_report_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  r public.reports;
  cfg jsonb;
  w jsonb;
  v_sev numeric; v_com numeric; v_road numeric; v_acc numeric; v_age numeric;
  v_conf integer;
  v_total numeric; v_wsum numeric; v_score numeric;
  v_level public.priority_level;
  v_thr jsonb;
begin
  select * into r from public.reports where id = p_report_id;
  if not found then return; end if;
  select value into cfg from public.app_settings where key = 'priority_config';
  if cfg is null then return; end if;
  w := cfg -> 'weights';
  v_thr := cfg -> 'thresholds';

  select count(*) into v_conf from public.report_confirmations
    where report_id = r.id and type = 'still_exists';

  v_sev := case r.severity when 'low' then 25 when 'medium' then 50 when 'high' then 75 else 100 end;
  v_com := least(100, v_conf::numeric
                      / greatest(coalesce((cfg ->> 'confirmations_for_max')::numeric, 5), 1) * 100);
  v_road := case r.road_class when 'nasional' then 100 when 'provinsi' then 80
              when 'kabupaten_kota' then 60 when 'desa' then 40 when 'lingkungan' then 30 else 40 end;
  v_acc := case r.accessibility_impact when 'none' then 0 when 'low' then 33
             when 'medium' then 66 else 100 end;
  v_age := case when r.status in ('selesai', 'ditolak') then 0
             else least(100, extract(epoch from (now() - r.created_at)) / 86400.0
                             / coalesce((cfg ->> 'days_for_max_age')::numeric, 30) * 100) end;

  v_total := v_sev * (w ->> 'severity')::numeric + v_com * (w ->> 'community')::numeric
           + v_road * (w ->> 'road')::numeric + v_acc * (w ->> 'accessibility')::numeric
           + v_age * (w ->> 'age')::numeric;
  v_wsum := (w ->> 'severity')::numeric + (w ->> 'community')::numeric + (w ->> 'road')::numeric
          + (w ->> 'accessibility')::numeric + (w ->> 'age')::numeric;
  if v_wsum <= 0 then return; end if;
  v_score := round(v_total / v_wsum, 2);

  v_level := case
    when v_score >= (v_thr ->> 'kritis')::numeric then 'kritis'
    when v_score >= (v_thr ->> 'tinggi')::numeric then 'tinggi'
    when v_score >= (v_thr ->> 'sedang')::numeric then 'sedang'
    else 'rendah' end;

  insert into public.report_priority_scores (report_id, score, level, factors, config_version)
  values (r.id, v_score, v_level,
    jsonb_build_object('severity', v_sev, 'community', v_com, 'road', v_road,
                       'accessibility', v_acc, 'age', v_age,
                       'traffic', null, 'confirmations', v_conf),
    coalesce(cfg ->> 'version', 'v1'));

  if not r.priority_overridden then
    update public.reports set priority_score = v_score, priority_level = v_level where id = r.id;
  end if;
end $$;

create function public.trg_calc_priority_on_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.calculate_priority(new.id);
  return null;
end $$;

create trigger trg_reports_priority after insert on public.reports
  for each row execute function public.trg_calc_priority_on_insert();

-- Administrator override with documented reason. Previous scores stay in history.
create function public.override_priority(
  p_report_id uuid, p_level public.priority_level, p_score numeric, p_reason text
) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.reports;
begin
  if not public.is_report_admin(p_report_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_reason is null or char_length(btrim(p_reason)) < 10 then
    raise exception 'override_reason_required' using errcode = '22023';
  end if;
  select * into r from public.reports where id = p_report_id for update;
  if not found then raise exception 'report_not_found' using errcode = 'P0002'; end if;

  insert into public.report_priority_scores
    (report_id, score, level, factors, config_version, is_override, override_reason, created_by)
  values (p_report_id, p_score, p_level, '{}'::jsonb, 'override', true, btrim(p_reason), auth.uid());

  update public.reports
    set priority_score = p_score, priority_level = p_level, priority_overridden = true
    where id = p_report_id;

  perform public.write_audit('priority_override', 'reports', p_report_id,
    jsonb_build_object('score', r.priority_score, 'level', r.priority_level),
    jsonb_build_object('score', p_score, 'level', p_level, 'reason', btrim(p_reason)));
end $$;

-- ================================================================ create report
create function public.create_report(
  p_title text, p_description text, p_category public.damage_category,
  p_lat double precision, p_lng double precision,
  p_severity public.severity_level, p_accessibility public.accessibility_impact,
  p_province_code text, p_regency_code text, p_district_code text, p_village_code text,
  p_road_name text, p_road_class text, p_idempotency_key text, p_photos jsonb
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_photo jsonb;
  v_recent integer;
begin
  if v_uid is null then raise exception 'unauthenticated' using errcode = '28000'; end if;

  -- idempotent retry: same key returns the same report
  if p_idempotency_key is not null then
    select id into v_id from public.reports
      where reporter_id = v_uid and idempotency_key = p_idempotency_key;
    if found then return v_id; end if;
  end if;

  if p_lat not between -11.5 and 6.5 or p_lng not between 94.5 and 141.5 then
    raise exception 'location_outside_indonesia' using errcode = '22023';
  end if;
  -- Region codes must exist and form a consistent chain (province > regency > district > village).
  -- Deeper levels may be omitted, but never without their parent.
  if p_province_code is null
     or (p_district_code is not null and p_regency_code is null)
     or (p_village_code is not null and p_district_code is null)
     or not exists (select 1 from public.regions where code = p_province_code and level = 1)
     or (p_regency_code is not null and not exists (
          select 1 from public.regions where code = p_regency_code and level = 2 and parent_code = p_province_code))
     or (p_district_code is not null and not exists (
          select 1 from public.regions where code = p_district_code and level = 3 and parent_code = p_regency_code))
     or (p_village_code is not null and not exists (
          select 1 from public.regions where code = p_village_code and level = 4 and parent_code = p_district_code))
  then
    raise exception 'invalid_region' using errcode = '22023';
  end if;
  if jsonb_typeof(p_photos) is distinct from 'array'
     or jsonb_array_length(p_photos) not between 1 and 5 then
    raise exception 'photos_required_1_to_5' using errcode = '22023';
  end if;

  select count(*) into v_recent from public.reports
    where reporter_id = v_uid and created_at > now() - interval '24 hours';
  if v_recent >= 20 then raise exception 'rate_limited' using errcode = '54000'; end if;

  insert into public.reports (
    reporter_id, title, description, category, severity, accessibility_impact, location,
    province_code, regency_code, district_code, village_code, road_name, road_class,
    idempotency_key
  ) values (
    v_uid, btrim(p_title), btrim(p_description), p_category, p_severity, p_accessibility,
    extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography,
    p_province_code, p_regency_code, p_district_code, p_village_code,
    nullif(btrim(p_road_name), ''), coalesce(p_road_class, 'tidak_diketahui'),
    p_idempotency_key
  ) returning id into v_id;

  for v_photo in select * from jsonb_array_elements(p_photos) loop
    if (v_photo ->> 'storage_path') not like v_uid::text || '/%' then
      raise exception 'invalid_photo_path' using errcode = '42501';
    end if;
    insert into public.report_photos (report_id, storage_path, mime_type, size_bytes, width, height)
    values (v_id, v_photo ->> 'storage_path', v_photo ->> 'mime_type',
            (v_photo ->> 'size_bytes')::integer,
            (v_photo ->> 'width')::integer, (v_photo ->> 'height')::integer);
  end loop;

  insert into public.report_status_history (report_id, from_status, to_status, changed_by, note)
  values (v_id, null, 'diajukan', v_uid, 'Laporan dibuat');

  perform public.queue_notification(v_uid, 'report_submitted', 'Laporan Berhasil Dikirim',
    'Laporan kerusakan Anda berhasil dikirim dan sedang menunggu verifikasi.',
    jsonb_build_object('report_id', v_id), 'submitted:' || v_id, 'status_updates');

  return v_id;
end $$;

-- ================================================================ status workflow
create function public.status_transition_allowed(
  p_from public.report_status, p_to public.report_status
) returns boolean
language sql immutable as $$
  select (p_from, p_to) in (
    ('diajukan', 'menunggu_verifikasi'), ('diajukan', 'terverifikasi'), ('diajukan', 'ditolak'),
    ('menunggu_verifikasi', 'terverifikasi'), ('menunggu_verifikasi', 'ditolak'),
    ('terverifikasi', 'dalam_penanganan'), ('terverifikasi', 'ditolak'),
    ('dalam_penanganan', 'selesai'),
    ('selesai', 'dalam_penanganan')  -- reopen
  );
$$;

-- Status change + history + audit + notification in ONE transaction (function body).
-- p_expected_from gives optimistic concurrency for two admins acting at once.
create function public.change_report_status(
  p_report_id uuid, p_to public.report_status, p_note text default null,
  p_expected_from public.report_status default null
) returns public.reports
language plpgsql security definer set search_path = '' as $$
declare
  r public.reports;
  v_uid uuid := auth.uid();
  v_admin boolean;
  v_officer boolean;
  v_old_status public.report_status;
  v_title text; v_body text; v_type text;
begin
  if v_uid is null then raise exception 'unauthenticated' using errcode = '28000'; end if;

  select * into r from public.reports where id = p_report_id for update;
  if not found then raise exception 'report_not_found' using errcode = 'P0002'; end if;

  v_admin := public.is_report_admin(p_report_id);
  v_officer := public.is_assigned_officer(p_report_id);
  if not (v_admin or v_officer) then raise exception 'forbidden' using errcode = '42501'; end if;

  if p_expected_from is not null and r.status <> p_expected_from then
    raise exception 'status_conflict' using errcode = '40001';
  end if;
  if not public.status_transition_allowed(r.status, p_to) then
    raise exception 'invalid_transition' using errcode = '22023';
  end if;
  -- officers may only start work on a verified report
  if not v_admin and not (r.status = 'terverifikasi' and p_to = 'dalam_penanganan') then
    raise exception 'forbidden_transition' using errcode = '42501';
  end if;
  if p_to = 'ditolak' and (p_note is null or char_length(btrim(p_note)) < 5) then
    raise exception 'rejection_note_required' using errcode = '22023';
  end if;
  if p_to = 'selesai' and not exists (
       select 1 from public.repair_evidence where report_id = r.id and kind = 'after') then
    raise exception 'after_evidence_required' using errcode = '22023';
  end if;

  v_old_status := r.status;
  update public.reports set
    status = p_to,
    is_public = case when p_to in ('terverifikasi', 'dalam_penanganan', 'selesai') then true
                     when p_to = 'ditolak' then false else is_public end,
    resolved_at = case when p_to = 'selesai' then now() when p_to = 'dalam_penanganan' then null
                       else resolved_at end
  where id = r.id returning * into r;

  insert into public.report_status_history (report_id, from_status, to_status, changed_by, note)
  values (r.id, v_old_status, p_to, v_uid, nullif(btrim(p_note), ''));

  perform public.write_audit('status_change', 'reports', r.id,
    jsonb_build_object('status', v_old_status),
    jsonb_build_object('status', p_to, 'note', p_note));

  select t, b, k into v_title, v_body, v_type from (values
    ('terverifikasi', 'Laporan Terverifikasi', 'Laporan Anda telah diverifikasi dan siap ditindaklanjuti.', 'report_verified'),
    ('ditolak', 'Laporan Ditolak', 'Laporan Anda belum dapat diproses. Lihat catatan petugas pada detail laporan.', 'report_rejected'),
    ('dalam_penanganan', 'Perbaikan Dimulai', 'Penanganan kerusakan yang Anda laporkan telah dimulai.', 'repair_started'),
    ('selesai', 'Perbaikan Selesai', 'Penanganan laporan Anda telah dinyatakan selesai. Lihat dokumentasi perbaikannya.', 'repair_completed')
  ) as m(s, t, b, k) where m.s = p_to::text;

  if v_type is not null then
    perform public.queue_notification(r.reporter_id, v_type, v_title, v_body,
      jsonb_build_object('report_id', r.id, 'status', p_to),
      'status:' || r.id || ':' || p_to || ':' || extract(epoch from r.updated_at)::bigint,
      'status_updates');
  end if;

  perform public.calculate_priority(r.id);
  return r;
end $$;

create function public.assign_report(p_report_id uuid, p_officer_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_agency uuid;
begin
  if not public.is_report_admin(p_report_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  perform 1 from public.reports where id = p_report_id for update;
  if not found then raise exception 'report_not_found' using errcode = 'P0002'; end if;

  -- the officer must be a petugas member of an agency covering this report
  select m.agency_id into v_agency
  from public.agency_memberships m
  join public.agencies a on a.id = m.agency_id
  join public.reports r on r.id = p_report_id
  where m.user_id = p_officer_id and m.member_role = 'petugas'
    and a.jurisdiction_codes && array_remove(
      array[r.province_code, r.regency_code, r.district_code, r.village_code], null)
  limit 1;
  if v_agency is null then raise exception 'officer_not_eligible' using errcode = '22023'; end if;

  update public.report_assignments set active = false where report_id = p_report_id and active;
  insert into public.report_assignments (report_id, officer_id, agency_id, assigned_by)
  values (p_report_id, p_officer_id, v_agency, auth.uid());
  update public.reports set assigned_agency_id = v_agency where id = p_report_id;

  perform public.write_audit('assign_officer', 'reports', p_report_id, null,
    jsonb_build_object('officer_id', p_officer_id, 'agency_id', v_agency));
  perform public.queue_notification(p_officer_id, 'assignment', 'Laporan Baru Ditugaskan',
    'Sebuah laporan kerusakan telah ditugaskan kepada Anda.',
    jsonb_build_object('report_id', p_report_id), 'assign:' || p_report_id || ':' || p_officer_id);
end $$;

create function public.add_repair_evidence(
  p_report_id uuid, p_kind public.evidence_kind, p_storage_path text,
  p_note text default null, p_repaired_at date default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_status public.report_status;
begin
  if not public.can_manage_report(p_report_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_storage_path not like p_report_id::text || '/%' then
    raise exception 'invalid_evidence_path' using errcode = '42501';
  end if;
  select status into v_status from public.reports where id = p_report_id;
  if v_status not in ('terverifikasi', 'dalam_penanganan', 'selesai') then
    raise exception 'report_not_in_repair_flow' using errcode = '22023';
  end if;
  insert into public.repair_evidence (report_id, uploaded_by, kind, storage_path, note, repaired_at)
  values (p_report_id, auth.uid(), p_kind, p_storage_path, nullif(btrim(p_note), ''), p_repaired_at)
  returning id into v_id;
  perform public.write_audit('add_evidence', 'repair_evidence', v_id, null,
    jsonb_build_object('report_id', p_report_id, 'kind', p_kind));
  return v_id;
end $$;

-- ================================================================ community validation
-- Never touches reports.status: community input cannot overwrite the official status.
create function public.confirm_report(p_report_id uuid, p_type public.confirmation_type) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  r public.reports;
  v_old public.confirmation_type;
begin
  if v_uid is null then raise exception 'unauthenticated' using errcode = '28000'; end if;
  select * into r from public.reports where id = p_report_id;
  if not found or not r.is_public then raise exception 'report_not_available' using errcode = 'P0002'; end if;
  if r.reporter_id = v_uid then raise exception 'cannot_confirm_own_report' using errcode = '42501'; end if;

  select type into v_old from public.report_confirmations
    where report_id = p_report_id and user_id = v_uid for update;
  if found and v_old = p_type then return; end if;

  insert into public.report_confirmations (report_id, user_id, type)
  values (p_report_id, v_uid, p_type)
  on conflict (report_id, user_id) do update set type = excluded.type;

  insert into public.report_confirmation_events (report_id, user_id, old_type, new_type)
  values (p_report_id, v_uid, v_old, p_type);

  perform public.calculate_priority(p_report_id);
end $$;

-- ================================================================ geographic queries (RLS applies)
create function public.nearby_reports(
  p_lat double precision, p_lng double precision,
  p_radius_m integer default 1000, p_limit integer default 50,
  p_include_repaired boolean default false
) returns table (
  id uuid, title text, category public.damage_category, severity public.severity_level,
  status public.report_status, lat double precision, lng double precision,
  road_name text, distance_m double precision, confirm_count bigint, created_at timestamptz
)
language sql stable set search_path = public, extensions as $$
  with pt as (select st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography as g)
  select r.id, r.title, r.category, r.severity, r.status,
         st_y(r.location::geometry), st_x(r.location::geometry), r.road_name,
         st_distance(r.location, pt.g),
         (select count(*) from report_confirmations c where c.report_id = r.id and c.type = 'still_exists'),
         r.created_at
  from reports r, pt
  where r.is_public
    and (p_include_repaired or r.status <> 'selesai')
    and st_dwithin(r.location, pt.g, least(greatest(p_radius_m, 50), 20000))
  order by r.location <-> pt.g
  limit least(greatest(p_limit, 1), 200);
$$;

-- Viewport query for the map. Callers pass the visible bounds; result size is capped.
create function public.reports_in_bbox(
  p_min_lng double precision, p_min_lat double precision,
  p_max_lng double precision, p_max_lat double precision,
  p_categories public.damage_category[] default null,
  p_severities public.severity_level[] default null,
  p_statuses public.report_status[] default null,
  p_limit integer default 300
) returns table (
  id uuid, title text, category public.damage_category, severity public.severity_level,
  status public.report_status, lat double precision, lng double precision,
  priority_level public.priority_level, created_at timestamptz
)
language sql stable set search_path = public, extensions as $$
  select r.id, r.title, r.category, r.severity, r.status,
         st_y(r.location::geometry), st_x(r.location::geometry), r.priority_level, r.created_at
  from reports r
  where r.is_public
    and r.location && st_makeenvelope(p_min_lng, p_min_lat, p_max_lng, p_max_lat, 4326)::geography
    and (p_categories is null or r.category = any (p_categories))
    and (p_severities is null or r.severity = any (p_severities))
    and (p_statuses is null or r.status = any (p_statuses))
  order by r.priority_score desc nulls last, r.created_at desc
  limit least(greatest(p_limit, 1), 500);
$$;

-- ================================================================ admin listing (server-side pagination)
create function public.admin_list_reports(
  p_search text default null, p_statuses public.report_status[] default null,
  p_category public.damage_category default null, p_severity public.severity_level default null,
  p_province_code text default null, p_regency_code text default null,
  p_sort text default 'created_at', p_dir text default 'desc',
  p_page integer default 1, p_page_size integer default 20
) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_super boolean := public.has_role('super_admin');
  v_codes text[] := public.my_jurisdiction_codes();
  v_size integer := least(greatest(p_page_size, 1), 100);
  v_off integer := (greatest(p_page, 1) - 1) * v_size;
  v_search text := case when p_search is null or btrim(p_search) = '' then null
                        else '%' || replace(replace(replace(btrim(p_search), '\', '\\'), '%', '\%'), '_', '\_') || '%' end;
  v_result jsonb;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;

  with scoped as (
    select r.* from public.reports r
    where (v_super
           or array_remove(array[r.province_code, r.regency_code, r.district_code, r.village_code], null) && v_codes
           or exists (select 1 from public.report_assignments a
                      where a.report_id = r.id and a.officer_id = auth.uid() and a.active))
      and (p_statuses is null or r.status = any (p_statuses))
      and (p_category is null or r.category = p_category)
      and (p_severity is null or r.severity = p_severity)
      and (p_province_code is null or r.province_code = p_province_code)
      and (p_regency_code is null or r.regency_code = p_regency_code)
      and (v_search is null or r.title ilike v_search or r.road_name ilike v_search or r.id::text ilike v_search)
  ), page as (
    select s.*, p.full_name as reporter_name, ag.name as agency_name
    from scoped s
    left join public.profiles p on p.id = s.reporter_id
    left join public.agencies ag on ag.id = s.assigned_agency_id
    order by
      case when p_sort = 'priority' and p_dir = 'asc' then s.priority_score end asc nulls last,
      case when p_sort = 'priority' and p_dir <> 'asc' then s.priority_score end desc nulls last,
      case when p_sort = 'created_at' and p_dir = 'asc' then s.created_at end asc,
      case when p_sort = 'created_at' and p_dir <> 'asc' then s.created_at end desc,
      s.id
    limit v_size offset v_off
  )
  select jsonb_build_object(
    'total', (select count(*) from scoped),
    'page', greatest(p_page, 1),
    'page_size', v_size,
    'rows', coalesce((select jsonb_agg(jsonb_build_object(
        'id', id, 'created_at', created_at, 'reporter_name', reporter_name, 'title', title,
        'category', category, 'province_code', province_code, 'regency_code', regency_code,
        'severity', severity, 'priority_score', priority_score, 'priority_level', priority_level,
        'status', status, 'agency_name', agency_name)) from page), '[]'::jsonb)
  ) into v_result;
  return v_result;
end $$;

-- ================================================================ statistics (RLS-scoped, invoker)
create function public.overview_stats() returns jsonb
language sql stable set search_path = public, extensions as $$
  select jsonb_build_object(
    'total', count(*),
    'pending', count(*) filter (where status in ('diajukan', 'menunggu_verifikasi')),
    'verified', count(*) filter (where status = 'terverifikasi'),
    'in_progress', count(*) filter (where status = 'dalam_penanganan'),
    'completed', count(*) filter (where status = 'selesai'),
    'rejected', count(*) filter (where status = 'ditolak'),
    'critical', count(*) filter (where severity = 'critical' and status not in ('selesai', 'ditolak')),
    'by_category', coalesce((select jsonb_object_agg(category, n) from (
        select category, count(*) n from reports group by category) c), '{}'::jsonb),
    'monthly', coalesce((select jsonb_agg(jsonb_build_object('month', m, 'total', n) order by m) from (
        select to_char(date_trunc('month', created_at), 'YYYY-MM') m, count(*) n
        from reports where created_at >= date_trunc('month', now()) - interval '11 months'
        group by 1) t), '[]'::jsonb)
  ) from reports;
$$;

create function public.regional_stats(p_level smallint, p_parent text default null) returns table (
  code text, name text, total bigint, unresolved bigint, completed bigint, avg_handling_hours numeric
)
language sql stable set search_path = public, extensions as $$
  select x.code, rg.name, count(*), count(*) filter (where x.status not in ('selesai', 'ditolak')),
         count(*) filter (where x.status = 'selesai'),
         round((avg(extract(epoch from (x.resolved_at - x.created_at))) / 3600.0)::numeric, 1)
  from (
    select case p_level when 1 then province_code when 2 then regency_code
                        when 3 then district_code else village_code end as code,
           status, created_at, resolved_at, province_code, regency_code, district_code
    from reports
  ) x
  left join regions rg on rg.code = x.code
  where x.code is not null
    and (p_parent is null or (case p_level when 2 then x.province_code when 3 then x.regency_code
                                           when 4 then x.district_code end) = p_parent)
  group by x.code, rg.name
  order by 3 desc;
$$;

-- ================================================================ roles, account & privacy
create function public.grant_role(p_user_id uuid, p_role public.app_role) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_role('super_admin') then raise exception 'forbidden' using errcode = '42501'; end if;
  insert into public.user_roles (user_id, role, granted_by) values (p_user_id, p_role, auth.uid())
  on conflict (user_id, role) do nothing;
end $$;

create function public.revoke_role(p_user_id uuid, p_role public.app_role) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_role('super_admin') then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_role = 'user' then raise exception 'cannot_revoke_base_role' using errcode = '22023'; end if;
  if p_user_id = auth.uid() and p_role = 'super_admin' then
    raise exception 'cannot_revoke_own_super_admin' using errcode = '22023';
  end if;
  delete from public.user_roles where user_id = p_user_id and role = p_role;
end $$;

create function public.accept_consent() returns void
language sql security definer set search_path = '' as $$
  update public.profiles set consent_accepted_at = now() where id = auth.uid();
$$;

-- Deletion is executed by a trusted job after a grace period (see docs/SECURITY.md).
create function public.request_account_deletion() returns void
language sql security definer set search_path = '' as $$
  update public.profiles set deletion_requested_at = coalesce(deletion_requested_at, now())
  where id = auth.uid();
$$;

create function public.cancel_account_deletion() returns void
language sql security definer set search_path = '' as $$
  update public.profiles set deletion_requested_at = null where id = auth.uid();
$$;

-- Right of access (UU PDP): a machine-readable copy of the caller's own data.
create function public.export_my_data() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'profile', (select to_jsonb(p) from public.profiles p where p.id = auth.uid()),
    'reports', coalesce((select jsonb_agg(to_jsonb(r) - 'location' || jsonb_build_object(
        'lat', extensions.st_y(r.location::extensions.geometry),
        'lng', extensions.st_x(r.location::extensions.geometry)))
      from public.reports r where r.reporter_id = auth.uid()), '[]'::jsonb),
    'confirmations', coalesce((select jsonb_agg(to_jsonb(c)) from public.report_confirmations c
      where c.user_id = auth.uid()), '[]'::jsonb),
    'notifications', coalesce((select jsonb_agg(to_jsonb(n)) from public.notifications n
      where n.user_id = auth.uid()), '[]'::jsonb),
    'exported_at', now()
  );
$$;

-- Erasure: personal identifiers removed, public infrastructure data retained anonymously.
-- Called only by the service role (trusted job); not exposed to clients.
create function public.anonymize_user(p_user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.reports set reporter_id = null where reporter_id = p_user_id;
  update public.report_confirmations set user_id = null where user_id = p_user_id;
  delete from public.device_tokens where user_id = p_user_id;
  delete from public.notifications where user_id = p_user_id;
  delete from public.profiles where id = p_user_id;  -- cascades roles/memberships
end $$;

-- ================================================================ device tokens
create function public.register_device_token(p_token text, p_platform text default 'android') returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'unauthenticated' using errcode = '28000'; end if;
  if char_length(p_token) not between 10 and 512 then
    raise exception 'invalid_token' using errcode = '22023';
  end if;
  -- a token belongs to exactly one user (handles shared/reinstalled devices)
  insert into public.device_tokens (user_id, token, platform) values (auth.uid(), p_token, p_platform)
  on conflict (token) do update set user_id = excluded.user_id, platform = excluded.platform, updated_at = now();
end $$;

-- ================================================================ admin helpers
-- Officers who could be assigned to a report (petugas of agencies covering it).
create function public.list_eligible_officers(p_report_id uuid)
returns table (user_id uuid, full_name text, agency_name text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_report_admin(p_report_id) then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
  select m.user_id, p.full_name, a.name
  from public.reports r
  join public.agencies a
    on a.jurisdiction_codes && array_remove(array[r.province_code, r.regency_code, r.district_code, r.village_code], null)
  join public.agency_memberships m on m.agency_id = a.id and m.member_role = 'petugas'
  join public.profiles p on p.id = m.user_id
  where r.id = p_report_id
  order by p.full_name;
end $$;

create function public.list_audit_logs(p_page integer default 1, p_page_size integer default 50) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_size integer := least(greatest(p_page_size, 1), 100);
begin
  if not public.has_role('super_admin') then raise exception 'forbidden' using errcode = '42501'; end if;
  return jsonb_build_object(
    'total', (select count(*) from public.admin_audit_logs),
    'page', greatest(p_page, 1), 'page_size', v_size,
    'rows', coalesce((select jsonb_agg(to_jsonb(x)) from (
      select l.id, l.created_at, l.action, l.table_name, l.record_id, l.old_value, l.new_value,
             l.actor_id, p.full_name as actor_name
      from public.admin_audit_logs l left join public.profiles p on p.id = l.actor_id
      order by l.created_at desc, l.id
      limit v_size offset (greatest(p_page, 1) - 1) * v_size) x), '[]'::jsonb));
end $$;

-- Adds an existing user (by email) to an agency and grants the matching role. Super admin only.
create function public.add_agency_member(p_agency_id uuid, p_email text, p_role public.app_role) returns void
language plpgsql security definer set search_path = '' as $$
declare v_user uuid;
begin
  if not public.has_role('super_admin') then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_role not in ('admin_daerah', 'petugas') then raise exception 'invalid_role' using errcode = '22023'; end if;
  select id into v_user from auth.users where lower(email) = lower(btrim(p_email));
  if v_user is null then raise exception 'user_not_found' using errcode = 'P0002'; end if;
  insert into public.agency_memberships (agency_id, user_id, member_role) values (p_agency_id, v_user, p_role)
  on conflict (agency_id, user_id) do update set member_role = excluded.member_role;
  insert into public.user_roles (user_id, role, granted_by) values (v_user, p_role, auth.uid())
  on conflict (user_id, role) do nothing;
end $$;

-- Coordinates + possible duplicates (same category within 100 m) for the admin detail page.
-- SECURITY INVOKER: RLS limits it to reports the caller may see.
create function public.report_context(p_report_id uuid) returns jsonb
language sql stable set search_path = public, extensions as $$
  select jsonb_build_object(
    'lat', st_y(r.location::geometry), 'lng', st_x(r.location::geometry),
    'duplicates', coalesce((
      select jsonb_agg(jsonb_build_object('id', d.id, 'title', d.title, 'status', d.status,
        'distance_m', round(st_distance(d.location, r.location)::numeric), 'created_at', d.created_at)
        order by st_distance(d.location, r.location))
      from reports d
      where d.id <> r.id and d.category = r.category and d.status <> 'ditolak'
        and st_dwithin(d.location, r.location, 100)), '[]'::jsonb))
  from reports r where r.id = p_report_id;
$$;

-- Storage objects older than p_min_age that no row references (failed uploads, rolled-back
-- reports). Used by the cleanup-storage Edge Function (service role only).
create function public.orphaned_storage_objects(p_min_age interval default interval '24 hours')
returns table (bucket text, name text)
language sql stable security definer set search_path = '' as $$
  select o.bucket_id, o.name from storage.objects o
  where o.created_at < now() - p_min_age
    and ((o.bucket_id = 'report-photos'
          and not exists (select 1 from public.report_photos ph where ph.storage_path = o.name))
      or (o.bucket_id = 'repair-evidence'
          and not exists (select 1 from public.repair_evidence e where e.storage_path = o.name)))
  limit 500;
$$;

-- ================================================================ function privileges
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p
           where p.pronamespace = 'public'::regnamespace loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
  end loop;
end $$;

-- helpers used inside RLS policies
grant execute on function
  public.has_role(public.app_role), public.is_report_admin(uuid), public.is_assigned_officer(uuid),
  public.can_manage_report(uuid), public.can_view_report(uuid), public.is_staff(),
  public.staff_can_view_profile(uuid), public.my_jurisdiction_codes()
to authenticated;

-- client-callable RPC
grant execute on function
  public.create_report(text, text, public.damage_category, double precision, double precision,
    public.severity_level, public.accessibility_impact, text, text, text, text, text, text, text, jsonb),
  public.change_report_status(uuid, public.report_status, text, public.report_status),
  public.assign_report(uuid, uuid),
  public.add_repair_evidence(uuid, public.evidence_kind, text, text, date),
  public.override_priority(uuid, public.priority_level, numeric, text),
  public.confirm_report(uuid, public.confirmation_type),
  public.nearby_reports(double precision, double precision, integer, integer, boolean),
  public.reports_in_bbox(double precision, double precision, double precision, double precision,
    public.damage_category[], public.severity_level[], public.report_status[], integer),
  public.admin_list_reports(text, public.report_status[], public.damage_category, public.severity_level,
    text, text, text, text, integer, integer),
  public.overview_stats(), public.regional_stats(smallint, text),
  public.report_context(uuid), public.list_eligible_officers(uuid), public.list_audit_logs(integer, integer),
  public.add_agency_member(uuid, text, public.app_role),
  public.grant_role(uuid, public.app_role), public.revoke_role(uuid, public.app_role),
  public.accept_consent(), public.request_account_deletion(), public.cancel_account_deletion(),
  public.export_my_data(), public.register_device_token(text, text)
to authenticated;

-- service role only (Edge Functions / trusted jobs)
grant execute on function public.anonymize_user(uuid), public.calculate_priority(uuid),
  public.orphaned_storage_objects(interval),
  public.queue_notification(uuid, text, text, text, jsonb, text, text) to service_role;
