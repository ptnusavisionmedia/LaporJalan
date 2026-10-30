-- ============================================================
-- LaporJalan - migrasi v2 (fitur lanjutan)
-- Jalankan SETELAH schema.sql, di Supabase Dashboard > SQL Editor.
-- Aman dijalankan ulang (idempotent) dan tidak menghapus data lama.
--
-- Isi: kategori + aksesibilitas, tingkat bahaya & lalu lintas, wilayah,
--      prioritas otomatis, validasi komunitas, riwayat/timeline perbaikan,
--      role "instansi" dengan wilayah kewenangan, hasil analisis AI.
-- ============================================================

-- ---------- PROFILES: role instansi + wilayah kewenangan ----------

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('user', 'admin', 'instansi'));

alter table public.profiles add column if not exists agency_name text;
alter table public.profiles add column if not exists scope_level text not null default 'nasional';
alter table public.profiles add column if not exists scope_value text;

alter table public.profiles drop constraint if exists profiles_scope_level_check;
alter table public.profiles add constraint profiles_scope_level_check
  check (scope_level in ('nasional', 'provinsi', 'kota', 'kecamatan', 'kelurahan'));

-- ---------- REPORTS: kolom baru ----------

alter table public.reports add column if not exists category text not null default 'jalan_rusak';
alter table public.reports drop constraint if exists reports_category_check;
alter table public.reports add constraint reports_category_check check (category in (
  'jalan_berlubang', 'jalan_rusak', 'trotoar_rusak', 'area_berbahaya',
  'trotoar_terhalang', 'jalur_pemandu_rusak', 'akses_kursi_roda'
));

-- tingkat bahaya: 1 ringan, 2 sedang, 3 berat
alter table public.reports add column if not exists severity smallint not null default 2;
alter table public.reports drop constraint if exists reports_severity_check;
alter table public.reports add constraint reports_severity_check check (severity between 1 and 3);

alter table public.reports add column if not exists traffic text not null default 'sedang';
alter table public.reports drop constraint if exists reports_traffic_check;
alter table public.reports add constraint reports_traffic_check check (traffic in ('rendah', 'sedang', 'tinggi'));

alter table public.reports add column if not exists province text not null default '';
alter table public.reports add column if not exists city     text not null default '';
alter table public.reports add column if not exists district text not null default '';
alter table public.reports add column if not exists village  text not null default '';

-- hasil analisis AI (opsional, diisi dari Edge Function analyze-report)
alter table public.reports add column if not exists ai_category   text;
alter table public.reports add column if not exists ai_severity   smallint;
alter table public.reports add column if not exists ai_confidence real;
alter table public.reports add column if not exists ai_summary    text;

alter table public.reports add column if not exists priority_score numeric not null default 0;

-- status baru: menunggu -> diverifikasi -> diproses -> selesai | ditolak
alter table public.reports drop constraint if exists reports_status_check;
alter table public.reports add constraint reports_status_check
  check (status in ('menunggu', 'diverifikasi', 'diproses', 'selesai', 'ditolak'));

create index if not exists reports_priority_idx on public.reports (priority_score desc);
create index if not exists reports_geo_idx      on public.reports (latitude, longitude);

-- ---------- TABEL BARU ----------

