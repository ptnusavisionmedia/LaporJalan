# Ikon Fitur LaporJalan

91 ikon asli untuk fitur yang ditemukan pada aplikasi mobile dan web admin saat paket ini dibuat. Berbasis logo hijau dengan simbol lokasi/jalan dan aksen kuning.

## Mulai dari sini

Buka **index.html** untuk melihat seluruh ikon, mencari berdasarkan nama fitur, beralih ke satu warna, serta menguji ukuran 24 px dan latar gelap. Tidak memerlukan internet. Logo utama tetap berada satu folder di atas: ../laporjalan-icon.png.

## Susunan folder

- index.html: katalog interaktif.
- svg/berwarna/: ikon hijau dengan isian hijau muda/krem dan aksen kuning.
- svg/satu-warna/: ikon currentColor untuk mengikuti warna teks atau tombol.
- sprite-berwarna.svg dan sprite-satu-warna.svg: semua simbol dalam satu file untuk web.
- manifest.json: daftar lengkap dan pemetaan fitur ke lokasi file.
- source/generate.mjs: sumber geometri SVG dan generator katalog.

## Aturan visual

Grid 32 × 32, garis 1,8 unit, ujung dan sambungan membulat. Gunakan ukuran 24 atau 32 px untuk antarmuka; 48–96 px untuk kartu fitur. SVG tidak pecah saat diperbesar dan latarnya transparan. Hijau utama #0B5D4B, hijau lembut #E2EFEA, krem #FFF9EB, aksen kuning #F2B705. Gunakan label/status selain warna agar aksesibel. Varian satu warna dapat tampil putih/krem di tombol hijau.

Untuk SVG yang dipasang sebagai img, warna currentColor di dalam file tidak diwariskan dari halaman. Gunakan inline SVG atau sprite jika perlu mewarisi warna teks. Contoh sprite melalui server web lokal:

```html
<svg width="24" height="24" style="color:#0B5D4B" aria-hidden="true">
  <use href="sprite-satu-warna.svg#lj-beranda"></use>
</svg>
```

Ikon dekoratif: aria-hidden. Tombol hanya ikon: tambahkan aria-label pada tombol. React Native memerlukan renderer SVG seperti react-native-svg atau ekspor PNG; file SVG tidak langsung dapat dipasang ke komponen Image standar. Paket ini belum mengubah antarmuka aplikasi atau menambah dependency.

## Daftar dan pemetaan fitur

### Navigasi utama

| Ikon | Fungsi | Berkas berwarna |
|---|---|---|
| Beranda | Tab Beranda dan feed laporan warga. | svg/berwarna/01-navigasi/beranda.svg |
| Dashboard | Ringkasan di web admin. | svg/berwarna/01-navigasi/dashboard.svg |
| Peta kerusakan | Tab peta mobile dan menu peta web. | svg/berwarna/01-navigasi/peta.svg |
| Buat laporan | Aksi utama membuat laporan kerusakan. | svg/berwarna/01-navigasi/buat-laporan.svg |
| Daftar laporan | Menu Kelola Laporan pada web admin. | svg/berwarna/01-navigasi/daftar-laporan.svg |
| Statistik | Statistik infrastruktur dan perbandingan wilayah. | svg/berwarna/01-navigasi/statistik.svg |
| Profil saya | Profil dan riwayat laporan pengguna. | svg/berwarna/01-navigasi/profil.svg |
| Pengguna dan instansi | Daftar akun pada web admin. | svg/berwarna/01-navigasi/pengguna.svg |

### Akun dan kewenangan

| Ikon | Fungsi | Berkas berwarna |
|---|---|---|
| Masuk | Tombol login dengan username dan password. | svg/berwarna/02-akun/masuk.svg |
| Keluar | Keluar dari akun mobile dan admin. | svg/berwarna/02-akun/keluar.svg |
| Daftar akun | Form registrasi warga baru. | svg/berwarna/02-akun/daftar-akun.svg |
| Password | Input password dan ulangi password. | svg/berwarna/02-akun/password.svg |
| Administrator | Peran admin, akses pengelolaan. | svg/berwarna/02-akun/admin.svg |
| Instansi | Akun instansi dan lembaga penanganan jalan. | svg/berwarna/02-akun/instansi.svg |
| Atur peran | Dialog pengaturan peran serta wilayah kewenangan. | svg/berwarna/02-akun/atur-peran.svg |

