# Prosedur respons insiden keamanan data (DRAF - perlu tinjauan hukum)

Draf kerangka kerja, bukan nasihat hukum. UU No. 27 Tahun 2022 memuat kewajiban pemberitahuan atas kegagalan pelindungan data pribadi; **tenggat, penerima, dan isi pemberitahuan harus dikonfirmasi oleh penasihat hukum** sebelum prosedur ini dipakai.

1. **Deteksi & triase** (0-1 jam): siapa pun yang mencurigai insiden melapor ke [ISI: kontak]. Catat waktu, sumber, sistem terdampak. Tentukan keparahan: data pribadi terpapar? akses tidak sah? ketersediaan?
2. **Penahanan**: cabut/rotasi kunci yang dicurigai (service-role, token internal, FCM), nonaktifkan akun/peran yang disalahgunakan (`revoke_role`), blokir akses bila perlu. Jangan menghapus bukti; log audit tidak dapat diubah.
3. **Investigasi**: tinjau `admin_audit_logs`, log Supabase/Auth/Edge Function; tentukan data dan pengguna terdampak.
4. **Pemberitahuan**: [ISI: dasar hukum, tenggat, otoritas, format] kepada pengguna terdampak dan pihak berwenang.
5. **Pemulihan & pelajaran**: perbaiki akar masalah, uji ulang (`security.sql`), tulis tinjauan pascainsiden tanpa menyalahkan individu.

Kontak penanggung jawab dan eskalasi: [ISI].