-- Validasi komunitas: "masih rusak" atau "sudah diperbaiki"
create table if not exists public.validations (
  report_id     uuid not null references public.reports(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  still_damaged boolean not null,
  created_at    timestamptz not null default now(),
  primary key (report_id, user_id)
);

-- Riwayat penanganan (timeline) + dokumentasi foto sebelum/sesudah
create table if not exists public.report_updates (
  id         uuid primary key default gen_random_uuid(),
  report_id  uuid not null references public.reports(id) on delete cascade,
  actor_id   uuid references public.profiles(id) on delete set null,
  kind       text not null check (kind in ('status', 'progress', 'after')),
  status     text,
  note       text not null default '',
  photo_url  text,
  created_at timestamptz not null default now()
);
create index if not exists report_updates_report_idx on public.report_updates (report_id, created_at);

-- ---------- FUNGSI AKSES ----------

-- Admin (nasional) atau instansi yang wilayahnya mencakup laporan ini.
create or replace function public.can_manage_report(rid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles p
    join public.reports r on r.id = rid
    where p.id = auth.uid()
      and (
        p.role = 'admin'
        or (p.role = 'instansi' and (
              p.scope_level = 'nasional'
           or (p.scope_level = 'provinsi'  and lower(r.province) = lower(coalesce(p.scope_value, '')))
           or (p.scope_level = 'kota'      and lower(r.city)     = lower(coalesce(p.scope_value, '')))
           or (p.scope_level = 'kecamatan' and lower(r.district) = lower(coalesce(p.scope_value, '')))
           or (p.scope_level = 'kelurahan' and lower(r.village)  = lower(coalesce(p.scope_value, '')))
        ))
      )
  );
$$;

-- ---------- PRIORITAS OTOMATIS ----------
-- Skor = tingkat bahaya + kepadatan lalu lintas + jumlah laporan di sekitar
--        + konfirmasi "masih rusak" + dukungan (suka) - konfirmasi "sudah diperbaiki"
--        + bonus kategori keselamatan/aksesibilitas. Selesai/ditolak = 0.

create or replace function public.calc_priority(r public.reports)
returns numeric
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  still  int := 0;
  fixed  int := 0;
  lk     int := 0;
  nearby int := 0;
  score  numeric;
begin
  if r.status in ('selesai', 'ditolak') then
    return 0;
  end if;

  select count(*) filter (where still_damaged), count(*) filter (where not still_damaged)
    into still, fixed
    from public.validations where report_id = r.id;

  select count(*) into lk from public.likes where report_id = r.id;

  if r.latitude is not null and r.longitude is not null then
    select count(*) into nearby
      from public.reports o
     where o.id <> r.id
       and o.latitude is not null and o.longitude is not null
       and abs(o.latitude  - r.latitude)  < 0.0007   -- kira-kira 80 meter
       and abs(o.longitude - r.longitude) < 0.0007
       and o.status not in ('selesai', 'ditolak');
  end if;

  score := r.severity * 20
         + case r.traffic when 'tinggi' then 20 when 'sedang' then 10 else 0 end
         + least(nearby, 10) * 4
         + least(still, 10) * 3
         + least(lk, 20) * 0.5
         - least(fixed, 10) * 4
         + case when r.category in ('area_berbahaya', 'trotoar_terhalang', 'jalur_pemandu_rusak', 'akses_kursi_roda')
                then 8 else 0 end;

  return greatest(round(score, 1), 0);
end;
$$;

create or replace function public.reports_set_priority()
returns trigger
language plpgsql
as $$
begin
  new.priority_score := public.calc_priority(new);
  return new;
end;
$$;

drop trigger if exists reports_priority on public.reports;
create trigger reports_priority
  before insert or update on public.reports
  for each row execute function public.reports_set_priority();

-- Laporan baru / berpindah / berubah status -> hitung ulang laporan di sekitarnya.
create or replace function public.reports_refresh_neighbors()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if pg_trigger_depth() > 1 or new.latitude is null or new.longitude is null then
    return null;
  end if;
  update public.reports o set title = o.title
   where o.id <> new.id
     and o.latitude is not null and o.longitude is not null
     and abs(o.latitude  - new.latitude)  < 0.0007
     and abs(o.longitude - new.longitude) < 0.0007;
  return null;
end;
$$;

drop trigger if exists reports_neighbors on public.reports;
create trigger reports_neighbors
  after insert or update of latitude, longitude, status on public.reports
  for each row execute function public.reports_refresh_neighbors();

-- Suka / validasi berubah -> hitung ulang prioritas laporannya.
create or replace function public.touch_report_priority()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.reports set title = title where id = coalesce(new.report_id, old.report_id);
  return null;
end;
$$;

drop trigger if exists likes_priority on public.likes;
create trigger likes_priority
  after insert or delete on public.likes
  for each row execute function public.touch_report_priority();

drop trigger if exists validations_priority on public.validations;
create trigger validations_priority
  after insert or update or delete on public.validations
  for each row execute function public.touch_report_priority();

-- ---------- GUARD & TIMELINE ----------

-- updated_at hanya berubah bila isi laporan benar-benar berubah (bukan karena suka).
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  if row(new.status, new.admin_note, new.title, new.description, new.image_url)
     is distinct from row(old.status, old.admin_note, old.title, old.description, old.image_url) then
    new.updated_at = now();
  end if;
  return new;
end;
$$;

-- Pelapor biasa tidak boleh mengubah status, catatan admin, atau wilayah.
-- Admin dan instansi yang berwenang boleh.
create or replace function public.guard_report_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if pg_trigger_depth() = 1 and not public.can_manage_report(old.id) then
    new.status     = old.status;
    new.admin_note = old.admin_note;
    new.user_id    = old.user_id;
    new.province   = old.province;
    new.city       = old.city;
    new.district   = old.district;
    new.village    = old.village;
    new.ai_category   = old.ai_category;
    new.ai_severity   = old.ai_severity;
    new.ai_confidence = old.ai_confidence;
    new.ai_summary    = old.ai_summary;
  end if;
  return new;
end;
$$;

-- Catat otomatis setiap perubahan status ke timeline.
create or replace function public.log_report_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.report_updates (report_id, actor_id, kind, status, note)
    values (new.id, new.user_id, 'status', 'menunggu', 'Laporan diajukan');
  elsif new.status is distinct from old.status then
    insert into public.report_updates (report_id, actor_id, kind, status, note)
    values (new.id, auth.uid(), 'status', new.status, coalesce(new.admin_note, ''));
  end if;
  return null;
end;
$$;

drop trigger if exists reports_log_status on public.reports;
create trigger reports_log_status
  after insert or update of status on public.reports
  for each row execute function public.log_report_status();

-- ---------- RLS ----------

alter table public.validations    enable row level security;
alter table public.report_updates enable row level security;

drop policy if exists "validations_select" on public.validations;
create policy "validations_select" on public.validations
  for select to authenticated using (true);
drop policy if exists "validations_insert" on public.validations;
create policy "validations_insert" on public.validations
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "validations_update" on public.validations;
create policy "validations_update" on public.validations
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "validations_delete" on public.validations;
create policy "validations_delete" on public.validations
  for delete to authenticated using (user_id = auth.uid());

drop policy if exists "updates_select" on public.report_updates;
create policy "updates_select" on public.report_updates
  for select to authenticated using (true);
drop policy if exists "updates_insert" on public.report_updates;
create policy "updates_insert" on public.report_updates
  for insert to authenticated
  with check (actor_id = auth.uid() and public.can_manage_report(report_id));
drop policy if exists "updates_delete" on public.report_updates;
create policy "updates_delete" on public.report_updates
  for delete to authenticated using (public.is_admin());

-- reports: admin & instansi (sesuai wilayah) boleh mengubah
drop policy if exists "reports_update" on public.reports;
create policy "reports_update" on public.reports
  for update to authenticated
  using (user_id = auth.uid() or public.can_manage_report(id))
  with check (user_id = auth.uid() or public.can_manage_report(id));

-- profiles: hanya admin yang boleh mengubah role / wilayah akun lain
drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin" on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- BACKFILL DATA LAMA ----------

insert into public.report_updates (report_id, actor_id, kind, status, note, created_at)
select r.id, r.user_id, 'status', 'menunggu', 'Laporan diajukan', r.created_at
from public.reports r
where not exists (select 1 from public.report_updates u where u.report_id = r.id);

update public.reports set title = title;  -- hitung ulang prioritas

-- ============================================================
-- MEMBUAT AKUN INSTANSI
-- 1. Instansi mendaftar lewat aplikasi mobile (atau Add user di dashboard).
-- 2. Admin membuka web admin > menu Pengguna > ubah role jadi "instansi"
--    dan isi wilayah kewenangannya. Atau lewat SQL:
--
--   update public.profiles
--      set role = 'instansi', agency_name = 'Dinas PU Kota Bandung',
--          scope_level = 'kota', scope_value = 'Bandung'
--    where username = 'dinaspu_bandung';
-- ============================================================