### Kategori kerusakan dan aksesibilitas

| Ikon | Fungsi | Berkas berwarna |
|---|---|---|
| Jalan | Identitas jalan dan keseluruhan infrastruktur jalan. | svg/berwarna/03-jenis-kerusakan/jalan.svg |
| Jalan berlubang | Kategori jalan_berlubang. | svg/berwarna/03-jenis-kerusakan/jalan-berlubang.svg |
| Jalan rusak / retak | Kategori jalan_rusak. | svg/berwarna/03-jenis-kerusakan/jalan-retak.svg |
| Trotoar rusak | Kategori trotoar_rusak. | svg/berwarna/03-jenis-kerusakan/trotoar-rusak.svg |
| Area berbahaya | Kategori area_berbahaya dan peringatan jalan. | svg/berwarna/03-jenis-kerusakan/area-berbahaya.svg |
| Trotoar terhalang | Kategori trotoar_terhalang. | svg/berwarna/03-jenis-kerusakan/trotoar-terhalang.svg |
| Jalur pemandu rusak | Kategori jalur_pemandu_rusak untuk tunanetra. | svg/berwarna/03-jenis-kerusakan/jalur-pemandu.svg |
| Akses kursi roda | Kategori akses_kursi_roda dan aksesibilitas. | svg/berwarna/03-jenis-kerusakan/akses-kursi-roda.svg |

### Foto dan isi laporan

| Ikon | Fungsi | Berkas berwarna |
|---|---|---|
| Ambil foto | Memotret kerusakan langsung dengan kamera. | svg/berwarna/04-foto-dan-laporan/kamera.svg |
| Pilih dari galeri | Memilih foto dari penyimpanan perangkat. | svg/berwarna/04-foto-dan-laporan/galeri.svg |
| Unggah foto | Mengunggah foto laporan atau bukti perbaikan. | svg/berwarna/04-foto-dan-laporan/unggah-foto.svg |
| Ganti foto | Mengganti foto laporan milik sendiri. | svg/berwarna/04-foto-dan-laporan/ganti-foto.svg |
| Foto tidak tersedia | Gagal memuat foto atau file foto rusak. | svg/berwarna/04-foto-dan-laporan/foto-rusak.svg |
| Detail laporan | Membuka isi lengkap laporan. | svg/berwarna/04-foto-dan-laporan/detail-laporan.svg |
| Deskripsi | Input penjelasan kerusakan jalan. | svg/berwarna/04-foto-dan-laporan/deskripsi.svg |
| Foto sebelum | Dokumentasi kondisi awal sebelum diperbaiki. | svg/berwarna/04-foto-dan-laporan/foto-sebelum.svg |
| Foto sesudah | Dokumentasi hasil pekerjaan/perbaikan. | svg/berwarna/04-foto-dan-laporan/foto-sesudah.svg |
| Perbandingan foto | Tampilan sebelum dan sesudah perbaikan. | svg/berwarna/04-foto-dan-laporan/bandingkan-foto.svg |

### Lokasi dan wilayah

| Ikon | Fungsi | Berkas berwarna |
|---|---|---|
| Lokasi laporan | Alamat dan penanda posisi laporan. | svg/berwarna/05-lokasi/lokasi.svg |
| Lokasi saya / GPS | Mengambil posisi saat ini dan memusatkan peta. | svg/berwarna/05-lokasi/lokasi-saya.svg |
| Buka rute | Petunjuk arah ke lokasi laporan. | svg/berwarna/05-lokasi/rute.svg |
| Wilayah kewenangan | Batas wilayah dan filter cakupan instansi. | svg/berwarna/05-lokasi/wilayah.svg |
| Provinsi / nasional | Pemilihan cakupan provinsi atau nasional. | svg/berwarna/05-lokasi/provinsi.svg |
| Kabupaten / kota | Pemilihan kabupaten atau kota. | svg/berwarna/05-lokasi/kota.svg |
| Kecamatan | Pemilihan kecamatan dan pembagian wilayah. | svg/berwarna/05-lokasi/kecamatan.svg |
| Desa / kelurahan | Pemilihan desa atau kelurahan. | svg/berwarna/05-lokasi/desa.svg |
| Peringatan sekitar | Peringatan saat mendekati laporan kerusakan. | svg/berwarna/05-lokasi/sekitar-saya.svg |

