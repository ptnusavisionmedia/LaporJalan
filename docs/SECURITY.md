# Keamanan & privasi

## Model otorisasi

- Peran: `super_admin`, `admin_daerah`, `petugas`, `user` (tabel `user_roles`).
- Peran **tidak pernah** dibaca dari metadata pengguna. Trigger `handle_new_user` hanya memberi `user`. Peran lain hanya lewat `grant_role()` (super admin) atau service role.
- Klien hanya punya `SELECT` (disaring RLS) dan beberapa `UPDATE` kolom terbatas. Semua mutasi berhak istimewa lewat fungsi `SECURITY DEFINER` (`search_path = ''`) yang memeriksa peran/yurisdiksi.
- Perubahan status, riwayat, audit, dan notifikasi terjadi dalam satu transaksi (satu fungsi), dengan `FOR UPDATE` dan `p_expected_from` untuk konkurensi.
- `report_status_history`, `admin_audit_logs`, `report_confirmation_events`, `report_priority_scores` bersifat append-only (trigger `enforce_immutable`).
- Konfirmasi komunitas tidak pernah mengubah `reports.status`.

## Rahasia

Hanya `EXPO_PUBLIC_*` / `NEXT_PUBLIC_*` (anon key) yang boleh ada di klien. `SUPABASE_SERVICE_ROLE_KEY`, token layanan AI, dan kredensial FCM hanya di Edge Functions / server. `.env*` masuk `.gitignore`.

## Foto

Bucket privat, batas 5 MB, hanya JPEG/PNG/WebP, nama berkas UUID, tanpa kebijakan UPDATE/DELETE (tidak dapat ditimpa atau dihapus klien). Penghapusan EXIF dilakukan di klien dengan re-encode (`expo-image-manipulator`) - **belum diimplementasikan**.

## Lokasi

Koordinat laporan adalah lokasi kerusakan, terpisah dari posisi pengguna. Izin lokasi hanya foreground; tanpa pelacakan latar belakang.

## UU PDP (UU No. 27 Tahun 2022)

Tersedia di database: `accept_consent()`, `export_my_data()` (hak akses), `request_account_deletion()` / `anonymize_user()` (penghapusan: identitas dilepas, data infrastruktur publik dipertahankan secara anonim).

**Belum ada dan memerlukan tinjauan hukum**: Kebijakan Privasi, Syarat Layanan, kebijakan retensi, prosedur respons insiden, dasar pemrosesan, penunjukan pengendali/prosesor data. Dokumen ini tidak menyatakan kepatuhan hukum.
