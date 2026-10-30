# LaporJalan

Aplikasi pelaporan jalan rusak.

| Bagian | Folder | Teknologi | Pengguna |
|---|---|---|---|
| Aplikasi mobile | `mobile/` | Expo (React Native) — dijalankan lewat **Expo Go** | Warga |
| Web admin | `admin/` | React + Vite | Admin |
| Database & auth & foto | `supabase/schema.sql` | Supabase | — |

**Fitur mobile:** daftar & login (username + password), foto kerusakan dari kamera/galeri, lokasi otomatis, feed semua laporan (seperti sosmed), suka & komentar, lihat status laporan + tanggapan admin, riwayat laporan sendiri.

**Fitur web admin:** login admin (username + password), ringkasan statistik, daftar semua laporan (cari + filter status), ubah status (menunggu / diproses / selesai / ditolak), beri tanggapan, hapus laporan & komentar, daftar pengguna.

---

## 1. Siapkan Supabase (sekali saja)

1. Buat project di <https://supabase.com>.
2. **SQL Editor** → New query → tempel isi `supabase/schema.sql` → **Run**.
   (Membuat tabel, aturan keamanan RLS, dan bucket foto `report-images`.)
3. **Authentication → Sign In / Providers → Email**: **matikan "Confirm email"**.
   Login pakai username dipetakan ke email internal `username@laporjalan.app`, jadi tidak ada email sungguhan yang bisa dikonfirmasi.
4. **Project Settings → API**: salin **Project URL** dan **anon public key**.

> Akun pengguna bisa dilihat di **Authentication → Users** (email `username@laporjalan.app`) dan tabel `profiles` di **Table Editor**.

### 1b. Jalankan migrasi fitur lanjutan

Setelah `schema.sql`, jalankan juga **`supabase/migration_02_fitur.sql`** di SQL Editor (aman diulang, data lama tidak hilang). Ini menambah kategori & aksesibilitas, prioritas otomatis, validasi komunitas, riwayat perbaikan, wilayah, dan role instansi.

### 1c. (Opsional) Aktifkan deteksi kerusakan AI

Tanpa langkah ini aplikasi tetap jalan; hanya saran AI yang tidak muncul.

```bash
npm i -g supabase
supabase login
supabase link --project-ref <ref-project-kamu>
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase functions deploy analyze-report
```

Fungsinya ada di `supabase/functions/analyze-report/`. Hasil AI hanya **saran** untuk pelapor dan bahan pertimbangan admin.

## 2. Buat akun admin

1. **Authentication → Users → Add user → Create new user**
   - Email: `admin@laporjalan.app`
   - Password: pilih sendiri
   - Centang **Auto Confirm User**
2. **SQL Editor**:
   ```sql
   update public.profiles set role = 'admin' where username = 'admin';
   ```
3. Login di web admin dengan username `admin` + password tadi.

(Admin lain: sama, dengan email `namabaru@laporjalan.app` lalu ubah `username`-nya di query.)

### Akun instansi

Instansi mendaftar seperti warga lewat aplikasi, lalu admin membuka web admin → **Pengguna & Instansi** → **Atur**, ubah peran jadi *instansi*, isi nama instansi dan wilayah kewenangan (misal tingkat *Kabupaten/Kota*, nama *Bandung*). Instansi hanya melihat dan mengelola laporan yang kolom wilayahnya sama dengan itu; admin melihat semuanya.

## 3. Jalankan web admin

```bash
cd admin
copy .env.example .env      # lalu isi URL & anon key
npm install
npm run dev                 # buka http://localhost:5173
```

## 4. Jalankan aplikasi mobile

```bash
cd mobile
copy .env.example .env      # lalu isi URL & anon key
npm install
npx expo start
```

Scan QR dengan **Expo Go** di HP (HP dan laptop harus satu Wi-Fi). Setelah mengubah `.env`, restart dengan `npx expo start -c`.

## Fitur lanjutan

| Fitur | Di mana |
|---|---|
| Peta kerusakan interaktif | Mobile tab **Peta** (OpenStreetMap, tanpa API key; marker per status), web admin menu **Peta** (OpenStreetMap) |
| Prioritas otomatis | Skor di database dari tingkat bahaya, lalu lintas, jumlah laporan ±80 m, konfirmasi warga, dukungan, kategori keselamatan. Laporan diurutkan dan diberi label Tinggi/Sedang/Rendah |
| Validasi komunitas | Detail laporan: tombol “Masih rusak” / “Sudah diperbaiki” |
| Peringatan area berbahaya | Banner + getar saat ≤200 m dari laporan berbahaya. **Hanya saat aplikasi terbuka** . Bisa dimatikan di tab Profil |
| Riwayat perbaikan | Timeline status otomatis; admin/instansi bisa menambah catatan + foto setelah perbaikan; tampil sebelum/sesudah di aplikasi |
| Aksesibilitas disabilitas | Jenis: trotoar terhalang, jalur pemandu rusak, akses kursi roda kurang (bonus prioritas) |
| Deteksi AI | Edge Function `analyze-report` (lihat 1c) |
| Statistik daerah | Mobile tab **Statistik**, web admin menu **Statistik Wilayah** (+ekspor CSV), per provinsi/kota/kecamatan/kelurahan |
| Pelacakan status | menunggu → diverifikasi → diproses → selesai / ditolak |
| Dashboard admin & instansi | Role `instansi` dengan wilayah kewenangan |

Wilayah laporan diisi dari reverse geocoding GPS HP. Hasilnya bisa tidak akurat untuk tingkat kecamatan/kelurahan, jadi pelapor dan admin bisa mengoreksinya.

## Build aplikasi (APK untuk dipasang di HP)

Perlu akun gratis di <https://expo.dev>. Di folder `mobile`:

```bash
npm install -g eas-cli
eas login
eas build -p android --profile preview
```

Jika proyek bukan repositori git, jalankan dulu `$env:EAS_NO_VCS=1` (PowerShell) atau `set EAS_NO_VCS=1` (CMD). Setelah build selesai (±10–20 menit), buka link/QR di HP, unduh APK, lalu pasang (izinkan "instal dari sumber tidak dikenal"). Perubahan kode butuh build baru agar masuk ke APK.

iOS tidak disertakan karena butuh akun Apple Developer berbayar.

Jika sebelumnya sempat menjalankan migrasi notifikasi, jalankan `supabase/migration_03_hapus_notifikasi.sql` untuk membersihkannya.
## Catatan

- Username: 3–20 karakter, huruf kecil / angka / `_`. Password minimal 6 karakter.
- Pengguna biasa tidak bisa mengubah status laporan (dijaga trigger + RLS di database); hanya admin.
- Akun admin tidak bisa dibuat dari aplikasi mobile, hanya lewat langkah di atas.
- Kunci `anon` memang publik; keamanan data bergantung pada RLS di `schema.sql`. Jangan pernah memakai `service_role` key di aplikasi ini.
