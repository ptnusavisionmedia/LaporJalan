-- LaporJalan: Row Level Security.
-- Principle: clients get SELECT (filtered by RLS) plus a few narrowly-scoped writes.
-- Every privileged mutation goes through a SECURITY DEFINER RPC (see 000002).

-- Start from zero: no table privileges for anon, and none beyond what is granted below.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.agencies enable row level security;
alter table public.agency_memberships enable row level security;
alter table public.regions enable row level security;
alter table public.reports enable row level security;
alter table public.report_photos enable row level security;
alter table public.report_confirmations enable row level security;
alter table public.report_confirmation_events enable row level security;
alter table public.report_status_history enable row level security;
alter table public.repair_evidence enable row level security;
alter table public.report_assignments enable row level security;
alter table public.report_priority_scores enable row level security;
alter table public.notifications enable row level security;
alter table public.device_tokens enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.ai_analysis_results enable row level security;
alter table public.app_settings enable row level security;

-- ---------------------------------------------------------------- profiles
grant select on public.profiles to authenticated;
-- users can edit only these columns of their own profile (no id / consent / deletion flags)
grant update (full_name, phone, avatar_url, alert_radius_m, notification_prefs)
  on public.profiles to authenticated;
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.staff_can_view_profile(id));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- ---------------------------------------------------------------- user_roles (read-only for clients)
grant select on public.user_roles to authenticated;
create policy user_roles_select on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role('super_admin'));
-- No INSERT/UPDATE/DELETE policy: roles change only via grant_role()/revoke_role() or service role.

-- ---------------------------------------------------------------- agencies & memberships
grant select, insert, update, delete on public.agencies to authenticated;
create policy agencies_select on public.agencies for select to authenticated using (true);
create policy agencies_write on public.agencies for all to authenticated
  using (public.has_role('super_admin')) with check (public.has_role('super_admin'));

grant select, insert, update, delete on public.agency_memberships to authenticated;
create policy memberships_select on public.agency_memberships for select to authenticated
  using (user_id = auth.uid() or public.has_role('super_admin'));
create policy memberships_write on public.agency_memberships for all to authenticated
  using (public.has_role('super_admin')) with check (public.has_role('super_admin'));

-- ---------------------------------------------------------------- regions (reference data)
grant select on public.regions to authenticated;
create policy regions_select on public.regions for select to authenticated using (true);

-- ---------------------------------------------------------------- reports
-- Inserts go through create_report(). The owner may edit only descriptive fields, and only
-- while the report has not been verified. Status/visibility/priority are RPC-only.
grant select on public.reports to authenticated;
grant update (title, description, road_name, accessibility_impact) on public.reports to authenticated;
create policy reports_select on public.reports for select to authenticated
  using (reporter_id = auth.uid() or is_public or public.can_manage_report(id));
create policy reports_owner_update on public.reports for update to authenticated
  using (reporter_id = auth.uid() and status in ('diajukan', 'menunggu_verifikasi'))
  with check (reporter_id = auth.uid() and status in ('diajukan', 'menunggu_verifikasi'));

-- ---------------------------------------------------------------- photos & evidence
grant select on public.report_photos to authenticated;
create policy photos_select on public.report_photos for select to authenticated
  using (public.can_view_report(report_id));

grant select on public.repair_evidence to authenticated;
create policy evidence_select on public.repair_evidence for select to authenticated
  using (public.can_view_report(report_id));

-- ---------------------------------------------------------------- confirmations
grant select on public.report_confirmations to authenticated;
create policy confirmations_select on public.report_confirmations for select to authenticated
  using (public.can_view_report(report_id));
grant select on public.report_confirmation_events to authenticated;
create policy conf_events_select on public.report_confirmation_events for select to authenticated
  using (user_id = auth.uid() or public.is_report_admin(report_id));

-- ---------------------------------------------------------------- history, assignments, priority
grant select on public.report_status_history to authenticated;
create policy history_select on public.report_status_history for select to authenticated
  using (exists (select 1 from public.reports r where r.id = report_id and r.reporter_id = auth.uid())
         or public.can_manage_report(report_id));

grant select on public.report_assignments to authenticated;
create policy assignments_select on public.report_assignments for select to authenticated
  using (officer_id = auth.uid() or public.is_report_admin(report_id));

grant select on public.report_priority_scores to authenticated;
create policy priority_select on public.report_priority_scores for select to authenticated
  using (public.can_manage_report(report_id));

-- ---------------------------------------------------------------- notifications & device tokens
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
create policy notifications_select on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy notifications_mark_read on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, delete on public.device_tokens to authenticated;
create policy device_tokens_select on public.device_tokens for select to authenticated
  using (user_id = auth.uid());
create policy device_tokens_delete on public.device_tokens for delete to authenticated
  using (user_id = auth.uid());
-- registration goes through register_device_token()

-- ---------------------------------------------------------------- audit logs
grant select on public.admin_audit_logs to authenticated;
create policy audit_select on public.admin_audit_logs for select to authenticated
  using (public.has_role('super_admin'));
-- No write policies: rows are created only by SECURITY DEFINER functions/triggers,
-- and the enforce_immutable trigger blocks UPDATE/DELETE even for privileged roles.

-- ---------------------------------------------------------------- AI results
grant select on public.ai_analysis_results to authenticated;
create policy ai_select on public.ai_analysis_results for select to authenticated
  using (requested_by = auth.uid() or (report_id is not null and public.can_manage_report(report_id)));
-- Inserted by the analyze Edge Function with the service role.

-- ---------------------------------------------------------------- app settings
grant select, insert, update on public.app_settings to authenticated;
create policy settings_select on public.app_settings for select to authenticated
  using (public.is_staff());
create policy settings_write on public.app_settings for all to authenticated
  using (public.has_role('super_admin')) with check (public.has_role('super_admin'));

-- ================================================================ storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('report-photos', 'report-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('repair-evidence', 'repair-evidence', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- report-photos: <user_id>/<uuid>.<ext>. INSERT only: no UPDATE policy => no overwrites;
-- no DELETE policy => clients cannot remove evidence (cleanup runs with the service role).
create policy report_photos_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'report-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and name ~* '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'
  );

create function public.can_read_report_photo(p_path text) returns boolean
language sql stable security definer set search_path = '' as $$
  select (storage.foldername(p_path))[1] = auth.uid()::text
      or exists (select 1 from public.report_photos ph
                 where ph.storage_path = p_path and public.can_view_report(ph.report_id));
$$;
grant execute on function public.can_read_report_photo(text) to authenticated;

create policy report_photos_select on storage.objects for select to authenticated
  using (bucket_id = 'report-photos' and public.can_read_report_photo(name));

-- repair-evidence: <report_id>/<uuid>.<ext>, writable only by staff who manage that report.
create function public.can_write_evidence(p_path text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare v_report uuid;
begin
  begin
    v_report := ((storage.foldername(p_path))[1])::uuid;
  exception when others then
    return false;
  end;
  return public.can_manage_report(v_report);
end $$;
grant execute on function public.can_write_evidence(text) to authenticated;

create policy evidence_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'repair-evidence'
    and public.can_write_evidence(name)
    and name ~* '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'
  );
create policy evidence_select on storage.objects for select to authenticated
  using (
    bucket_id = 'repair-evidence'
    and exists (select 1 from public.repair_evidence e
                where e.storage_path = name and public.can_view_report(e.report_id))
    or (bucket_id = 'repair-evidence' and public.can_write_evidence(name))
  );
