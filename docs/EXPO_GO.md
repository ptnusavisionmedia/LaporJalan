# Expo Go vs development build

| Fitur | Expo Go | Development build |
|---|---|---|
| Auth, laporan, kamera/galeri, GPS foreground | Dirancang bisa | Ya |
| Peta (`react-native-maps` + ubin OSM) | Dirancang bisa, **belum diuji di perangkat** | Ya |
| Peringatan area berbahaya (foreground) | Dirancang bisa; hanya saat aplikasi terbuka | Ya |
| Push notification jarak jauh | **Tidak** (dihapus dari Expo Go Android sejak SDK 53). Tombol disembunyikan | Ya (butuh FCM di EAS) |
| Lokasi latar belakang / geofencing | **Tidak diimplementasikan** | Belum dibuat; harus diuji di perangkat Android nyata |

Tidak ada fitur yang diuji di Expo Go atau perangkat; yang terbukti hanya bundle Android berhasil dibangun.

## Peta & ubin

- Ubin: `tile.openstreetmap.org` dipakai **hanya untuk pengembangan**. Kebijakan OSMF melarang beban produksi berat dan mewajibkan atribusi (sudah ditampilkan "© OpenStreetMap contributors"). Sebelum rilis, pilih penyedia ubin yang syaratnya mengizinkan lalu lintas aplikasi (berbayar/self-hosted) dan ganti `urlTemplate` di `app/(tabs)/map.tsx`.
- Hanya laporan di area terlihat yang diambil (`reports_in_bbox`, indeks GiST), maks. 300; di atas zoom ~3 derajat peta meminta pengguna memperbesar. Pengelompokan marker dilakukan di klien (`clusterPoints`, teruji 5 kasus).
- **Belum ada** pencarian wilayah di peta (data wilayah tidak menyimpan koordinat).

## Peringatan area berbahaya

`useProximityAlerts`: aktif hanya jika pengguna menyalakannya di Profil dan mengizinkan lokasi. Pengambilan sampel tiap >=200 m / 60 dtk (akurasi seimbang), hanya laporan tingkat tinggi/kritis yang belum selesai dalam radius pilihan, tidak diulang dalam 24 jam. Pelacakan latar belakang **tidak** diminta (`app.config.ts` tidak memuat izin latar belakang).

## Push

`registerForPush()` meminta izin notifikasi hanya saat tombol ditekan, mendaftarkan token Expo lewat RPC `register_device_token`, dan mendaftar ulang saat token berganti. Pengiriman dilakukan Edge Function `send-push` lewat layanan push Expo (FCM dikonfigurasi di EAS, bukan di aplikasi).

```bash
npm run mobile
```