### Status dan prioritas

| Ikon | Fungsi | Berkas berwarna |
|---|---|---|
| Menunggu | Status laporan menunggu peninjauan. | svg/berwarna/06-status/status-menunggu.svg |
| Diverifikasi | Laporan telah diverifikasi. | svg/berwarna/06-status/status-diverifikasi.svg |
| Diproses | Laporan sedang dalam penanganan. | svg/berwarna/06-status/status-diproses.svg |
| Selesai | Perbaikan sudah selesai. | svg/berwarna/06-status/status-selesai.svg |
| Ditolak | Laporan tidak diterima. | svg/berwarna/06-status/status-ditolak.svg |
| Prioritas rendah | Skor prioritas di bawah 50. | svg/berwarna/06-status/prioritas-rendah.svg |
| Prioritas sedang | Skor prioritas 50–79. | svg/berwarna/06-status/prioritas-sedang.svg |
| Prioritas tinggi | Skor prioritas 80 atau lebih. | svg/berwarna/06-status/prioritas-tinggi.svg |

### Interaksi dan validasi warga

| Ikon | Fungsi | Berkas berwarna |
|---|---|---|
| Suka | Tombol suka pada laporan. | svg/berwarna/07-komunitas/suka.svg |
| Sudah disukai | Keadaan tombol suka yang aktif. | svg/berwarna/07-komunitas/sudah-disukai.svg |
| Komentar | Daftar dan jumlah komentar. | svg/berwarna/07-komunitas/komentar.svg |
| Kirim | Mengirim komentar atau laporan. | svg/berwarna/07-komunitas/kirim.svg |
| Masih rusak | Validasi warga bahwa kerusakan masih ada. | svg/berwarna/07-komunitas/validasi-masih-rusak.svg |
| Sudah diperbaiki | Validasi warga bahwa kondisi sudah baik. | svg/berwarna/07-komunitas/validasi-sudah-baik.svg |
| Linimasa penanganan | Catatan perkembangan dan riwayat status. | svg/berwarna/07-komunitas/linimasa.svg |
| Tanggapan admin | Catatan dan balasan dari petugas. | svg/berwarna/07-komunitas/tanggapan-admin.svg |
| Tambah perkembangan | Petugas menambah catatan atau foto hasil pekerjaan. | svg/berwarna/07-komunitas/tambah-perkembangan.svg |

### Kontrol dan tindakan

| Ikon | Fungsi | Berkas berwarna |
|---|---|---|
| Cari laporan | Pencarian judul, alamat, wilayah, dan username. | svg/berwarna/08-kontrol/cari.svg |
| Filter | Filter status, wilayah, atau jenis kerusakan. | svg/berwarna/08-kontrol/filter.svg |
| Urutkan | Urut prioritas dan laporan terbaru. | svg/berwarna/08-kontrol/urutkan.svg |
| Muat ulang | Memperbarui daftar dan mencoba kembali. | svg/berwarna/08-kontrol/muat-ulang.svg |
| Edit | Mengedit laporan atau pengaturan. | svg/berwarna/08-kontrol/edit.svg |
| Simpan | Menyimpan status dan perubahan data. | svg/berwarna/08-kontrol/simpan.svg |
| Hapus | Menghapus laporan atau komentar. | svg/berwarna/08-kontrol/hapus.svg |
| Tutup | Menutup drawer, dialog, atau banner. | svg/berwarna/08-kontrol/tutup.svg |
| Tambah | Menambahkan item baru. | svg/berwarna/08-kontrol/tambah.svg |
| Kembali | Kembali ke halaman sebelumnya. | svg/berwarna/08-kontrol/kembali.svg |
| Buka pilihan | Dropdown untuk status, wilayah dan kategori. | svg/berwarna/08-kontrol/panah-bawah.svg |
| Opsi lainnya | Menu tindakan tambahan. | svg/berwarna/08-kontrol/opsi-lain.svg |

