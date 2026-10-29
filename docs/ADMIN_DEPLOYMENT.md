# Deployment (ringkas, belum diverifikasi)

Tidak ada langkah di sini yang sudah dijalankan; tidak ada deployment yang dilakukan.

## Supabase

1. Jalankan migrasi berurutan, lalu `seed.sql`, lalu impor wilayah (lihat DATABASE.md).
2. Edge Functions:

```bash
supabase secrets set PUSH_INTERNAL_TOKEN=... AI_SERVICE_URL=... AI_SERVICE_INTERNAL_TOKEN=...
supabase functions deploy send-push
supabase functions deploy analyze
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` disediakan platform untuk fungsi; jangan dimasukkan ke klien.

3. Penjadwalan `send-push` (misalnya tiap menit): aktifkan `pg_cron` + `pg_net`, simpan token di Vault, lalu jadwalkan `net.http_post` ke URL fungsi dengan header `x-internal-token`. Alternatif: Database Webhook pada INSERT `notifications`. Fungsi mencoba ulang hingga 5 kali per notifikasi dan menghapus token yang sudah tidak terdaftar.

## Admin web (Next.js)

Variabel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Jangan pernah mengisi service-role key di hosting admin; aplikasi ini tidak memerlukannya.

`sharp` (pemrosesan foto bukti) adalah modul native: cocok untuk Node (Vercel, VPS, container). **Belum diverifikasi** pada Cloudflare Workers, yang tidak menjalankan modul native; jika memilih Workers, pindahkan pemrosesan gambar ke Edge Function atau layanan lain.

## Super admin pertama

Lihat README (SQL satu kali). Peran lain diberikan dari halaman Instansi & Anggota.
