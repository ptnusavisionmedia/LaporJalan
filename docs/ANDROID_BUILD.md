# Build Android (EAS)

**Belum ada build yang dibuat.** `eas.json` dan `app.config.ts` sudah siap, tetapi build butuh akun Expo, proyek EAS, dan (untuk push) kredensial FCM milik Anda.

## Prasyarat

1. Akun Expo; `npm i -g eas-cli`; `eas login`.
2. Di `apps/mobile`: `eas init` -> salin project id ke `EAS_PROJECT_ID`.
3. Tentukan `ANDROID_PACKAGE` (unik, mis. `id.namaanda.laporjalan`) **sebelum** build pertama; mengubahnya kemudian berarti aplikasi baru di Play Store.
4. Variabel publik untuk build: simpan sebagai EAS environment variable (`eas env:create`), bukan di repo: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `ANDROID_PACKAGE`, `EAS_PROJECT_ID`.
5. Keystore: biarkan EAS membuat dan menyimpannya (`eas credentials`). Jangan commit `.jks`/`google-services.json` (sudah di `.gitignore`).

## Profil (`apps/mobile/eas.json`)

| Profil | Hasil | Pakai untuk |
|---|---|---|
| `development` | APK development client | push, lokasi latar belakang (jika dibuat), modul native |
| `preview` | APK terpasang langsung | uji internal |
| `production` | AAB (`app-bundle`), versi otomatis naik | Google Play |

```bash
cd apps/mobile
eas build --profile development --platform android
eas build --profile preview --platform android     # APK
eas build --profile production --platform android  # AAB
```

## Push (FCM)

Buat proyek Firebase, unduh service account key untuk FCM V1, unggah lewat `eas credentials` (Android -> Google Service Account Key for push). Kunci ini hanya ada di EAS.

## Google Play

Perlu akun pengembang Play, tautan Kebijakan Privasi yang dihosting publik (draf ada di aplikasi dan `docs/`, **perlu tinjauan hukum**), formulir Data Safety (lokasi, foto, email, ID perangkat), ikon/screenshot, rating konten, dan uji tertutup sesuai syarat Play untuk akun baru. Mulai dari track internal: `eas submit --platform android --profile production`.

## Sebelum rilis

Ganti ubin OSM publik (lihat EXPO_GO.md), isi placeholder pada draf hukum, jalankan `supabase/tests/security.sql`, dan uji di perangkat Android nyata.