### Informasi dan tingkat kondisi

| Ikon | Fungsi | Berkas berwarna |
|---|---|---|
| Notifikasi | Pemberitahuan dan peringatan sekitar. | svg/berwarna/09-informasi/notifikasi.svg |
| Notifikasi nonaktif | Peringatan sekitar dinonaktifkan. | svg/berwarna/09-informasi/notifikasi-nonaktif.svg |
| Lalu lintas rendah | Jalan dengan lalu lintas rendah. | svg/berwarna/09-informasi/lalu-lintas-rendah.svg |
| Lalu lintas sedang | Jalan dengan lalu lintas sedang. | svg/berwarna/09-informasi/lalu-lintas-sedang.svg |
| Lalu lintas tinggi | Jalan dengan lalu lintas tinggi. | svg/berwarna/09-informasi/lalu-lintas-tinggi.svg |
| Kerusakan ringan | Tingkat bahaya satu / ringan. | svg/berwarna/09-informasi/bahaya-ringan.svg |
| Kerusakan sedang | Tingkat bahaya dua / sedang. | svg/berwarna/09-informasi/bahaya-sedang.svg |
| Kerusakan berat | Tingkat bahaya tiga / berat. | svg/berwarna/09-informasi/bahaya-berat.svg |
| Tanggal dan waktu | Tanggal laporan, registrasi dan perkembangan. | svg/berwarna/09-informasi/tanggal.svg |
| Informasi | Penjelasan bantuan dan keterangan fitur. | svg/berwarna/09-informasi/informasi.svg |
| Bantuan | Panduan penggunaan atau pertanyaan umum. | svg/berwarna/09-informasi/bantuan.svg |

### Sistem dan keadaan tampilan

| Ikon | Fungsi | Berkas berwarna |
|---|---|---|
| Unduh | Unduh berkas atau aset dari web. | svg/berwarna/10-sistem/unduh.svg |
| Bagikan | Membagikan tautan laporan. | svg/berwarna/10-sistem/bagikan.svg |
| Tautan | Tautan menuju laporan atau sumber. | svg/berwarna/10-sistem/tautan.svg |
| Buka di luar aplikasi | Membuka Maps, foto penuh atau browser. | svg/berwarna/10-sistem/buka-eksternal.svg |
| Terhubung | Keadaan koneksi server tersedia. | svg/berwarna/10-sistem/koneksi.svg |
| Koneksi terputus | Gangguan jaringan dan tombol coba lagi. | svg/berwarna/10-sistem/koneksi-terputus.svg |
| Belum ada laporan | Keadaan kosong pada feed dan tabel laporan. | svg/berwarna/10-sistem/belum-ada-laporan.svg |
| Peringatan / error | Informasi gagal, izin ditolak atau bahaya. | svg/berwarna/10-sistem/peringatan.svg |
| Berhasil | Konfirmasi aksi berhasil dan data tersimpan. | svg/berwarna/10-sistem/berhasil.svg |

## Pemeriksaan

Generator memeriksa ID unik, referensi file, token warna, dan batas markup dasar. Uji ukuran kecil dan kebutuhan aksesibilitas akhir tetap dilakukan saat ikon dipasang pada layar sebenarnya. Fitur unduh/bagikan/bantuan disediakan sebagai aset pendukung; keberadaan ikon tidak berarti fungsi tersebut sudah dibuat di aplikasi.

Bangun ulang aset dengan menjalankan node design/icons/fitur/source/generate.mjs dari folder project.

## Ekspor PNG dan paket

Folder png/berwarna/ dan png/satu-warna/ berisi versi 256 × 256 px dengan latar transparan, siap diimpor sebagai gambar di mobile atau web. Gunakan SVG sebagai master untuk perubahan ukuran/warna. pratinjau.png adalah lembar semua ikon, bukan file ikon individual. Untuk mengulang ekspor PNG di Windows, jalankan source/export-png.ps1 setelah generator; memerlukan Microsoft Edge. Lihat source/QA.json untuk hasil pemeriksaan aset.
