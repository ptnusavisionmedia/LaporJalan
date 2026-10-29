-- LaporJalan: schema, enums, tables, indexes.
-- Authorization is NOT defined here; see 20260101000003_rls.sql.

create extension if not exists postgis with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------- enums
create type public.app_role as enum ('super_admin', 'admin_daerah', 'petugas', 'user');

create type public.report_status as enum (
  'diajukan', 'menunggu_verifikasi', 'terverifikasi', 'dalam_penanganan', 'selesai', 'ditolak'
);

create type public.damage_category as enum (
  'jalan_berlubang', 'jalan_retak', 'jalan_ambles', 'trotoar_rusak', 'trotoar_terhalang',
  'jalur_pemandu_rusak', 'akses_kursi_roda', 'drainase_rusak', 'lainnya'
);

create type public.severity_level as enum ('low', 'medium', 'high', 'critical');
create type public.accessibility_impact as enum ('none', 'low', 'medium', 'high');
create type public.confirmation_type as enum ('still_exists', 'repaired');
create type public.priority_level as enum ('rendah', 'sedang', 'tinggi', 'kritis');
create type public.evidence_kind as enum ('before', 'progress', 'after');

-- ---------------------------------------------------------------- tables
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 100),
  phone text check (phone is null or phone ~ '^\+?[0-9]{8,15}$'),
  avatar_url text,
  alert_radius_m integer not null default 500 check (alert_radius_m between 100 and 5000),
  notification_prefs jsonb not null default
    '{"status_updates": true, "nearby_alerts": false, "community": true}'::jsonb,
  consent_accepted_at timestamptz,
  deletion_requested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.app_role not null,
  granted_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create table public.agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 150),
  code text not null unique check (code ~ '^[A-Z0-9_-]{2,30}$'),
  -- Region codes (any level) this agency is responsible for.
  jurisdiction_codes text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.agency_memberships (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  member_role public.app_role not null check (member_role in ('admin_daerah', 'petugas')),
  created_at timestamptz not null default now(),
  unique (agency_id, user_id)
);

create table public.regions (
  code text primary key check (code ~ '^[0-9]{2}(\.[0-9]{2}(\.[0-9]{2}(\.[0-9]{4})?)?)?$'),
  name text not null,
  level smallint not null check (level between 1 and 4), -- 1 prov, 2 kab/kota, 3 kec, 4 desa
  parent_code text references public.regions (code)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  -- Null after account anonymisation (UU PDP erasure); reports are never deleted.
  reporter_id uuid references public.profiles (id) on delete set null,
  title text not null check (char_length(title) between 5 and 120),
  description text not null check (char_length(description) between 10 and 2000),
  category public.damage_category not null,
  severity public.severity_level not null default 'medium',
  accessibility_impact public.accessibility_impact not null default 'none',
  status public.report_status not null default 'diajukan',
  -- Location of the DAMAGE, never the reporter's own position.
  location extensions.geography(Point, 4326) not null,
  province_code text,
  regency_code text,
  district_code text,
  village_code text,
  road_name text check (road_name is null or char_length(road_name) <= 150),
  road_class text not null default 'tidak_diketahui'
    check (road_class in ('nasional', 'provinsi', 'kabupaten_kota', 'desa', 'lingkungan', 'tidak_diketahui')),
  is_public boolean not null default false,
  assigned_agency_id uuid references public.agencies (id) on delete set null,
  priority_score numeric(5, 2) check (priority_score between 0 and 100),
  priority_level public.priority_level,
  priority_overridden boolean not null default false,
  idempotency_key text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (reporter_id, idempotency_key)
);

create table public.report_photos (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete restrict,
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  size_bytes integer not null check (size_bytes between 1 and 10485760),
  width integer check (width > 0),
  height integer check (height > 0),
  created_at timestamptz not null default now()
);

create table public.report_confirmations (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete restrict,
  user_id uuid references public.profiles (id) on delete set null,
  type public.confirmation_type not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (report_id, user_id)
);

