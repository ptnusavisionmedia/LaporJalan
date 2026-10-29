# LaporJalan

Platform pelaporan kerusakan infrastruktur jalan di Indonesia.

| Bagian | Teknologi | Lokasi |
|---|---|---|
| Aplikasi warga (Android) | React Native, Expo SDK 58, Expo Router, NativeWind | `apps/mobile` |
| Dasbor admin (web) | Next.js 16 (App Router), Tailwind | `apps/admin-web` |
| Backend | Supabase (Postgres + PostGIS, Auth, Storage, RLS) | `supabase/` |
| Skema bersama | Zod + konstanta | `packages/shared` |
| Layanan AI | FastAPI (tanpa bobot model) | `services/ai-service` |

## Status (jujur)

Lihat [docs/PRODUCTION_CHECKLIST.md](docs/PRODUCTION_CHECKLIST.md) untuk tabel status dan laporan kesiapan. Ringkasnya, **semua fase kode (1-6) sudah ditulis dan lulus pemeriksaan statis/build, tetapi belum ada alur yang dijalankan end-to-end dan belum siap produksi.**

## Prasyarat

- Node.js 20+ (diuji pada 24), npm 10+
- Proyek Supabase (gratis cukup untuk pengembangan) atau Supabase CLI + Docker
- Aplikasi **Expo Go** (versi yang mendukung SDK 58) di ponsel Android

## Instalasi

```bash
npm install
cp .env.example apps/mobile/.env          # isi EXPO_PUBLIC_*
cp .env.example apps/admin-web/.env.local # isi NEXT_PUBLIC_*
```

`SUPABASE_SERVICE_ROLE_KEY`, `AI_SERVICE_INTERNAL_TOKEN`, dan `FCM_SERVICE_ACCOUNT_JSON` hanya untuk Edge Functions / server. **Jangan pernah** memberi awalan `EXPO_PUBLIC_` atau `NEXT_PUBLIC_`.

## Menyiapkan database

1. Di dashboard Supabase: Database -> Extensions, pastikan `postgis` dapat diaktifkan.
2. Jalankan berurutan isi `supabase/migrations/*.sql`, lalu `supabase/seed.sql` (SQL Editor atau `supabase db push`).
3. Buat super admin pertama secara manual (satu kali, lewat SQL Editor - tidak ada jalur dari aplikasi):

```sql
insert into public.user_roles (user_id, role)
select id, 'super_admin' from auth.users where email = 'email-anda@example.com';
```

## Menjalankan

```bash
npm run mobile   # lalu pindai QR dengan Expo Go
npm run admin    # http://localhost:3000
```

## Pemeriksaan

```bash
npm run typecheck
npm test
```

Dokumen: [ARCHITECTURE](docs/ARCHITECTURE.md), [DATABASE](docs/DATABASE.md), [API](docs/API.md), [SECURITY](docs/SECURITY.md), [EXPO_GO](docs/EXPO_GO.md), [ANDROID_BUILD](docs/ANDROID_BUILD.md), [ADMIN_DEPLOYMENT](docs/ADMIN_DEPLOYMENT.md), [AI_SERVICE](docs/AI_SERVICE.md), [TESTING](docs/TESTING.md), [INCIDENT_RESPONSE](docs/INCIDENT_RESPONSE.md), [DATA_RETENTION](docs/DATA_RETENTION.md).
