# Status implementasi

Legenda: **Teruji** = dijalankan dan lulus; **Ditulis** = kode ada tetapi belum dijalankan terhadap layanan nyata; **Belum** = belum dibuat.

## Fase 1 - Fondasi

| Item | Status | Bukti |
|---|---|---|
| Monorepo npm workspaces | Teruji | `npm install` berhasil |
| Paket `@laporjalan/shared` (Zod + konstanta) | Teruji | 6/6 tes `node --test` lulus; `tsc --noEmit` bersih |
| Mobile: Expo SDK 58 + Router + NativeWind | Teruji (build) | `expo export --platform android` menghasilkan bundle Hermes 8 MB; `tsc --noEmit` bersih. **Belum dilihat di perangkat/Expo Go** |
| Admin: Next.js 16 | Teruji (build) | `next build` sukses termasuk pengecekan TypeScript. Belum dijalankan dengan Supabase sungguhan |
| shadcn/ui, Recharts, TanStack Table | Belum | paket terpasang, komponen belum dipakai |
| ESLint/Prettier konsisten di seluruh repo | Belum | hanya bawaan scaffold Next |

## Fase 2 - Database & autentikasi

| Item | Status | Catatan |
|---|---|---|
| Migrasi skema (16 tabel + `report_confirmation_events`, `app_settings`) | Ditulis | **Belum dieksekusi**: tidak ada Postgres/Docker di mesin pengembangan ini |
| Fungsi RPC, trigger audit/imutabel, skor prioritas | Ditulis | idem |
| Kebijakan RLS & storage | Ditulis | idem. Wajib diuji (lihat bawah) |
| Login/registrasi mobile | Ditulis | belum diuji dengan Supabase nyata |
| Login admin + `requireStaff()` | Ditulis | belum diuji dengan Supabase nyata |
| Lupa/reset password, onboarding, edit profil | Belum | |

### Tes keamanan yang HARUS dijalankan sebelum dipakai

Pada Supabase lokal/uji, dengan tiga pengguna (warga A, warga B, admin daerah) dan satu super admin:

1. Warga tidak dapat `update reports set status = ...` langsung (harus ditolak: tidak ada grant kolom).
2. Warga tidak dapat `insert into user_roles` (tidak ada policy).
3. Warga B tidak dapat `confirm_report` untuk laporan miliknya sendiri, dan tidak bisa dua kali (upsert, satu baris).
4. Admin daerah luar yurisdiksi mendapat `forbidden` pada `change_report_status`.
5. `update`/`delete` pada `report_status_history` dan `admin_audit_logs` gagal, juga untuk `service_role`.
6. Unggah ke `report-photos/<uid-lain>/...` ditolak; menimpa objek yang sudah ada ditolak.
7. Dua `change_report_status` bersamaan dengan `p_expected_from` yang sama: salah satu mendapat `status_conflict`.
8. `status_transition_allowed` mengembalikan benar untuk pasangan yang sah (perbandingan baris enum dengan literal belum diverifikasi di Postgres).

## Fase 3 - Pelaporan mobile

Semua item di bawah **Ditulis** (lulus `tsc` dan bundle Android 4030 modul), **belum diuji** di Expo Go/perangkat maupun terhadap Supabase.

| Item | Status | Catatan |
|---|---|---|
| Alur lapor 5 langkah + sukses | Ditulis | kategori, foto, detail, lokasi, tinjau; kunci idempotensi per formulir |
| Kamera/galeri, kompres 1600px JPEG 0.7, validasi tipe/ukuran | Ditulis | re-encode menghapus EXIF - perlu diverifikasi pada berkas nyata |
| Unggah ke bucket privat + RPC `create_report` | Ditulis | foto yatim bila RPC gagal: belum ada pembersihan otomatis |
| GPS foreground dengan penjelasan + koreksi manual | Ditulis | koreksi manual lewat input koordinat; **tidak ada peta pemilih titik** (menunggu Fase 5) |
| Pemilih wilayah bertingkat (provinsi > kab/kota > kecamatan > desa) | Ditulis | tingkat ditampilkan hanya bila datanya ada di `regions`; **belum ada data kab/kota sampai Anda mengimpornya** |
| Skrip impor wilayah `supabase/scripts/import-regions.mjs` | Teruji | dijalankan pada berkas contoh: SQL benar (kutip, apostrof), berkas rusak ditolak (kode tidak valid, ganda, induk hilang). **Belum diuji dengan data resmi atau di Postgres** |
| Validasi wilayah di `create_report` | Ditulis | belum dieksekusi |
| Beranda (sapaan, statistik, sekitar, terbaru) | Ditulis | "pratinjau peta" dan "aktivitas komunitas" belum ada |
| Riwayat laporan (paginasi tak hingga) + detail + linimasa + foto bertanda tangan | Ditulis | |
| Dokumentasi perbaikan sebelum/sesudah | Ditulis | menunggu unggahan dari admin (Fase 4) |
| Validasi komunitas di detail | Ditulis | RPC `confirm_report`; tombol hanya untuk laporan publik milik orang lain |
| Profil: hitungan, keluar, ajukan penghapusan akun | Ditulis | pemrosesan penghapusan belum ada |
| Layar offline / jaringan tidak stabil | Belum | hanya status error + coba lagi |

