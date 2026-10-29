# Retensi data (DRAF - perlu tinjauan hukum)

Angka di bawah adalah usulan teknis awal, **bukan** keputusan kepatuhan. Penyelenggara wajib menetapkan jangka waktu dan dasar hukum.

| Data | Perilaku sekarang | Usulan / perlu ditetapkan |
|---|---|---|
| Akun & profil | disimpan sampai pengguna meminta penghapusan | [ISI] masa tidak aktif |
| Permintaan hapus akun | `process-deletions` memproses setelah `DELETION_GRACE_DAYS` (7) | [ISI] |
| Laporan & foto | dipertahankan **tanpa identitas** setelah akun dihapus (data infrastruktur) | [ISI] dasar hukum menyimpan; foto bisa memuat orang/pelat nomor - pertimbangkan pengaburan |
| Riwayat status, log audit | tidak dapat diubah; actor menjadi NULL saat akun dihapus | [ISI] masa simpan; partisi/arsip per bulan |
| Notifikasi | dihapus bersama akun | [ISI] pembersihan berkala |
| Token perangkat | dihapus bersama akun / saat tidak terdaftar | |
| Hasil analisis AI | disimpan; `requested_by` NULL saat akun dihapus | [ISI] |
| Berkas yatim di storage | `cleanup-storage` menghapus berkas >24 jam tanpa referensi | |

Belum ada: penghapusan otomatis laporan lama, arsip, atau mekanisme koreksi data oleh pengguna selain edit profil.
