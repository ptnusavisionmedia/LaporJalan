import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const icons = [];
let group;
const section = (id, label) => { group = { id, label }; };
const add = (id, label, use, shapes) => icons.push({ id, label, use, group: group.id, category: group.label, shapes });
const p = (d, attrs = '') => `<path d="${d}" ${attrs}/>`;
const c = (x, y, r, attrs = '') => `<circle cx="${x}" cy="${y}" r="${r}" ${attrs}/>`;
const r = (x, y, w, h, rx = 2, attrs = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" ${attrs}/>`;
const soft = 'fill="SOFT"';
const accent = 'fill="ACCENT" stroke="INK"';
const check = (x = 16, y = 16) => p(`M${x-4} ${y}l3 3 5-6`);
const plus = (x = 24, y = 24) => c(x,y,5,accent)+p(`M${x-2} ${y}h4m-2-2v4`);
const pin = p('M16 28S6 19 6 12a10 10 0 0 1 20 0c0 7-10 16-10 16Z', soft)+c(16,12,3.5);
const road = p('M5 28 11 4h10l6 24',soft)+p('M16 7v4m0 5v4m0 5v2');
const paper = r(7,4,18,24,3,soft)+p('M11 10h10m-10 5h7m-7 5h10');
const person = c(16,10,5,soft)+p('M6 28v-2a10 10 0 0 1 20 0v2Z',soft);
const heart = p('M16 27 5 17C-2 9 8 1 16 9c8-8 18 0 11 8Z',soft);
const shield = p('M16 3 27 7v8c0 7-7 12-11 14C12 27 5 22 5 15V7Z',soft);
const eye = p('M3 16s5-8 13-8 13 8 13 8-5 8-13 8S3 16 3 16Z',soft)+c(16,16,3);
const cross = (x=16,y=16) => p(`M${x-3} ${y-3}l6 6m0-6-6 6`);
const badge = (shape) => c(16,16,12,soft)+shape;
const car = (y=12) => p(`M7 ${y+10}v-8l3-5h12l3 5v8m-18-8h18m-15 4h1m10 0h1m-15 5v2m18-2v2`,soft);

section('01-navigasi', 'Navigasi utama');
add('beranda','Beranda','Tab Beranda dan feed laporan warga.',p('M3 14 16 3l13 11M7 12v16h18V12',soft)+r(13,20,6,8,1,'fill="CREAM"')+p('M13 8h6','stroke="ACCENT"'));
add('dashboard','Dashboard','Ringkasan di web admin.',r(4,4,10,14,2,soft)+r(18,4,10,8,2,accent)+r(18,16,10,12,2,soft)+r(4,22,10,6,2,soft));
add('peta','Peta kerusakan','Tab peta mobile dan menu peta web.',p('m3 8 8-4 10 4 8-4v21l-8 4-10-4-8 4Z',soft)+p('M11 4v21m10-17v21')+c(21,12,4,accent)+c(21,12,1,'fill="INK"'));
add('buat-laporan','Buat laporan','Aksi utama membuat laporan kerusakan.',paper+plus());
add('daftar-laporan','Daftar laporan','Menu Kelola Laporan pada web admin.',r(4,4,24,24,3,soft)+p('M13 10h10m-10 6h10m-10 6h10')+c(9,10,1,'fill="INK"')+c(9,16,1,'fill="INK"')+c(9,22,1,'fill="ACCENT"'));
add('statistik','Statistik','Statistik infrastruktur dan perbandingan wilayah.',p('M4 4v24h25')+r(8,17,4,7,1,soft)+r(16,11,4,13,1,soft)+r(24,5,4,19,1,accent));
add('profil','Profil saya','Profil dan riwayat laporan pengguna.',person);
add('pengguna','Pengguna dan instansi','Daftar akun pada web admin.',c(12,10,4,soft)+p('M3 27v-2a9 9 0 0 1 18 0v2Z',soft)+p('M22 6a4 4 0 0 1 0 8m2 5c4 0 6 3 6 7','stroke="INK"')+c(25,8,1.5,'fill="ACCENT" stroke="none"'));

section('02-akun', 'Akun dan kewenangan');
add('masuk','Masuk','Tombol login dengan username dan password.',r(14,4,13,24,3,soft)+p('M3 16h17m-5-5 5 5-5 5')+p('M23 15v2','stroke="ACCENT"'));
add('keluar','Keluar','Keluar dari akun mobile dan admin.',r(5,4,13,24,3,soft)+p('M13 16h16m-5-5 5 5-5 5'));
add('daftar-akun','Daftar akun','Form registrasi warga baru.',c(12,10,5,soft)+p('M3 27v-3a9 9 0 0 1 16-5',soft)+plus(24,23));
add('password','Password','Input password dan ulangi password.',r(5,14,22,15,3,soft)+p('M10 14V9a6 6 0 0 1 12 0v5')+c(16,21,1.5,accent)+p('M16 23v2'));
add('admin','Administrator','Peran admin, akses pengelolaan.',shield+check()+p('M12 7h8','stroke="ACCENT"'));
add('instansi','Instansi','Akun instansi dan lembaga penanganan jalan.',p('M3 12 16 4l13 8Z',soft)+p('M5 28h22M7 24V14m6 10V14m6 10V14m6 10V14')+c(16,9,1,'fill="ACCENT"'));
add('atur-peran','Atur peran','Dialog pengaturan peran serta wilayah kewenangan.',c(12,9,4,soft)+p('M3 27v-3a9 9 0 0 1 13-8',soft)+r(18,19,11,10,2,'fill="CREAM"')+p('M21 19v-3a2.5 2.5 0 0 1 5 0v3')+c(23.5,24,1,'fill="ACCENT"'));

section('03-jenis-kerusakan', 'Kategori kerusakan dan aksesibilitas');
add('jalan','Jalan','Identitas jalan dan keseluruhan infrastruktur jalan.',road);
add('jalan-berlubang','Jalan berlubang','Kategori jalan_berlubang.',p('M5 28 10 4m12 0 5 24M16 5v5m0 14v4')+p('m8 17 4-4 4 2 4-2 5 5-3 4-5-1-5 2Z',soft)+p('m12 18 4-1 4 1','stroke="ACCENT"'));
add('jalan-retak','Jalan rusak / retak','Kategori jalan_rusak.',p('M5 28 10 4m12 0 5 24')+p('m17 4-4 7 6 5-7 5 5 7','stroke="INK"')+p('m13 11-5 1m11 4 5 1','stroke="ACCENT"'));
add('trotoar-rusak','Trotoar rusak','Kategori trotoar_rusak.',p('M3 25h26M4 23V10h24v13',soft)+p('M4 16h10m6 0h8M11 10v6m10-6v6M8 16v7m16-7v7')+p('m17 10-3 7 5 2-3 5','stroke="ACCENT"'));
add('area-berbahaya','Area berbahaya','Kategori area_berbahaya dan peringatan jalan.',p('m14 5-11 20a2 2 0 0 0 2 3h22a2 2 0 0 0 2-3L18 5a2.3 2.3 0 0 0-4 0Z','fill="CREAM"')+p('M16 12v7','stroke="INK"')+c(16,24,1,'fill="ACCENT"'));
add('trotoar-terhalang','Trotoar terhalang','Kategori trotoar_terhalang.',p('M3 27h26M7 27V12m18 15V12')+r(3,9,26,9,2,soft)+p('m5 17 7-7m2 8 8-8m2 8 4-4','stroke="ACCENT"'));
add('jalur-pemandu','Jalur pemandu rusak','Kategori jalur_pemandu_rusak untuk tunanetra.',r(4,4,24,24,3,soft)+p('M9 8v7m0 7v2M14 8v5m0 7v4M20 8v7m0 6v3M25 8v6m0 6v4')+p('m5 18 6-2 5 3 5-3 6 1','stroke="ACCENT"'));
add('akses-kursi-roda','Akses kursi roda','Kategori akses_kursi_roda dan aksesibilitas.',c(16,5,2.5,accent)+p('M15 11v9h8l4 7M16 14h7M11 16a7 7 0 1 0 10 9')+p('m27 27 2-1'));

section('04-foto-dan-laporan', 'Foto dan isi laporan');
add('kamera','Ambil foto','Memotret kerusakan langsung dengan kamera.',p('M4 10h6l2-4h8l2 4h6v17H4Z',soft)+c(16,18,5)+c(25,13,1,'fill="ACCENT"'));
add('galeri','Pilih dari galeri','Memilih foto dari penyimpanan perangkat.',r(4,5,24,22,3,soft)+p('m5 23 8-9 6 6 4-4 5 5')+c(22,11,2.5,accent));
add('unggah-foto','Unggah foto','Mengunggah foto laporan atau bukti perbaikan.',r(4,8,24,20,3,soft)+p('M11 7h10m-5 15V3m-5 5 5-5 5 5')+p('m5 25 5-5 4 4m10-4 3 3','stroke="ACCENT"'));
add('ganti-foto','Ganti foto','Mengganti foto laporan milik sendiri.',r(4,5,24,22,3,soft)+p('m5 23 8-9 6 6')+c(22,11,2,accent)+p('m19 26 7-7 3 3-7 7-4 1Z','fill="CREAM"'));
add('foto-rusak','Foto tidak tersedia','Gagal memuat foto atau file foto rusak.',r(4,5,24,22,3,soft)+p('m5 23 7-8 5 5m4-3 6 6M14 5l-3 8 8 3-3 11')+c(23,11,1.5,accent));
add('detail-laporan','Detail laporan','Membuka isi lengkap laporan.',paper+c(23,23,6,'fill="CREAM"')+p('m27 27 3 3M23 20v4')+c(23,27,.6,'fill="INK"'));
add('deskripsi','Deskripsi','Input penjelasan kerusakan jalan.',r(4,4,24,24,3,soft)+p('M9 10h14M9 16h14M9 22h8')+p('M21 22h2','stroke="ACCENT"'));
add('foto-sebelum','Foto sebelum','Dokumentasi kondisi awal sebelum diperbaiki.',r(3,6,26,22,3,soft)+p('m4 24 8-9 6 6 4-3 6 6')+c(23,12,2,accent)+p('M11 3H4v7m0-7 7 7'));
add('foto-sesudah','Foto sesudah','Dokumentasi hasil pekerjaan/perbaikan.',r(3,6,26,22,3,soft)+p('m4 24 8-9 6 6 4-3 6 6')+c(23,10,6,'fill="CREAM"')+check(23,10));
add('bandingkan-foto','Perbandingan foto','Tampilan sebelum dan sesudah perbaikan.',r(3,5,26,23,3,soft)+p('M16 3v27M4 23l7-8 5 5m1 2 5-7 6 7')+p('m12 10-3 3 3 3m8-6 3 3-3 3','stroke="ACCENT"'));

section('05-lokasi', 'Lokasi dan wilayah');
add('lokasi','Lokasi laporan','Alamat dan penanda posisi laporan.',pin);
add('lokasi-saya','Lokasi saya / GPS','Mengambil posisi saat ini dan memusatkan peta.',c(16,16,9,soft)+c(16,16,3,accent)+p('M16 2v5m0 18v5M2 16h5m18 0h5'));
add('rute','Buka rute','Petunjuk arah ke lokasi laporan.',c(7,25,3,soft)+p('M10 25h13a5 5 0 0 0 0-10H10a5 5 0 0 1 0-10h12')+p('m19 2 4 3-4 3','stroke="INK"')+c(26,5,2,'fill="ACCENT" stroke="none"'));
add('wilayah','Wilayah kewenangan','Batas wilayah dan filter cakupan instansi.',p('m4 8 8-4 6 4 10-3-2 10 3 8-11 5-6-4-9 3 3-11Z',soft)+c(17,16,4,accent)+p('M17 22v3'));
add('provinsi','Provinsi / nasional','Pemilihan cakupan provinsi atau nasional.',p('m4 8 8-4 6 4 10-3-2 10 3 8-11 5-6-4-9 3 3-11Z',soft)+p('m12 4 2 10-4 10m8-16-4 6 12 1','stroke="ACCENT"'));
add('kota','Kabupaten / kota','Pemilihan kabupaten atau kota.',r(4,13,7,15,1,soft)+r(12,5,9,23,1,soft)+r(22,10,6,18,1,soft)+p('M15 10h3m-3 5h3m-3 5h3M7 18v2m18-5v2M3 28h26')+p('M16 25v3','stroke="ACCENT"'));
add('kecamatan','Kecamatan','Pemilihan kecamatan dan pembagian wilayah.',r(4,4,9,9,2,soft)+r(19,4,9,9,2,soft)+r(4,19,9,9,2,soft)+r(19,19,9,9,2,accent)+p('M13 8h6M8 13v6m16-6v6m-11 5h6'));
add('desa','Desa / kelurahan','Pemilihan desa atau kelurahan.',p('m3 16 8-7 8 7M6 14v14h11V14',soft)+p('m17 11 6-5 6 5m-9-2v13h6V9',soft)+r(9,21,5,7,1,'fill="CREAM"')+p('M3 28h26','stroke="ACCENT"'));
add('sekitar-saya','Peringatan sekitar','Peringatan saat mendekati laporan kerusakan.',c(16,16,12,soft)+c(16,16,7)+c(16,16,2,accent)+p('m16 16 8-8M3 27l3-3m20 0 3 3'));

section('06-status', 'Status dan prioritas');
add('status-menunggu','Menunggu','Status laporan menunggu peninjauan.',badge(p('M16 8v8l5 3'))+c(25,7,3,accent));
add('status-diverifikasi','Diverifikasi','Laporan telah diverifikasi.',shield+check()+c(25,7,3,accent));
add('status-diproses','Diproses','Laporan sedang dalam penanganan.',p('M6 26 10 9h12l4 17Z',soft)+p('M8 18h16m-17 5h18M3 28h26')+p('M13 4h6','stroke="ACCENT"'));
add('status-selesai','Selesai','Perbaikan sudah selesai.',badge(check())+p('M9 6h3','stroke="ACCENT"'));
add('status-ditolak','Ditolak','Laporan tidak diterima.',badge(cross())+p('M9 6h3','stroke="ACCENT"'));
add('prioritas-rendah','Prioritas rendah','Skor prioritas di bawah 50.',r(4,4,24,24,3,soft)+p('M9 12l7 7 7-7')+p('M11 24h10','stroke="ACCENT"'));
add('prioritas-sedang','Prioritas sedang','Skor prioritas 50–79.',r(4,4,24,24,3,soft)+p('M9 13h14m-14 6h14','stroke="INK"')+p('M11 25h10','stroke="ACCENT"'));
add('prioritas-tinggi','Prioritas tinggi','Skor prioritas 80 atau lebih.',r(4,4,24,24,3,'fill="CREAM"')+p('m9 20 7-7 7 7m-14-7 7-7 7 7')+p('M11 26h10','stroke="ACCENT"'));

section('07-komunitas', 'Interaksi dan validasi warga');
add('suka','Suka','Tombol suka pada laporan.',heart);
add('sudah-disukai','Sudah disukai','Keadaan tombol suka yang aktif.',heart+check(16,16));
add('komentar','Komentar','Daftar dan jumlah komentar.',p('M27 21a3 3 0 0 1-3 3H12l-7 5V7a3 3 0 0 1 3-3h16a3 3 0 0 1 3 3Z',soft)+p('M10 11h12m-12 6h8')+c(23,18,1,'fill="ACCENT"'));
add('kirim','Kirim','Mengirim komentar atau laporan.',p('M3 4 29 16 3 28l5-12Z',soft)+p('M8 16h21M3 4l14 12L3 28')+p('M21 16h5','stroke="ACCENT"'));
add('validasi-masih-rusak','Masih rusak','Validasi warga bahwa kerusakan masih ada.',pin+p('M16 7v6')+c(16,16,1,'fill="ACCENT"'));
add('validasi-sudah-baik','Sudah diperbaiki','Validasi warga bahwa kondisi sudah baik.',pin+check(16,12));
add('linimasa','Linimasa penanganan','Catatan perkembangan dan riwayat status.',p('M7 8v17')+c(7,7,3,accent)+c(7,16,2,soft)+c(7,26,3,soft)+p('M14 6h13m-13 4h8m-8 5h13m-13 4h8m-8 6h13m-13 4h8'));
add('tanggapan-admin','Tanggapan admin','Catatan dan balasan dari petugas.',p('M26 19v4H12l-7 6V6h21Z',soft)+c(24,12,6,'fill="CREAM"')+check(24,12)+p('M10 11h6m-6 6h6'));
add('tambah-perkembangan','Tambah perkembangan','Petugas menambah catatan atau foto hasil pekerjaan.',paper+plus(24,24)+p('M3 11v14','stroke="ACCENT"'));

section('08-kontrol', 'Kontrol dan tindakan');
add('cari','Cari laporan','Pencarian judul, alamat, wilayah, dan username.',c(14,14,9,soft)+p('m21 21 8 8')+p('M10 10a5 5 0 0 1 5-2','stroke="ACCENT"'));
add('filter','Filter','Filter status, wilayah, atau jenis kerusakan.',p('M3 5h26L19 17v10l-6-3v-7Z',soft)+p('M9 10h14','stroke="ACCENT"'));
add('urutkan','Urutkan','Urut prioritas dan laporan terbaru.',p('M8 4v24m-4-4 4 4 4-4M16 7h13m-13 8h9m-9 8h5')+c(28,7,1.5,'fill="ACCENT" stroke="none"'));
add('muat-ulang','Muat ulang','Memperbarui daftar dan mencoba kembali.',p('M27 13A11 11 0 0 0 7 7L4 11m0-7v7h7M5 19a11 11 0 0 0 20 6l3-4m0 7v-7h-7')+c(16,16,2,accent));
add('edit','Edit','Mengedit laporan atau pengaturan.',p('m6 21 16-16a3 3 0 0 1 5 5L11 26l-7 2Z',soft)+p('m19 8 5 5M6 21l5 5')+p('M16 28h12','stroke="ACCENT"'));
add('simpan','Simpan','Menyimpan status dan perubahan data.',p('M5 4h19l4 4v20H4V5Z',soft)+r(10,4,12,9,1,'fill="CREAM"')+r(9,19,14,9,1,'fill="CREAM"')+p('M19 7v3','stroke="ACCENT"'));
add('hapus','Hapus','Menghapus laporan atau komentar.',p('M4 9h24M11 9V5h10v4M7 9l1 19h16l1-19',soft)+p('M13 14v9m6-9v9')+p('M13 5h6','stroke="ACCENT"'));
add('tutup','Tutup','Menutup drawer, dialog, atau banner.',badge(cross()));
add('tambah','Tambah','Menambahkan item baru.',badge(p('M9 16h14M16 9v14')));
add('kembali','Kembali','Kembali ke halaman sebelumnya.',p('m15 6-10 10 10 10M5 16h23')+c(27,16,1.5,'fill="ACCENT" stroke="none"'));
add('panah-bawah','Buka pilihan','Dropdown untuk status, wilayah dan kategori.',r(4,4,24,24,3,soft)+p('m9 13 7 7 7-7'));
add('opsi-lain','Opsi lainnya','Menu tindakan tambahan.',badge(c(9,16,1,'fill="INK"')+c(16,16,1,'fill="INK"')+c(23,16,1,'fill="ACCENT"')));

section('09-informasi', 'Informasi dan tingkat kondisi');
add('notifikasi','Notifikasi','Pemberitahuan dan peringatan sekitar.',p('M5 24h22l-3-5v-7a8 8 0 0 0-16 0v7Z',soft)+p('M13 28a3 3 0 0 0 6 0M16 2v2')+c(25,7,4,accent));
add('notifikasi-nonaktif','Notifikasi nonaktif','Peringatan sekitar dinonaktifkan.',p('M5 24h22l-3-5v-7a8 8 0 0 0-16 0v7Z',soft)+p('M13 28a3 3 0 0 0 6 0M3 3l26 26'));
add('lalu-lintas-rendah','Lalu lintas rendah','Jalan dengan lalu lintas rendah.',car(10)+p('M7 5h5','stroke="ACCENT"'));
add('lalu-lintas-sedang','Lalu lintas sedang','Jalan dengan lalu lintas sedang.',car(10)+p('M7 5h5m4 0h5','stroke="ACCENT"'));
add('lalu-lintas-tinggi','Lalu lintas tinggi','Jalan dengan lalu lintas tinggi.',car(10)+p('M5 5h5m4 0h5m4 0h5','stroke="ACCENT"'));
add('bahaya-ringan','Kerusakan ringan','Tingkat bahaya satu / ringan.',r(4,4,24,24,3,soft)+r(9,20,4,4,1,accent)+p('M17 24h1m5 0h1M9 9h14'));
add('bahaya-sedang','Kerusakan sedang','Tingkat bahaya dua / sedang.',r(4,4,24,24,3,soft)+r(8,20,4,4,1,soft)+r(14,15,4,9,1,accent)+p('M23 24h1M9 9h14'));
add('bahaya-berat','Kerusakan berat','Tingkat bahaya tiga / berat.',r(4,4,24,24,3,'fill="CREAM"')+r(7,20,4,4,1,soft)+r(14,15,4,9,1,soft)+r(21,9,4,15,1,accent));
add('tanggal','Tanggal dan waktu','Tanggal laporan, registrasi dan perkembangan.',r(4,7,24,21,3,soft)+p('M4 14h24M10 3v8m12-8v8M10 19h4m4 0h4m-12 5h4')+c(21,24,1,'fill="ACCENT"'));
add('informasi','Informasi','Penjelasan bantuan dan keterangan fitur.',badge(p('M16 14v9')+c(16,9,1,'fill="ACCENT"')));
add('bantuan','Bantuan','Panduan penggunaan atau pertanyaan umum.',badge(p('M11 11a5 5 0 1 1 8 4c-3 2-3 2-3 5')+c(16,25,1,'fill="ACCENT"')));

section('10-sistem', 'Sistem dan keadaan tampilan');
add('unduh','Unduh','Unduh berkas atau aset dari web.',p('M5 21v7h22v-7M16 3v18m-6-6 6 6 6-6')+p('M11 28h10','stroke="ACCENT"'));
add('bagikan','Bagikan','Membagikan tautan laporan.',p('m10 14 12-7M10 18l12 7')+c(7,16,4,soft)+c(25,6,4,soft)+c(25,26,4,accent));
add('tautan','Tautan','Tautan menuju laporan atau sumber.',p('m13 8 3-3a8 8 0 0 1 11 11l-3 3M19 24l-3 3A8 8 0 0 1 5 16l3-3M11 21l10-10')+p('m15 17 2-2','stroke="ACCENT"'));
add('buka-eksternal','Buka di luar aplikasi','Membuka Maps, foto penuh atau browser.',p('M17 4h11v11m0-11L14 18')+p('M12 6H5v22h22v-8',soft)+p('M24 8l4-4','stroke="ACCENT"'));
add('koneksi','Terhubung','Keadaan koneksi server tersedia.',p('M3 10a20 20 0 0 1 26 0M7 15a14 14 0 0 1 18 0m-14 5a8 8 0 0 1 10 0')+c(16,26,2,accent));
add('koneksi-terputus','Koneksi terputus','Gangguan jaringan dan tombol coba lagi.',p('M3 10a20 20 0 0 1 26 0M7 15a14 14 0 0 1 18 0m-14 5a8 8 0 0 1 10 0M3 3l26 26')+c(16,26,2,accent));
add('belum-ada-laporan','Belum ada laporan','Keadaan kosong pada feed dan tabel laporan.',p('M4 11 9 5h14l5 6v17H4Z',soft)+p('M4 19h7l2 4h6l2-4h7M11 12h10')+c(25,6,3,accent));
add('peringatan','Peringatan / error','Informasi gagal, izin ditolak atau bahaya.',badge(p('M16 8v10')+c(16,24,1,'fill="ACCENT"')));
add('berhasil','Berhasil','Konfirmasi aksi berhasil dan data tersimpan.',badge(check())+p('m25 3 1 2 3 1-3 1-1 3-1-3-3-1 3-1Z',accent));

const palette = { ink: '#0B5D4B', soft: '#E2EFEA', cream: '#FFF9EB', accent: '#F2B705' };
const body = (icon, mono = false) => icon.shapes.replaceAll('fill="SOFT"', mono ? 'fill="currentColor" fill-opacity="0.08"' : `fill="${palette.soft}"`).replaceAll('fill="CREAM"', mono ? 'fill="currentColor" fill-opacity="0.08"' : `fill="${palette.cream}"`).replaceAll('fill="ACCENT"', mono ? 'fill="currentColor"' : `fill="${palette.accent}"`).replaceAll('stroke="ACCENT"', mono ? 'stroke="currentColor"' : `stroke="${palette.accent}"`).replaceAll('fill="INK"', 'fill="currentColor"').replaceAll('stroke="INK"', 'stroke="currentColor"');
const svg = (icon, mono = false) => `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none" color="${palette.ink}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" role="img" aria-labelledby="title-${icon.id}-${mono?'mono':'brand'}"><title id="title-${icon.id}-${mono?'mono':'brand'}">${icon.label}</title>${body(icon,mono)}</svg>\n`;
for (const icon of icons) {
  for (const [variant, mono] of [['berwarna',false],['satu-warna',true]]) {
    const dir = path.join(root,'svg',variant,icon.group);
    await fs.mkdir(dir,{recursive:true});
    await fs.writeFile(path.join(dir,`${icon.id}.svg`),svg(icon,mono));
  }
}

const manifest = { name:'LaporJalan — Ikon Fitur', version:'1.0.0', count:icons.length, grid:32, stroke:1.8, palette, icons: icons.map(({shapes,...icon})=>({...icon,svg:`svg/berwarna/${icon.group}/${icon.id}.svg`,mono:`svg/satu-warna/${icon.group}/${icon.id}.svg`,png:`png/berwarna/${icon.group}/${icon.id}.png`,pngMono:`png/satu-warna/${icon.group}/${icon.id}.png`})) };
await fs.writeFile(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
for (const [variant,mono] of [['berwarna',false],['satu-warna',true]]) {
  const symbols=icons.map(icon=>`<symbol id="lj-${icon.id}" viewBox="0 0 32 32"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body(icon,mono)}</g></symbol>`).join('\n');
  await fs.writeFile(path.join(root,`sprite-${variant}.svg`),`<svg xmlns="http://www.w3.org/2000/svg">${symbols}</svg>\n`);
}

const grouped = [...new Map(icons.map(i=>[i.group,{label:i.category,icons:icons.filter(j=>j.group===i.group)}])).entries()];
const cards = grouped.map(([id,g])=>`<section id="${id}"><div class="section-head"><h2>${g.label}</h2><span>${g.icons.length} ikon</span></div><div class="grid">${g.icons.map(icon=>`<article class="card" data-search="${icon.label.toLowerCase()} ${icon.use.toLowerCase()} ${icon.id}"><div class="sample">${svg(icon)}</div><h3>${icon.label}</h3><p>${icon.use}</p><code>${icon.id}</code><div class="links"><a download href="svg/berwarna/${icon.group}/${icon.id}.svg">SVG warna ↗</a><a download href="svg/satu-warna/${icon.group}/${icon.id}.svg">Satu warna ↗</a></div></article>`).join('')}</div></section>`).join('');
const html = `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Katalog Ikon LaporJalan</title><style>
:root{--green:#0B5D4B;--ink:#16201D;--soft:#E2EFEA;--cream:#FFF9EB;--amber:#F2B705}*{box-sizing:border-box}body{margin:0;background:#F2F4F3;color:var(--ink);font:15px/1.55 'Segoe UI',Arial,sans-serif}.hero{background:var(--green);color:var(--cream);padding:56px max(6vw,24px) 48px;display:flex;align-items:center;gap:40px}.hero img{width:132px;height:132px;border-radius:28px;box-shadow:0 10px 32px #002e2540}.eyebrow{font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#F2B705;font-weight:700}h1{font-size:clamp(30px,4vw,50px);line-height:1.1;letter-spacing:-1.6px;margin:12px 0 14px}.hero p{margin:0;max-width:680px;color:#d7e9e0;font-size:17px}.chips{display:flex;gap:10px;margin-top:22px;flex-wrap:wrap}.chips span{padding:6px 12px;border:1px solid #ffffff40;border-radius:99px;font-size:12px}main{max-width:1440px;margin:auto;padding:32px 5vw 60px}.controls{display:flex;gap:12px;flex-wrap:wrap;align-items:center;position:sticky;top:0;z-index:2;padding:16px 0;background:#F2F4F3f5}.controls input,.controls select{border:1px solid #c4d5cc;border-radius:12px;background:white;padding:12px 16px;color:var(--ink);font:inherit}.controls input{flex:1;min-width:180px}.controls button{border:0;border-radius:12px;background:var(--green);color:white;padding:13px 18px;font:inherit;cursor:pointer}.palette{display:flex;gap:16px;align-items:center;flex-wrap:wrap;font-size:12px;color:#62716B;padding:8px 0 22px}.swatch{display:inline-block;width:12px;height:12px;border:1px solid #9cae9f;border-radius:50%;vertical-align:-2px;margin-right:6px}.section-head{display:flex;gap:16px;align-items:center;margin:30px 0 16px}.section-head h2{font-size:22px;margin:0;letter-spacing:-.5px}.section-head span{font-size:12px;color:#62716B}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:14px}.card{background:white;border:1px solid #D9DFDC;border-radius:18px;padding:22px;display:flex;flex-direction:column;align-items:flex-start}.sample{width:80px;height:80px;display:grid;place-items:center;background:#F8FAF8;border-radius:18px;margin-bottom:14px}.sample svg{width:46px;height:46px}.card h3{font-size:15px;margin:0 0 6px}.card p{font-size:12px;line-height:1.55;color:#62716B;min-height:38px;margin:0 0 14px}.card code{font-size:10px;padding:4px 7px;border-radius:5px;background:#F2F4F3;color:#435d50;word-break:break-all}.links{display:flex;gap:12px;margin-top:14px;font-size:11px}.links a{color:var(--green);text-underline-offset:3px}.notice{border-left:3px solid var(--amber);padding:12px 18px;background:var(--cream);font-size:13px;margin:4px 0 12px}.foot{padding:28px 0;font-size:12px;color:#62716B}.dark .sample{background:#0B5D4B}.dark .sample svg{color:#FFF9EB}.dark .sample svg [fill="#E2EFEA"],.dark .sample svg [fill="#FFF9EB"]{fill:#ffffff18}body.mono .sample svg{color:var(--green)}body.dark.mono .sample svg{color:#FFF9EB}.size24 .sample svg{width:24px;height:24px}.card[hidden],section[hidden]{display:none}a:focus-visible,input:focus-visible,select:focus-visible,button:focus-visible{outline:3px solid #F2B705;outline-offset:3px}@media(max-width:600px){.hero{padding:30px 24px;gap:20px;align-items:flex-start}.hero img{width:72px;height:72px;border-radius:18px}.hero p{font-size:14px}.grid{grid-template-columns:repeat(2,minmax(0,1fr))}.card{padding:16px}.links{flex-direction:column;gap:5px}h1{letter-spacing:-.8px}.palette{gap:8px}.sample{width:64px;height:64px}.card p{min-height:0}}@media print{.controls,.notice,.links{display:none}.hero{background:white;color:#0B5D4B}.hero p{color:#435d50}.grid{grid-template-columns:repeat(4,1fr)}.card{break-inside:avoid}.sample{height:48px;width:48px}.sample svg{height:32px;width:32px}section{break-inside:auto}}
</style></head><body><header class="hero"><img src="../laporjalan-icon.png" alt="Logo LaporJalan"><div><div class="eyebrow">LaporJalan / Sistem ikon fitur / 01</div><h1>Satu identitas.<br>Setiap fitur punya tanda.</h1><p>${icons.length} ikon khusus untuk aplikasi warga dan web pengelola. Bentuk membulat, garis tegas, serta warna yang mengikuti logo LaporJalan.</p><div class="chips"><span>32 × 32 grid</span><span>SVG transparan</span><span>2 varian</span><span>Mobile + web</span></div></div></header><main><div class="controls"><input id="search" type="search" aria-label="Cari ikon" placeholder="Cari fitur: kamera, status, instansi, aksesibilitas…"><select id="variant" aria-label="Varian ikon"><option value="brand">Berwarna</option><option value="mono">Satu warna</option></select><select id="size" aria-label="Ukuran pratinjau"><option value="46">Pratinjau 46 px</option><option value="24">Uji 24 px</option></select><button id="theme" type="button">Uji latar gelap</button></div><div class="palette"><strong>Palet identitas</strong>${Object.entries(palette).map(([name,color])=>`<span><i class="swatch" style="background:${color}"></i>${color}</span>`).join('')}<span id="count">${icons.length} ikon ditampilkan</span></div><div class="notice">Buka tautan di setiap kartu untuk mengambil file SVG. Katalog ini dapat dibuka langsung tanpa internet. Aset disimpan terpisah; pemasangan ke layar aplikasi belum dilakukan.</div>${cards}<p id="empty" hidden>Tidak ada ikon yang cocok. Coba kata lain.</p><footer class="foot">LaporJalan · Ikon dibuat khusus mengikuti identitas logo · Nama, fungsi, dan lokasi file tersedia di manifest.json dan PANDUAN.md.</footer></main><script>
const original=[...document.querySelectorAll('.sample')].map(e=>e.innerHTML);const mono=${JSON.stringify(icons.map(i=>svg(i,true)))};const search=document.getElementById('search');search.addEventListener('input',()=>{let count=0;for(const card of document.querySelectorAll('.card')){card.hidden=!card.dataset.search.includes(search.value.trim().toLowerCase());if(!card.hidden)count++}for(const section of document.querySelectorAll('section'))section.hidden=![...section.querySelectorAll('.card')].some(c=>!c.hidden);document.getElementById('count').textContent=count+' ikon ditampilkan';document.getElementById('empty').hidden=count>0});document.getElementById('variant').addEventListener('change',e=>{document.body.classList.toggle('mono',e.target.value==='mono');document.querySelectorAll('.sample').forEach((el,i)=>el.innerHTML=e.target.value==='mono'?mono[i]:original[i])});document.getElementById('size').addEventListener('change',e=>document.body.classList.toggle('size24',e.target.value==='24'));document.getElementById('theme').addEventListener('click',e=>{const dark=document.body.classList.toggle('dark');e.target.textContent=dark?'Uji latar terang':'Uji latar gelap'});
</script></body></html>`;
await fs.writeFile(path.join(root,'index.html'),html.replace(/(<a download href="svg\/berwarna\/([^"<>]+)\.svg">SVG warna ↗<\/a>)/g, '$1<a download href="png/berwarna/$2.png">PNG ↗</a>'));
for (const [variant,mono] of [['berwarna',false],['satu-warna',true]]) {
  const atlas=`<!doctype html><html><head><meta charset="utf-8"><style>*{box-sizing:border-box}html,body{margin:0;padding:0;background:transparent;width:2048px}body{display:grid;grid-template-columns:repeat(8,256px);grid-auto-rows:256px}svg{display:block;width:256px;height:256px}</style></head><body>${icons.map(i=>svg(i,mono)).join('')}</body></html>`;
  await fs.writeFile(path.join(root,'source',`atlas-${variant}.html`),atlas);
}

const guide = `# Ikon Fitur LaporJalan\n\n${icons.length} ikon asli untuk fitur yang ditemukan pada aplikasi mobile dan web admin saat paket ini dibuat. Berbasis logo hijau dengan simbol lokasi/jalan dan aksen kuning.\n\n## Mulai dari sini\n\nBuka **index.html** untuk melihat seluruh ikon, mencari berdasarkan nama fitur, beralih ke satu warna, serta menguji ukuran 24 px dan latar gelap. Tidak memerlukan internet. Logo utama tetap berada satu folder di atas: ../laporjalan-icon.png.\n\n## Susunan folder\n\n- index.html: katalog interaktif.\n- svg/berwarna/: ikon hijau dengan isian hijau muda/krem dan aksen kuning.\n- svg/satu-warna/: ikon currentColor untuk mengikuti warna teks atau tombol.\n- sprite-berwarna.svg dan sprite-satu-warna.svg: semua simbol dalam satu file untuk web.\n- manifest.json: daftar lengkap dan pemetaan fitur ke lokasi file.\n- source/generate.mjs: sumber geometri SVG dan generator katalog.\n\n## Aturan visual\n\nGrid 32 × 32, garis 1,8 unit, ujung dan sambungan membulat. Gunakan ukuran 24 atau 32 px untuk antarmuka; 48–96 px untuk kartu fitur. SVG tidak pecah saat diperbesar dan latarnya transparan. Hijau utama #0B5D4B, hijau lembut #E2EFEA, krem #FFF9EB, aksen kuning #F2B705. Gunakan label/status selain warna agar aksesibel. Varian satu warna dapat tampil putih/krem di tombol hijau.\n\nUntuk SVG yang dipasang sebagai img, warna currentColor di dalam file tidak diwariskan dari halaman. Gunakan inline SVG atau sprite jika perlu mewarisi warna teks. Contoh sprite melalui server web lokal:\n\n\`\`\`html\n<svg width="24" height="24" style="color:#0B5D4B" aria-hidden="true">\n  <use href="sprite-satu-warna.svg#lj-beranda"></use>\n</svg>\n\`\`\`\n\nIkon dekoratif: aria-hidden. Tombol hanya ikon: tambahkan aria-label pada tombol. React Native memerlukan renderer SVG seperti react-native-svg atau ekspor PNG; file SVG tidak langsung dapat dipasang ke komponen Image standar. Paket ini belum mengubah antarmuka aplikasi atau menambah dependency.\n\n## Daftar dan pemetaan fitur\n\n${grouped.map(([id,g])=>`### ${g.label}\n\n| Ikon | Fungsi | Berkas berwarna |\n|---|---|---|\n${g.icons.map(i=>`| ${i.label} | ${i.use} | svg/berwarna/${id}/${i.id}.svg |`).join('\n')}`).join('\n\n')}\n\n## Pemeriksaan\n\nGenerator memeriksa ID unik, referensi file, token warna, dan batas markup dasar. Uji ukuran kecil dan kebutuhan aksesibilitas akhir tetap dilakukan saat ikon dipasang pada layar sebenarnya. Fitur unduh/bagikan/bantuan disediakan sebagai aset pendukung; keberadaan ikon tidak berarti fungsi tersebut sudah dibuat di aplikasi.\n\nBangun ulang aset dengan menjalankan node design/icons/fitur/source/generate.mjs dari folder project.\n`;
await fs.writeFile(path.join(root,'PANDUAN.md'),guide);
await fs.appendFile(path.join(root,'PANDUAN.md'),'\n## Ekspor PNG dan paket\n\nFolder png/berwarna/ dan png/satu-warna/ berisi versi 256 × 256 px dengan latar transparan, siap diimpor sebagai gambar di mobile atau web. Gunakan SVG sebagai master untuk perubahan ukuran/warna. pratinjau.png adalah lembar semua ikon, bukan file ikon individual. Untuk mengulang ekspor PNG di Windows, jalankan source/export-png.ps1 setelah generator; memerlukan Microsoft Edge. Lihat source/QA.json untuk hasil pemeriksaan aset.\n');

// A self-contained overview sheet, suitable for browser viewing or rendering.
const W=1440, cols=8, cellW=166, cellH=132, left=56;
let y=216;
let sheet=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="HEIGHT" viewBox="0 0 ${W} HEIGHT"><rect width="100%" height="100%" fill="#F2F4F3"/><rect width="1440" height="170" fill="#0B5D4B"/><text x="56" y="57" fill="#F2B705" font-family="Segoe UI,Arial" font-size="14" letter-spacing="3">LAPORJALAN / SISTEM IKON FITUR</text><text x="56" y="112" fill="#FFF9EB" font-family="Segoe UI,Arial" font-weight="700" font-size="42">${icons.length} ikon. Satu identitas.</text><text x="56" y="146" fill="#D7E9E0" font-family="Segoe UI,Arial" font-size="17">Navigasi, laporan, aksesibilitas, wilayah, status, komunitas, dan pengelolaan.</text>`;
for (const [,g] of grouped) {
  sheet+=`<text x="56" y="${y}" fill="#0B5D4B" font-family="Segoe UI,Arial" font-size="22" font-weight="700">${g.label.replaceAll('&','&amp;')}</text>`;
  y+=20;
  g.icons.forEach((icon,i)=>{const x=left+(i%cols)*cellW,yy=y+Math.floor(i/cols)*cellH;sheet+=`<rect x="${x}" y="${yy}" width="154" height="116" rx="14" fill="white" stroke="#D9DFDC"/><svg x="${x+53}" y="${yy+15}" width="48" height="48" viewBox="0 0 32 32" fill="none" color="#0B5D4B" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body(icon)}</svg><text x="${x+77}" y="${yy+85}" text-anchor="middle" fill="#16201D" font-family="Segoe UI,Arial" font-size="11">${icon.label.replaceAll('&','&amp;')}</text><text x="${x+77}" y="${yy+103}" text-anchor="middle" fill="#62716B" font-family="Segoe UI,Arial" font-size="9">${icon.id}</text>`;});
  y+=Math.ceil(g.icons.length/cols)*cellH+28;
}
sheet+=`<text x="56" y="${y+8}" fill="#62716B" font-family="Segoe UI,Arial" font-size="13">SVG transparan · 2 varian · Grid 32 × 32 · Katalog lengkap: index.html</text></svg>`;
await fs.writeFile(path.join(root,'pratinjau.svg'),sheet.replaceAll('HEIGHT',String(y+50)));

if(new Set(icons.map(i=>i.id)).size!==icons.length)throw Error('Duplicate icon IDs');
for(const icon of manifest.icons){for(const key of ['svg','mono']){const data=await fs.readFile(path.join(root,icon[key]),'utf8');if(/SOFT|CREAM|ACCENT|INK|undefined|NaN/.test(data))throw Error(`Unresolved token ${icon.id}`);if(!data.includes('<title')||!data.includes('viewBox="0 0 32 32"'))throw Error(`Invalid SVG ${icon.id}`);}}
console.log(JSON.stringify({icons:icons.length,svgFiles:icons.length*2,groups:grouped.length,root,sheetHeight:y+50}));