## Fase 4 - Dasbor admin

Dibangun dan lulus `tsc` + `next build` (12 rute). Uji runtime hanya: halaman login tampil (200) dan 5 rute terlindungi mengalihkan tamu ke /login (307). **Tidak ada yang diuji dengan Supabase nyata atau dengan akun staf.**

| Item | Status | Catatan |
|---|---|---|
| Layout (sidebar, header, keluar) responsif | Ditulis | tanpa breadcrumb, pencarian global, notifikasi, pengalih tema (tema mengikuti sistem) |
| Dasbor: kartu + grafik Recharts (tren bulanan, kategori) | Ditulis | dari RPC `overview_stats`; "laporan per wilayah" ada di Statistik Wilayah, "aktivitas terbaru" belum |
| Tabel laporan: cari, filter, urut, paginasi sisi server | Ditulis | RPC `admin_list_reports`; juga 4 halaman status |
| Detail: foto, koordinat, duplikat ≤100 m, riwayat | Ditulis | |
| Verifikasi/tolak/ubah status + catatan | Ditulis | RPC atomik, konkurensi optimistik `p_expected_from` |
| Penugasan petugas | Ditulis | RPC `list_eligible_officers` + `assign_report` |
| Unggah bukti perbaikan | Ditulis | MIME dicek, isi gambar didekode `sharp`, di-encode ulang JPEG (EXIF dibuang), maks 8 MB |
| Override prioritas + alasan + riwayat | Ditulis | |
| Statistik wilayah 4 tingkat (drill-down) | Ditulis | |
| Instansi & anggota (super admin) | Ditulis | menambah anggota hanya untuk email yang sudah mendaftar |
| Log audit (super admin) | Ditulis | |
| Peta pemantauan, halaman Prioritas, Petugas, Pengguna, Notifikasi, Pengaturan | **Belum** | |
| shadcn/ui, TanStack Table/Query | Belum | UI memakai Tailwind biasa; paket terpasang tapi tak dipakai |
| Otorisasi per peran di UI | Ditulis | UI hanya menyembunyikan; penegakan ada di RPC/RLS (belum diuji) |
| Pembersihan foto bukti yatim | Belum | klien tak punya hak DELETE |

## Fase 5 - Fitur lanjutan

Teruji: bundle Android (4142 modul) dan `next build` berhasil; `tsc` bersih; 5 tes klaster/jarak di paket shared lulus (total 11/11). Sisanya **Ditulis, belum dijalankan**.

| Item | Status | Catatan |
|---|---|---|
| Peta mobile: ubin OSM, marker berwarna, klaster, filter keparahan/selesai, kartu pratinjau, "lokasi saya" | Ditulis | belum dilihat di perangkat; ubin OSM publik hanya untuk dev. Tanpa pencarian wilayah |
| Query bbox + batas 300 + debounce | Ditulis | RPC belum dieksekusi |
| Validasi komunitas | Ditulis (Fase 3) | |
| Skor prioritas + override + riwayat | Ditulis | halaman admin `/priorities`; bobot asumsi awal |
| Peringatan area berbahaya (foreground) + radius + dedup 24 jam + preferensi | Ditulis | **latar belakang/geofencing: tidak ada** |
| Daftar notifikasi dalam aplikasi + tandai dibaca | Ditulis | tanpa Realtime (muat ulang manual) |
| Registrasi token push + refresh | Ditulis | hanya development build |
| Edge Function `send-push` (retry, bersihkan token mati, log) | Ditulis | belum di-deploy/diuji; jadwal harus diatur sendiri |
| Layanan AI FastAPI + Edge Function `analyze` + UI saran | Ditulis | **tes Python belum dijalankan; tidak ada bobot model** sehingga selalu `model_unavailable` |
| Penurunan mulus saat AI mati | Ditulis | pesan + pelaporan tetap jalan |
| Peta admin, halaman Petugas/Pengguna/Notifikasi/Pengaturan | **Belum** | |
| Notifikasi "bahaya dekat" berbasis server | **Belum** | hanya peringatan lokal di aplikasi |
| Perbaikan aksesibilitas khusus (formulir disabilitas terpisah) | Sebagian | kategori aksesibilitas menaikkan dampak otomatis; tanpa formulir khusus |

## Fase 6 - Persiapan produksi

