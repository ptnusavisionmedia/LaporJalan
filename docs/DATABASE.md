# Database

Migrasi di `supabase/migrations/` (urutan nama berkas):

1. `..01_schema.sql` - ekstensi, enum, tabel, indeks (GiST pada `reports.location`, indeks status/kategori/wilayah/tanggal/instansi).
2. `..02_functions.sql` - trigger, helper otorisasi, RPC, query geografis, statistik, hak akses fungsi.
3. `..03_rls.sql` - RLS, grant kolom, bucket dan kebijakan storage.

## RPC utama

`create_report`, `change_report_status`, `assign_report`, `add_repair_evidence`, `override_priority`, `confirm_report`, `nearby_reports`, `reports_in_bbox`, `admin_list_reports` (paginasi sisi server), `overview_stats`, `regional_stats`, `grant_role`, `export_my_data`, `register_device_token`.

## Skor prioritas

Konfigurasi di `app_settings('priority_config')`. Bobot awal 35/15/15/20/15 (keparahan, konfirmasi, kelas jalan, aksesibilitas, usia) adalah **asumsi, belum divalidasi**. Faktor lalu lintas nonaktif; bila nanti aktif tanpa data, bobot dinormalisasi ulang (tidak dianggap nol).

## Mengimpor data wilayah

Seed hanya berisi 38 provinsi. Tidak ada data kab/kota/kecamatan/desa yang disertakan: ambil daftar resmi Kemendagri/BPS (periksa lisensinya), simpan sebagai CSV `kode,nama` (mis. `32.73,Kota Bandung`), lalu:

```bash
node supabase/scripts/import-regions.mjs wilayah.csv > supabase/regions-import.sql
```

Skrip memvalidasi format kode, duplikat, dan induk yang hilang (keluar dengan kode 1 bila ada kesalahan), menurunkan `level`/`parent_code` dari kode, dan menghasilkan SQL idempoten (`on conflict do update`). Jalankan hasilnya di SQL Editor setelah `seed.sql`. Aplikasi mobile otomatis menampilkan tingkat yang datanya sudah ada.

`create_report` menolak kode wilayah yang tidak ada atau rantainya tidak konsisten (`invalid_region`).

## Status

Migrasi **belum dieksekusi** di Postgres mana pun (lihat PRODUCTION_CHECKLIST).
