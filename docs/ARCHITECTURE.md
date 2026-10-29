# Arsitektur

```
 Aplikasi Android (Expo)  ─┐                      ┌─ Postgres + PostGIS (RLS, RPC)
 Dasbor admin (Next.js)   ─┼─ anon key + JWT ───► Supabase ── Auth ── Storage (bucket privat)
                           │                      └─ Edge Functions ─► FastAPI (AI), Expo Push
```

- **Satu backend**: Supabase. Tidak ada server API tambahan; kontrak logis di API.md dipetakan ke PostgREST/RPC/Edge Function.
- **Batas kepercayaan**: klien hanya memegang anon key. Semua otorisasi di Postgres (RLS + fungsi `SECURITY DEFINER` yang memeriksa peran dan yurisdiksi). Pemeriksaan di UI/proxy hanya kenyamanan.
- **Monorepo** (`npm workspaces`): `apps/mobile`, `apps/admin-web`, `packages/shared` (skema Zod, konstanta, klaster/jarak), `supabase/`, `services/ai-service`.
- **Keputusan penting**
  - Mutasi berhak istimewa hanya lewat RPC atomik (status + riwayat + audit + notifikasi dalam satu transaksi, `FOR UPDATE` + `p_expected_from`).
  - Tabel riwayat/audit append-only (trigger), konfirmasi komunitas tidak pernah mengubah status resmi.
  - Peta: query bbox PostGIS (indeks GiST), maks 300 titik, klaster sisi klien.
  - Push lewat layanan push Expo (FCM dikonfigurasi di EAS) agar kredensial FCM tidak ada di aplikasi/repo.
  - AI di belakang Edge Function agar token internal tak sampai ke klien; aplikasi tetap berfungsi tanpa AI.

## Batas free tier (verifikasi di halaman harga resmi sebelum mengandalkan)

Angka berubah; jangan dianggap pasti. Yang perlu dipantau:

| Sumber daya | Risiko |
|---|---|
| Database (ukuran, koneksi) | Foto TIDAK disimpan di DB, tetapi riwayat/audit tumbuh terus |
| Storage | Dominan: 1 foto terkompres \~0,2-0,5 MB; 5 foto/laporan. Hitung `laporan/bulan x 5 x 0,35 MB` |
| Bandwidth/egress | Foto dimuat lewat signed URL tiap kali dibuka; pertimbangkan thumbnail/CDN |
| Edge Function invocations | `send-push` terjadwal tiap menit = 43k/bulan sendiri |
| MAU Auth | batas pengguna aktif bulanan |
| Proyek free dapat dijeda bila tidak aktif | tidak cocok untuk produksi |
| Ubin peta OSM publik | dilarang untuk beban produksi besar; perlu penyedia ubin |
| Inferensi AI | CPU/GPU berbayar; belum ada biaya terukur karena tanpa model |

Strategi naik kelas: (1) Supabase Pro + PITR sebelum peluncuran publik, (2) thumbnail + CDN untuk foto, (3) penyedia ubin berbayar/self-host, (4) AI di instance terpisah dengan antrean, (5) read replica / materialized view untuk statistik wilayah bila `regional_stats` melambat, (6) partisi `admin_audit_logs` per bulan.

## Kinerja basis data

Indeks sudah dibuat untuk lokasi (GiST, termasuk parsial `is_public`), status, kategori, kode wilayah, tanggal, instansi. Daftar admin dipaginasi di server. **Belum ada** pengukuran nyata atau pemantauan query lambat (aktifkan `pg_stat_statements` / Query Performance di Supabase setelah ada data).
