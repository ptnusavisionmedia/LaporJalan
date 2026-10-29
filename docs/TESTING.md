# Pengujian

## Yang sudah dijalankan (mesin pengembangan Windows, tanpa Postgres/Python/perangkat)

| Pemeriksaan | Perintah | Hasil |
|---|---|---|
| Tes unit shared (skema, klaster, jarak) | `npm test -w packages/shared` | 11/11 lulus |
| Typecheck shared / mobile / admin | `npx tsc --noEmit` di masing-masing | bersih |
| Bundle Android | `npx expo export --platform android` (di `apps/mobile`, dengan env dummy) | berhasil |
| Build admin | `npx next build` (env dummy) | berhasil, 13 rute |
| Lint admin | `npx eslint .` | bersih |
| Kesehatan proyek Expo | `npx expo-doctor` | 20/20 |
| Smoke test runtime admin | `next start` + curl | `/login` 200; rute terlindungi 307 -> /login |
| Skrip impor wilayah | dijalankan pada berkas contoh | benar; berkas rusak ditolak |

## Ditulis tetapi BELUM dijalankan (butuh layanan yang tak ada di sini)

| Suite | Cara menjalankan | Syarat |
|---|---|---|
| `supabase/tests/security.sql` (~70 pemeriksaan: RLS, eskalasi peran, yurisdiksi, status, konkurensi optimistik, imutabilitas, storage, geo) | `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/security.sql` | DB uji sekali pakai dengan migrasi + seed; berjalan dalam transaksi yang di-rollback |
| `services/ai-service/tests/test_api.py` (11 kasus) | `pip install -r requirements-dev.txt && pytest` | Python 3.11+ |

Skrip SQL ditulis tanpa pernah dieksekusi: **bug pada skrip itu sendiri mungkin ada**. Perlakukan kegagalan pertama sebagai kemungkinan bug skrip maupun bug skema, dan periksa keduanya.

## Belum ada otomatisasi (hanya daftar manual)

Uji manual mobile (Expo Go lalu development build): registrasi + verifikasi email, login/keluar, sesi bertahan setelah restart, izin kamera/lokasi ditolak lalu diberikan, unggah foto, kirim laporan dalam jaringan buruk (mode pesawat saat mengirim; coba lagi memakai kunci idempotensi yang sama), peta + klaster, filter, validasi komunitas, peringatan area (jalan kaki/emulator lokasi), notifikasi push (hanya development build).

Uji manual admin: login staf vs non-staf, rute terlindungi, verifikasi/tolak, penugasan, unggah bukti (coba berkas bukan gambar, >8 MB, ekstensi palsu), batas yurisdiksi dengan dua admin, tabel (filter, urut, halaman), layout ponsel/tablet.

Uji AI: gambar valid, berkas bukan gambar, terlalu besar, format tak didukung, model tidak ada, keyakinan rendah, layanan mati, timeout. (Sebagian ada di `test_api.py`; timeout/layanan mati diuji lewat Edge Function.)

Tes e2e (Maestro/Detox/Playwright) dan tes komponen belum dibuat.