-- Audit trail of every confirmation and every change of mind (append-only).
create table public.report_confirmation_events (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete restrict,
  user_id uuid references public.profiles (id) on delete set null,
  old_type public.confirmation_type,
  new_type public.confirmation_type not null,
  created_at timestamptz not null default now()
);

create table public.report_status_history (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete restrict,
  from_status public.report_status,
  to_status public.report_status not null,
  changed_by uuid references public.profiles (id) on delete set null,
  note text check (note is null or char_length(note) <= 1000),
  created_at timestamptz not null default now()
);

create table public.repair_evidence (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete restrict,
  uploaded_by uuid references public.profiles (id) on delete set null,
  kind public.evidence_kind not null,
  storage_path text not null unique,
  note text check (note is null or char_length(note) <= 1000),
  repaired_at date,
  created_at timestamptz not null default now()
);

create table public.report_assignments (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete restrict,
  officer_id uuid references public.profiles (id) on delete set null,
  agency_id uuid references public.agencies (id) on delete set null,
  assigned_by uuid references public.profiles (id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.report_priority_scores (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete restrict,
  score numeric(5, 2) not null check (score between 0 and 100),
  level public.priority_level not null,
  factors jsonb not null default '{}'::jsonb,
  config_version text not null,
  is_override boolean not null default false,
  override_reason text check (not is_override or char_length(override_reason) >= 10),
  created_by uuid references public.profiles (id) on delete set null,
  calculated_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  data jsonb not null default '{}'::jsonb,
  dedupe_key text,
  read_at timestamptz,
  pushed_at timestamptz,
  push_attempts smallint not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, dedupe_key)
);

create table public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  token text not null unique,
  platform text not null default 'android' check (platform in ('android', 'ios')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  table_name text not null,
  record_id uuid,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

create table public.ai_analysis_results (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.reports (id) on delete restrict,
  requested_by uuid references public.profiles (id) on delete set null,
  predicted_category text not null,
  confidence numeric(5, 4) not null check (confidence between 0 and 1),
  severity_estimate public.severity_level,
  boxes jsonb not null default '[]'::jsonb,
  model_version text not null,
  created_at timestamptz not null default now()
);

-- Backend-configurable settings (priority weights, thresholds, ...).
create table public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- indexes
create index reports_location_gix on public.reports using gist (location);
create index reports_public_location_gix on public.reports using gist (location) where is_public;
create index reports_status_idx on public.reports (status);
create index reports_category_idx on public.reports (category);
create index reports_created_at_idx on public.reports (created_at desc);
create index reports_reporter_idx on public.reports (reporter_id, created_at desc);
create index reports_agency_idx on public.reports (assigned_agency_id);
create index reports_province_idx on public.reports (province_code);
create index reports_regency_idx on public.reports (regency_code);
create index reports_district_idx on public.reports (district_code);
create index reports_village_idx on public.reports (village_code);
create index reports_priority_idx on public.reports (priority_score desc nulls last);

create index report_photos_report_idx on public.report_photos (report_id);
create index confirmations_report_idx on public.report_confirmations (report_id);
create index conf_events_report_idx on public.report_confirmation_events (report_id);
create index status_history_report_idx on public.report_status_history (report_id, created_at);
create index repair_evidence_report_idx on public.repair_evidence (report_id);
create index assignments_report_idx on public.report_assignments (report_id) where active;
create index assignments_officer_idx on public.report_assignments (officer_id) where active;
create index priority_scores_report_idx on public.report_priority_scores (report_id, calculated_at desc);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index device_tokens_user_idx on public.device_tokens (user_id);
create index audit_logs_created_idx on public.admin_audit_logs (created_at desc);
create index audit_logs_record_idx on public.admin_audit_logs (table_name, record_id);
create index regions_parent_idx on public.regions (parent_code);
create index agencies_jurisdiction_gin on public.agencies using gin (jurisdiction_codes);
create index memberships_user_idx on public.agency_memberships (user_id);
create index user_roles_user_idx on public.user_roles (user_id);
