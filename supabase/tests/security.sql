-- LaporJalan security & workflow tests. NOT YET EXECUTED by the authors: no Postgres was available.
--
-- Run against a THROWAWAY database after migrations + seed.sql:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/security.sql
-- (or paste into the Supabase SQL editor). Everything runs in one transaction that is rolled
-- back at the end, and the script aborts with a list of failures if any test fails.
begin;

create temp table test_results (name text, ok boolean, detail text);

-- Become an authenticated user for the next statement(s), exactly as PostgREST does.
create function pg_temp.act_as(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', jsonb_build_object('sub', p_uid::text, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;

-- t(name, user, sql, expect, rows): user NULL = run as the owner role.
--   expect NULL  => the statement must succeed (and, if rows is given, touch/return exactly
--                   that many rows; rows = -1 means "at least one")
--   expect text  => the statement must fail with a message containing it
create function pg_temp.t(p_name text, p_user uuid, p_sql text, p_expect text default null, p_rows integer default null)
returns void language plpgsql as $$
declare v_err text; v_n integer;
begin
  begin
    if p_user is not null then perform pg_temp.act_as(p_user); end if;
    execute p_sql;
    get diagnostics v_n = row_count;
  exception when others then
    v_err := sqlerrm;
  end;
  execute 'reset role';
  if p_expect is null then
    if v_err is null and p_rows is not null then
      insert into test_results values (p_name, case when p_rows = -1 then v_n >= 1 else v_n = p_rows end,
        'rows=' || v_n || ' expected=' || p_rows);
    else
      insert into test_results values (p_name, v_err is null, coalesce(v_err, 'ok'));
    end if;
  else
    insert into test_results values (p_name, v_err ilike '%' || p_expect || '%', coalesce(v_err, 'NO ERROR (expected: ' || p_expect || ')'));
  end if;
end $$;

create function pg_temp.assert_true(p_name text, p_ok boolean) returns void language plpgsql as $$
begin
  insert into test_results values (p_name, coalesce(p_ok, false), case when coalesce(p_ok, false) then 'ok' else 'condition false' end);
end $$;

-- ------------------------------------------------------------------ fixtures (as owner)
insert into public.regions (code, name, level, parent_code) values
  ('32.73', 'Kota Uji A', 2, '32'), ('32.77', 'Kota Uji B', 2, '32') on conflict do nothing;

insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-000000000001', 'alice@test.local'),
  ('a0000000-0000-0000-0000-000000000002', 'bob@test.local'),
  ('a0000000-0000-0000-0000-000000000003', 'admin-a@test.local'),
  ('a0000000-0000-0000-0000-000000000004', 'admin-b@test.local'),
  ('a0000000-0000-0000-0000-000000000005', 'officer@test.local'),
  ('a0000000-0000-0000-0000-000000000006', 'super@test.local');

insert into public.agencies (id, name, code, jurisdiction_codes) values
  ('b0000000-0000-0000-0000-00000000000a', 'Instansi A', 'AGA', '{32.73}'),
  ('b0000000-0000-0000-0000-00000000000b', 'Instansi B', 'AGB', '{32.77}');
insert into public.user_roles (user_id, role) values
  ('a0000000-0000-0000-0000-000000000003', 'admin_daerah'),
  ('a0000000-0000-0000-0000-000000000004', 'admin_daerah'),
  ('a0000000-0000-0000-0000-000000000005', 'petugas'),
  ('a0000000-0000-0000-0000-000000000006', 'super_admin');
insert into public.agency_memberships (agency_id, user_id, member_role) values
  ('b0000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-000000000003', 'admin_daerah'),
  ('b0000000-0000-0000-0000-00000000000b', 'a0000000-0000-0000-0000-000000000004', 'admin_daerah'),
  ('b0000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-000000000005', 'petugas');

select pg_temp.assert_true('trigger membuat profil + peran user',
  (select count(*) from public.user_roles where user_id = 'a0000000-0000-0000-0000-000000000001' and role = 'user') = 1);

-- ------------------------------------------------------------------ user capabilities
select pg_temp.t('alice membuat laporan', 'a0000000-0000-0000-0000-000000000001', $q$
  select set_config('t.rid', public.create_report(
    'Lubang besar di jalan', 'Lubang dalam di tengah jalan raya', 'jalan_berlubang', -6.9, 107.6,
    'high', 'none', '32', '32.73', null, null, 'Jl. Uji', 'kabupaten_kota', 'key-1',
    '[{"storage_path":"a0000000-0000-0000-0000-000000000001/11111111-1111-1111-1111-111111111111.jpg","mime_type":"image/jpeg","size_bytes":1000}]'::jsonb
  )::text, false)$q$);

select pg_temp.assert_true('skor prioritas dihitung otomatis',
  (select priority_score is not null from public.reports where id = current_setting('t.rid')::uuid));
select pg_temp.assert_true('riwayat status awal tercatat',
  (select count(*) from public.report_status_history where report_id = current_setting('t.rid')::uuid) = 1);

select pg_temp.t('idempoten: kunci sama = laporan sama', 'a0000000-0000-0000-0000-000000000001', $q$
  select 1/(case when public.create_report('x judul uji', 'deskripsi uji panjang', 'jalan_berlubang', -6.9, 107.6,
    'high', 'none', '32', '32.73', null, null, null, null, 'key-1',
    '[{"storage_path":"a0000000-0000-0000-0000-000000000001/22222222-2222-2222-2222-222222222222.jpg","mime_type":"image/jpeg","size_bytes":1}]'::jsonb
  ) = current_setting('t.rid')::uuid then 1 else 0 end)$q$);

select pg_temp.t('lokasi di luar Indonesia ditolak', 'a0000000-0000-0000-0000-000000000001', $q$
  select public.create_report('judul uji ok', 'deskripsi uji panjang', 'jalan_berlubang', 40.0, -74.0,
    'high', 'none', '32', null, null, null, null, null, 'key-2',
    '[{"storage_path":"a0000000-0000-0000-0000-000000000001/33333333-3333-3333-3333-333333333333.jpg","mime_type":"image/jpeg","size_bytes":1}]'::jsonb)$q$,
  'location_outside_indonesia');

select pg_temp.t('wilayah tidak konsisten ditolak', 'a0000000-0000-0000-0000-000000000001', $q$
  select public.create_report('judul uji ok', 'deskripsi uji panjang', 'jalan_berlubang', -6.9, 107.6,
    'high', 'none', '32', '32.99', null, null, null, null, 'key-3',
    '[{"storage_path":"a0000000-0000-0000-0000-000000000001/44444444-4444-4444-4444-444444444444.jpg","mime_type":"image/jpeg","size_bytes":1}]'::jsonb)$q$,
  'invalid_region');

select pg_temp.t('path foto milik orang lain ditolak', 'a0000000-0000-0000-0000-000000000001', $q$
  select public.create_report('judul uji ok', 'deskripsi uji panjang', 'jalan_berlubang', -6.9, 107.6,
    'high', 'none', '32', null, null, null, null, null, 'key-4',
    '[{"storage_path":"a0000000-0000-0000-0000-000000000002/55555555-5555-5555-5555-555555555555.jpg","mime_type":"image/jpeg","size_bytes":1}]'::jsonb)$q$,
  'invalid_photo_path');

-- ------------------------------------------------------------------ privilege escalation / direct writes
select pg_temp.t('warga tidak bisa insert langsung ke reports', 'a0000000-0000-0000-0000-000000000001',
  $q$insert into public.reports (title, description, category, location) values ('abcde','abcdefghij','lainnya', 'SRID=4326;POINT(107 -6)')$q$,
  'permission denied');
select pg_temp.t('warga tidak bisa ubah status langsung', 'a0000000-0000-0000-0000-000000000001',
  $q$update public.reports set status = 'selesai' where id = current_setting('t.rid')::uuid$q$, 'permission denied');
select pg_temp.t('warga tidak bisa set is_public', 'a0000000-0000-0000-0000-000000000001',
  $q$update public.reports set is_public = true where id = current_setting('t.rid')::uuid$q$, 'permission denied');
select pg_temp.t('warga boleh ubah judul laporan sendiri', 'a0000000-0000-0000-0000-000000000001',
  $q$update public.reports set title = 'Judul baru yang valid' where id = current_setting('t.rid')::uuid$q$);
select pg_temp.t('warga lain tidak bisa ubah judul', 'a0000000-0000-0000-0000-000000000002', $q$update public.reports set title = 'dibajak oleh bob' where id = current_setting('t.rid')::uuid$q$, null, 0);
select pg_temp.t('warga tidak bisa insert user_roles', 'a0000000-0000-0000-0000-000000000001',
  $q$insert into public.user_roles (user_id, role) values ('a0000000-0000-0000-0000-000000000001', 'super_admin')$q$, 'permission denied');
select pg_temp.t('warga tidak bisa grant_role', 'a0000000-0000-0000-0000-000000000001',
  $q$select public.grant_role('a0000000-0000-0000-0000-000000000001', 'super_admin')$q$, 'forbidden');
select pg_temp.t('warga tidak bisa menulis audit log', 'a0000000-0000-0000-0000-000000000001',
  $q$insert into public.admin_audit_logs (action, table_name) values ('x','y')$q$, 'permission denied');
select pg_temp.t('warga tidak membaca audit log', 'a0000000-0000-0000-0000-000000000001', $q$select 1 from public.admin_audit_logs$q$, null, 0);
select pg_temp.t('warga tidak bisa menjalankan calculate_priority', 'a0000000-0000-0000-0000-000000000001',
  $q$select public.calculate_priority(current_setting('t.rid')::uuid)$q$, 'permission denied');

-- ------------------------------------------------------------------ visibility
select pg_temp.t('bob belum melihat laporan alice (belum publik)', 'a0000000-0000-0000-0000-000000000002', $q$select 1 from public.reports where id = current_setting('t.rid')::uuid$q$, null, 0);
select pg_temp.t('bob tidak bisa konfirmasi laporan tak publik', 'a0000000-0000-0000-0000-000000000002',
  $q$select public.confirm_report(current_setting('t.rid')::uuid, 'still_exists')$q$, 'report_not_available');
select pg_temp.t('admin instansi B tidak melihat laporan wilayah A', 'a0000000-0000-0000-0000-000000000004', $q$select 1 from public.reports where id = current_setting('t.rid')::uuid$q$, null, 0);
select pg_temp.t('admin instansi A melihat laporan wilayahnya', 'a0000000-0000-0000-0000-000000000003', $q$select 1 from public.reports where id = current_setting('t.rid')::uuid$q$, null, 1);

-- ------------------------------------------------------------------ status workflow
select pg_temp.t('admin luar yurisdiksi: forbidden', 'a0000000-0000-0000-0000-000000000004',
  $q$select public.change_report_status(current_setting('t.rid')::uuid, 'terverifikasi', null, null)$q$, 'forbidden');
select pg_temp.t('warga tidak bisa ubah status via RPC', 'a0000000-0000-0000-0000-000000000001',
  $q$select public.change_report_status(current_setting('t.rid')::uuid, 'terverifikasi', null, null)$q$, 'forbidden');
select pg_temp.t('transisi tidak sah ditolak', 'a0000000-0000-0000-0000-000000000003',
  $q$select public.change_report_status(current_setting('t.rid')::uuid, 'selesai', null, null)$q$, 'invalid_transition');
select pg_temp.t('konflik status (expected_from salah)', 'a0000000-0000-0000-0000-000000000003',
  $q$select public.change_report_status(current_setting('t.rid')::uuid, 'terverifikasi', null, 'menunggu_verifikasi')$q$, 'status_conflict');
select pg_temp.t('penolakan wajib catatan', 'a0000000-0000-0000-0000-000000000003',
  $q$select public.change_report_status(current_setting('t.rid')::uuid, 'ditolak', '', null)$q$, 'rejection_note_required');
select pg_temp.t('admin A memverifikasi', 'a0000000-0000-0000-0000-000000000003',
  $q$select public.change_report_status(current_setting('t.rid')::uuid, 'terverifikasi', 'ok', 'diajukan')$q$);

select pg_temp.assert_true('verifikasi membuat laporan publik',
  (select is_public from public.reports where id = current_setting('t.rid')::uuid));
select pg_temp.assert_true('riwayat + audit atomik (2 riwayat, 1 audit status)',
  (select count(*) from public.report_status_history where report_id = current_setting('t.rid')::uuid) = 2
  and (select count(*) from public.admin_audit_logs where action = 'status_change' and record_id = current_setting('t.rid')::uuid) = 1);
select pg_temp.assert_true('notifikasi terverifikasi masuk ke alice',
  exists (select 1 from public.notifications where user_id = 'a0000000-0000-0000-0000-000000000001' and type = 'report_verified'));

-- ------------------------------------------------------------------ community validation
select pg_temp.t('bob mengonfirmasi', 'a0000000-0000-0000-0000-000000000002',
  $q$select public.confirm_report(current_setting('t.rid')::uuid, 'still_exists')$q$);
select pg_temp.t('bob mengonfirmasi lagi (tidak ganda)', 'a0000000-0000-0000-0000-000000000002',
  $q$select public.confirm_report(current_setting('t.rid')::uuid, 'still_exists')$q$);
select pg_temp.t('bob mengubah pendapat', 'a0000000-0000-0000-0000-000000000002',
  $q$select public.confirm_report(current_setting('t.rid')::uuid, 'repaired')$q$);
select pg_temp.t('alice tidak bisa validasi laporan sendiri', 'a0000000-0000-0000-0000-000000000001',
  $q$select public.confirm_report(current_setting('t.rid')::uuid, 'still_exists')$q$, 'cannot_confirm_own_report');
select pg_temp.assert_true('satu baris konfirmasi per pengguna + 2 peristiwa audit',
  (select count(*) from public.report_confirmations where report_id = current_setting('t.rid')::uuid) = 1
  and (select count(*) from public.report_confirmation_events where report_id = current_setting('t.rid')::uuid) = 2);
select pg_temp.assert_true('konfirmasi komunitas tidak mengubah status resmi',
  (select status = 'terverifikasi' from public.reports where id = current_setting('t.rid')::uuid));
select pg_temp.t('bob dapat melihat laporan publik', 'a0000000-0000-0000-0000-000000000002', $q$select 1 from public.reports where id = current_setting('t.rid')::uuid$q$, null, 1);
select pg_temp.t('nearby_reports menemukan laporan publik', 'a0000000-0000-0000-0000-000000000002', $q$select 1 from public.nearby_reports(-6.9, 107.6, 500, 10, false)$q$, null, 1);
select pg_temp.t('reports_in_bbox menemukan laporan di area', 'a0000000-0000-0000-0000-000000000002', $q$select 1 from public.reports_in_bbox(107.5, -7.0, 107.7, -6.8)$q$, null, 1);
select pg_temp.t('reports_in_bbox kosong di area lain', 'a0000000-0000-0000-0000-000000000002', $q$select 1 from public.reports_in_bbox(110, -3, 111, -2)$q$, null, 0);

-- ------------------------------------------------------------------ assignment, officer, completion
select pg_temp.t('petugas belum ditugaskan tidak bisa mengubah status', 'a0000000-0000-0000-0000-000000000005',
  $q$select public.change_report_status(current_setting('t.rid')::uuid, 'dalam_penanganan', null, null)$q$, 'forbidden');
select pg_temp.t('admin menugaskan petugas', 'a0000000-0000-0000-0000-000000000003',
  $q$select public.assign_report(current_setting('t.rid')::uuid, 'a0000000-0000-0000-0000-000000000005')$q$);
select pg_temp.t('admin B tidak bisa menugaskan', 'a0000000-0000-0000-0000-000000000004',
  $q$select public.assign_report(current_setting('t.rid')::uuid, 'a0000000-0000-0000-0000-000000000005')$q$, 'forbidden');
select pg_temp.t('petugas memulai penanganan', 'a0000000-0000-0000-0000-000000000005',
  $q$select public.change_report_status(current_setting('t.rid')::uuid, 'dalam_penanganan', null, null)$q$);
select pg_temp.t('petugas tidak boleh menyatakan selesai', 'a0000000-0000-0000-0000-000000000005',
  $q$select public.change_report_status(current_setting('t.rid')::uuid, 'selesai', null, null)$q$, 'forbidden_transition');
select pg_temp.t('selesai tanpa foto sesudah ditolak', 'a0000000-0000-0000-0000-000000000003',
  $q$select public.change_report_status(current_setting('t.rid')::uuid, 'selesai', null, null)$q$, 'after_evidence_required');
select pg_temp.t('petugas mengunggah bukti', 'a0000000-0000-0000-0000-000000000005', format(
  $q$select public.add_repair_evidence(%L::uuid, 'after', %L)$q$, current_setting('t.rid'), current_setting('t.rid') || '/66666666-6666-6666-6666-666666666666.jpg'));
select pg_temp.t('path bukti salah ditolak', 'a0000000-0000-0000-0000-000000000005',
  $q$select public.add_repair_evidence(current_setting('t.rid')::uuid, 'after', 'lain/x.jpg')$q$, 'invalid_evidence_path');
select pg_temp.t('admin menyatakan selesai', 'a0000000-0000-0000-0000-000000000003',
  $q$select public.change_report_status(current_setting('t.rid')::uuid, 'selesai', null, null)$q$);
select pg_temp.assert_true('resolved_at terisi', (select resolved_at is not null from public.reports where id = current_setting('t.rid')::uuid));

-- ------------------------------------------------------------------ priority override
select pg_temp.t('override prioritas tanpa alasan ditolak', 'a0000000-0000-0000-0000-000000000003',
  $q$select public.override_priority(current_setting('t.rid')::uuid, 'kritis', 90, 'pendek')$q$, 'override_reason_required');
select pg_temp.t('admin override prioritas', 'a0000000-0000-0000-0000-000000000003',
  $q$select public.override_priority(current_setting('t.rid')::uuid, 'kritis', 90, 'Dekat sekolah dasar, risiko tinggi')$q$);
select pg_temp.t('admin B tidak bisa override', 'a0000000-0000-0000-0000-000000000004',
  $q$select public.override_priority(current_setting('t.rid')::uuid, 'rendah', 5, 'alasan cukup panjang sekali')$q$, 'forbidden');

-- ------------------------------------------------------------------ immutability (even for the owner role)
select pg_temp.t('riwayat status tidak bisa diubah', null,
  $q$update public.report_status_history set note = 'x'$q$, 'tidak dapat diubah');
select pg_temp.t('riwayat status tidak bisa dihapus', null,
  $q$delete from public.report_status_history$q$, 'tidak dapat diubah');
select pg_temp.t('audit log tidak bisa diubah', null, $q$update public.admin_audit_logs set action = 'x'$q$, 'tidak dapat diubah');
select pg_temp.t('audit log tidak bisa dihapus', null, $q$delete from public.admin_audit_logs$q$, 'tidak dapat diubah');
select pg_temp.t('skor prioritas tidak bisa diubah', null, $q$update public.report_priority_scores set score = 1$q$, 'tidak dapat diubah');

-- ------------------------------------------------------------------ super admin
select pg_temp.t('super admin melihat audit log', 'a0000000-0000-0000-0000-000000000006', $q$select 1 from public.admin_audit_logs$q$, null, -1);
select pg_temp.t('admin_daerah tidak melihat audit log', 'a0000000-0000-0000-0000-000000000003', $q$select 1 from public.admin_audit_logs$q$, null, 0);
select pg_temp.t('super admin grant_role', 'a0000000-0000-0000-0000-000000000006',
  $q$select public.grant_role('a0000000-0000-0000-0000-000000000002', 'petugas')$q$);
select pg_temp.assert_true('grant_role tercatat di audit', exists (select 1 from public.admin_audit_logs where table_name = 'user_roles' and action = 'INSERT'));
select pg_temp.t('super admin tidak bisa mencabut dirinya', 'a0000000-0000-0000-0000-000000000006',
  $q$select public.revoke_role('a0000000-0000-0000-0000-000000000006', 'super_admin')$q$, 'cannot_revoke_own_super_admin');

-- ------------------------------------------------------------------ storage
select pg_temp.t('alice unggah ke folder sendiri', 'a0000000-0000-0000-0000-000000000001', $q$
  insert into storage.objects (bucket_id, name, owner) values ('report-photos',
    'a0000000-0000-0000-0000-000000000001/77777777-7777-7777-7777-777777777777.jpg', 'a0000000-0000-0000-0000-000000000001')$q$);
select pg_temp.t('alice tidak bisa unggah ke folder orang lain', 'a0000000-0000-0000-0000-000000000001', $q$
  insert into storage.objects (bucket_id, name, owner) values ('report-photos',
    'a0000000-0000-0000-0000-000000000002/88888888-8888-8888-8888-888888888888.jpg', 'a0000000-0000-0000-0000-000000000001')$q$, 'row-level security');
select pg_temp.t('nama berkas tidak aman ditolak', 'a0000000-0000-0000-0000-000000000001', $q$
  insert into storage.objects (bucket_id, name, owner) values ('report-photos',
    'a0000000-0000-0000-0000-000000000001/../../evil.php', 'a0000000-0000-0000-0000-000000000001')$q$, 'row-level security');
select pg_temp.t('alice tidak bisa menimpa/mengubah objek', 'a0000000-0000-0000-0000-000000000001', $q$update storage.objects set name = name where bucket_id = 'report-photos'$q$, null, 0);
select pg_temp.t('alice tidak bisa menghapus objek', 'a0000000-0000-0000-0000-000000000001', $q$delete from storage.objects where bucket_id = 'report-photos'$q$, null, 0);
select pg_temp.t('bob tidak melihat foto laporan tak publik milik alice', 'a0000000-0000-0000-0000-000000000002', $q$select 1 from storage.objects where bucket_id = 'report-photos'
    and name like 'a0000000-0000-0000-0000-000000000001/%'$q$, null, 0);

-- ------------------------------------------------------------------ privacy
select pg_temp.t('export_my_data hanya data sendiri', 'a0000000-0000-0000-0000-000000000002', $q$select 1 from jsonb_array_elements(public.export_my_data() -> 'reports')$q$, null, 0);

-- ------------------------------------------------------------------ report
select name, ok, detail from test_results order by ok, name;
do $$
declare n_fail int; n_all int;
begin
  select count(*) filter (where not ok), count(*) into n_fail, n_all from test_results;
  raise notice 'LaporJalan security tests: % of % passed', n_all - n_fail, n_all;
  if n_fail > 0 then
    raise exception '% test(s) FAILED - see the table above', n_fail;
  end if;
end $$;

rollback;
