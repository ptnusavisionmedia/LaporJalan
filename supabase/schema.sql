-- ============================================================
-- LaporJalan - skema database Supabase
-- Jalankan seluruh file ini di: Supabase Dashboard > SQL Editor
-- ============================================================

-- ---------- TABEL ----------

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text not null unique,
  role        text not null default 'user' check (role in ('user', 'admin')),
  created_at  timestamptz not null default now(),
  constraint username_format check (username ~ '^[a-z0-9_]{3,20}$')
);

create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  title       text not null check (char_length(title) between 3 and 120),
  description text not null default '',
  address     text not null default '',
  latitude    double precision,
  longitude   double precision,
  image_url   text not null,
  status      text not null default 'menunggu'
              check (status in ('menunggu', 'diproses', 'selesai', 'ditolak')),
  admin_note  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.likes (
  report_id   uuid not null references public.reports(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (report_id, user_id)
);

create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  report_id   uuid not null references public.reports(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 500),
  created_at  timestamptz not null default now()
);

create index if not exists reports_created_idx  on public.reports (created_at desc);
create index if not exists reports_user_idx     on public.reports (user_id);
create index if not exists comments_report_idx  on public.comments (report_id, created_at);

-- ---------- FUNGSI & TRIGGER ----------

-- Cek apakah user yang sedang login adalah admin.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- Buat profil otomatis setiap ada akun baru di auth.users.
-- Username diambil dari metadata signup (atau dari bagian depan email).
-- Role SELALU 'user' - admin ditetapkan manual lewat SQL.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, role)
  values (
    new.id,
    lower(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))),
    'user'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists reports_touch on public.reports;
create trigger reports_touch
  before update on public.reports
  for each row execute function public.touch_updated_at();

-- Pengguna biasa hanya boleh mengubah isi laporan miliknya, tidak boleh
-- mengubah status / catatan admin. Admin bebas.
create or replace function public.guard_report_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    new.status     = old.status;
    new.admin_note = old.admin_note;
    new.user_id    = old.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists reports_guard on public.reports;
create trigger reports_guard
  before update on public.reports
  for each row execute function public.guard_report_update();

-- ---------- ROW LEVEL SECURITY ----------

alter table public.profiles enable row level security;
alter table public.reports  enable row level security;
alter table public.likes    enable row level security;
alter table public.comments enable row level security;

-- profiles: semua user login boleh lihat (untuk nama di feed); tidak ada update dari client
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);

-- reports
drop policy if exists "reports_select" on public.reports;
create policy "reports_select" on public.reports
  for select to authenticated using (true);

drop policy if exists "reports_insert" on public.reports;
create policy "reports_insert" on public.reports
  for insert to authenticated with check (user_id = auth.uid() and status = 'menunggu');

drop policy if exists "reports_update" on public.reports;
create policy "reports_update" on public.reports
  for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "reports_delete" on public.reports;
create policy "reports_delete" on public.reports
  for delete to authenticated using (user_id = auth.uid() or public.is_admin());

-- likes
drop policy if exists "likes_select" on public.likes;
create policy "likes_select" on public.likes
  for select to authenticated using (true);

drop policy if exists "likes_insert" on public.likes;
create policy "likes_insert" on public.likes
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "likes_delete" on public.likes;
create policy "likes_delete" on public.likes
  for delete to authenticated using (user_id = auth.uid());

-- comments
drop policy if exists "comments_select" on public.comments;
create policy "comments_select" on public.comments
  for select to authenticated using (true);

drop policy if exists "comments_insert" on public.comments;
create policy "comments_insert" on public.comments
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "comments_delete" on public.comments;
create policy "comments_delete" on public.comments
  for delete to authenticated using (user_id = auth.uid() or public.is_admin());

-- ---------- STORAGE (foto laporan) ----------

insert into storage.buckets (id, name, public)
values ('report-images', 'report-images', true)
on conflict (id) do nothing;

drop policy if exists "report_images_read" on storage.objects;
create policy "report_images_read" on storage.objects
  for select using (bucket_id = 'report-images');

drop policy if exists "report_images_upload" on storage.objects;
create policy "report_images_upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'report-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "report_images_delete" on storage.objects;
create policy "report_images_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'report-images'
         and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- ============================================================
-- MEMBUAT AKUN ADMIN
-- 1. Supabase Dashboard > Authentication > Users > Add user > Create new user
--      Email    : admin@laporjalan.app
--      Password : (pilih sendiri)
--      Centang "Auto Confirm User"
-- 2. Jalankan SQL berikut:
--
--   update public.profiles set role = 'admin' where username = 'admin';
--
-- Login di web admin cukup dengan username "admin" + password tadi.
-- ============================================================