| Item | Status | Catatan |
|---|---|---|
| Tinjauan kode migrasi SQL (baca menyeluruh) | Selesai | tidak ditemukan cacat nyata; **ini bukan eksekusi** |
| Suite keamanan/alur SQL `supabase/tests/security.sql` (71 pemeriksaan) | Ditulis, **belum dijalankan** | skrip sendiri bisa mengandung bug; sempat saya perbaiki 3 bug saat meninjau ulang |
| Tes AI `test_api.py` (11) | Ditulis, **belum dijalankan** | tak ada Python |
| Lint admin, expo-doctor, typecheck 3 paket, bundle Android, build admin | **Teruji, lulus** | lint mobile belum diset (`expo lint` butuh konfigurasi ESLint) |
| `npm audit --omit=dev` | 3 tinggi, 5 rendah | seluruhnya di rantai perkakas Expo CLI (zod bersarang, deepmerge); bukan kode yang dikirim ke aplikasi; perbaikan otomatis = turun versi Expo (breaking), tidak diterapkan |
| `cleanup-storage` (foto yatim) dan `process-deletions` (hapus akun setelah masa tunggu) | Ditulis, belum diuji | perlu dijadwalkan sendiri |
| Draf Kebijakan Privasi & Syarat Layanan (layar dalam aplikasi), retensi, respons insiden | Draf | **[ISI] harus dilengkapi dan ditinjau penasihat hukum**; tidak ada klaim kepatuhan UU PDP |
| Dokumen: README, ARCHITECTURE, DATABASE, API, SECURITY, EXPO_GO, ANDROID_BUILD, ADMIN_DEPLOYMENT, AI_SERVICE, TESTING, checklist ini | Ditulis | |
| Konfigurasi EAS (`eas.json`, `app.config.ts`) | Siap, **belum dibangun** | butuh akun Expo + `EAS_PROJECT_ID` + keystore |
| APK / AAB | **Tidak ada** | tidak ada build yang dibuat |
| Deployment admin | **Tidak dilakukan** | |
| Profil kinerja, pengujian beban, pemantauan query lambat | Belum | |
| Tes e2e / komponen | Belum | |
| Aksesibilitas | Sebagian | label, peran, target sentuh 48dp ada; belum diuji dengan TalkBack/pembaca layar atau audit kontras |
| Mode gelap mobile | Sebagian | kelas `dark:` dipakai di banyak tempat, belum ditinjau visual; tanpa pengalih manual |
| Layar mobile yang diminta tetapi belum ada | Belum | Splash/Onboarding kustom, Forgot/Reset Password, Edit Profile, Settings terpisah, Report History terpisah (digabung di Aktivitas), Regional Statistics di mobile |

## Laporan kesiapan produksi

**Belum siap produksi.** Kode untuk sebagian besar alur inti sudah ada dan lulus pemeriksaan statis, tetapi *tidak ada* alur yang pernah dijalankan end-to-end terhadap Supabase, perangkat, atau layanan AI.

Pemblokir sebelum rilis (urutan disarankan):

1. Terapkan migrasi di proyek Supabase uji dan jalankan `supabase/tests/security.sql`; perbaiki semua kegagalan (skema atau skrip).
2. Impor data wilayah resmi (kab/kota dst.) dan buat super admin pertama.
3. Uji alur lengkap di Expo Go lalu development build pada perangkat Android nyata: daftar -> lapor (foto, GPS) -> verifikasi di admin -> notifikasi -> bukti perbaikan -> selesai.
4. Ganti ubin OSM publik; putuskan hosting admin (modul native `sharp` vs Cloudflare Workers).
5. Lengkapi dan tinjau secara hukum kebijakan privasi/ToS/retensi/respons insiden; isi Data Safety Play Store.
6. Layar yang belum ada (reset password, edit profil, onboarding) dan uji aksesibilitas.
7. Jika AI ingin dipakai: dapatkan bobot model dengan lisensi yang jelas (paket `ultralytics` AGPL), evaluasi akurasinya pada data Indonesia; sampai itu, fitur AI tetap nonaktif secara jujur.
8. Buat build EAS (preview APK lalu AAB), jadwalkan `send-push`, `cleanup-storage`, `process-deletions`.
9. Tinjau ulang bobot/ambang prioritas bersama pemangku kepentingan; saat ini hanya asumsi.

## Daftar periksa rilis

- [ ] Migrasi diterapkan; `security.sql` lulus penuh
- [ ] Wilayah diimpor; super admin pertama dibuat; instansi + anggota dibuat
- [ ] Email konfirmasi Supabase Auth dikonfigurasi (SMTP sendiri untuk produksi) dan templat berbahasa Indonesia
- [ ] Variabel lingkungan hanya berisi kunci publik di klien; service-role hanya di fungsi
- [ ] Fungsi Edge dideploy + rahasia diatur + dijadwalkan
- [ ] Ubin peta berlisensi sesuai
- [ ] Draf hukum dilengkapi dan ditinjau
- [ ] Uji perangkat Android nyata (kamera, GPS, push, jaringan buruk)
- [ ] Pencadangan basis data / PITR aktif
- [ ] Build AAB ditandatangani EAS; track internal Play lebih dahulu

## Batasan yang diketahui

- `reporter_id` laporan publik dapat dibaca pengguna terautentikasi (UUID pseudonim; profil tetap privat). Jalur peta/terdekat tidak mengembalikannya.
- Data wilayah baru tingkat provinsi; kabupaten/kota/kecamatan/desa harus diimpor dari data resmi.
- Bobot dan ambang prioritas bersifat asumsi awal, belum divalidasi.
- Python tidak terpasang di mesin ini, sehingga layanan AI belum bisa dijalankan atau diuji di sini.
