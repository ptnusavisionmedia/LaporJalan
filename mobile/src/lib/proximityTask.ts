import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { fetchMapReports } from './api';
import { categoryMeta, colors, distanceMeters } from './theme';
import type { Report } from './types';

// Modul ini diimpor dari index.ts supaya tugas latar belakang terdaftar walau aplikasi sedang tertutup.

export const PROXIMITY_TASK = 'laporjalan-proximity';
export const RADIUS_M = 200;
export const ENABLED_KEY = 'alerts_enabled';

const CHANNEL = 'bahaya';
const CACHE_KEY = 'danger_cache';
const ALERTED_KEY = 'danger_alerted';
const CACHE_TTL_MS = 2 * 60 * 1000;
// Satu titik bahaya hanya diberitahukan sekali per 30 menit, supaya tidak berulang di tempat yang sama.
const REALERT_MS = 30 * 60 * 1000;

type Danger = Pick<Report, 'id' | 'title' | 'category'> & { latitude: number; longitude: number };

// Peringatan selalu tampil sebagai notifikasi sistem (juga saat aplikasi terbuka), ditambah banner di dalam aplikasi.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const isDangerous = (r: Report) =>
  r.status !== 'selesai' &&
  r.status !== 'ditolak' &&
  r.latitude != null &&
  r.longitude != null &&
  (r.severity >= 3 || r.category === 'area_berbahaya' || r.priority_score >= 70);

async function loadDangerous(): Promise<Danger[]> {
  let cached: { at: number; list: Danger[] } | null = null;
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) cached = JSON.parse(raw);
  } catch {}
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.list;
  try {
    const list: Danger[] = (await fetchMapReports())
      .filter(isDangerous)
      .map((r) => ({ id: r.id, title: r.title, category: r.category, latitude: r.latitude as number, longitude: r.longitude as number }));
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), list }));
    return list;
  } catch {
    // Tanpa sinyal: pakai data terakhir yang tersimpan.
    return cached?.list ?? [];
  }
}

async function notifyDanger(report: Danger, meters: number) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `Hati-hati! Area berbahaya ±${Math.round(meters)} m`,
      body: `${categoryMeta[report.category]?.label ?? 'Kerusakan'}: ${report.title}`,
      data: { reportId: report.id },
      color: colors.primary,
      sound: true,
    },
    trigger: Platform.OS === 'android' ? { channelId: CHANNEL } : null,
  });
}

/** Cek apakah posisi ini dekat laporan berbahaya, dan kirim notifikasi bila ya. */
export async function checkNearby(lat: number, lng: number) {
  const list = await loadDangerous();
  let alerted: Record<string, number> = {};
  try {
    alerted = JSON.parse((await AsyncStorage.getItem(ALERTED_KEY)) ?? '{}');
  } catch {}
  const now = Date.now();

  let best: { report: Danger; meters: number } | null = null;
  for (const r of list) {
    if (now - (alerted[r.id] ?? 0) < REALERT_MS) continue;
    const m = distanceMeters(lat, lng, r.latitude, r.longitude);
    if (m <= RADIUS_M && (!best || m < best.meters)) best = { report: r, meters: m };
  }
  if (!best) return;

  await notifyDanger(best.report, best.meters);
  alerted[best.report.id] = now;
  for (const id of Object.keys(alerted)) if (now - alerted[id] > REALERT_MS) delete alerted[id];
  await AsyncStorage.setItem(ALERTED_KEY, JSON.stringify(alerted)).catch(() => {});
}

TaskManager.defineTask(PROXIMITY_TASK, async ({ data, error }) => {
  if (error) return;
  if ((await AsyncStorage.getItem(ENABLED_KEY).catch(() => null)) === '0') return;
  const locations = (data as { locations?: Location.LocationObject[] } | undefined)?.locations;
  const last = locations?.[locations.length - 1];
  if (last) await checkNearby(last.coords.latitude, last.coords.longitude);
});

async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: 'Peringatan area berbahaya',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 300, 150, 300],
    lightColor: colors.danger,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

async function startBackground() {
  if (await Location.hasStartedLocationUpdatesAsync(PROXIMITY_TASK).catch(() => false)) return;
  await Location.startLocationUpdatesAsync(PROXIMITY_TASK, {
    accuracy: Location.Accuracy.Balanced,
    distanceInterval: 50,
    timeInterval: 30000,
    // Android mewajibkan notifikasi tetap agar pemantauan lokasi tidak dihentikan saat aplikasi tertutup.
    foregroundService: {
      notificationTitle: 'LaporJalan memantau area berbahaya',
      notificationBody: 'Kamu akan diberi tahu saat dekat kerusakan berbahaya.',
      notificationColor: colors.primary,
    },
  });
}

export async function stopBackground() {
  if (await Location.hasStartedLocationUpdatesAsync(PROXIMITY_TASK).catch(() => false)) {
    await Location.stopLocationUpdatesAsync(PROXIMITY_TASK).catch(() => {});
  }
}

export type EnableResult = 'full' | 'foreground' | 'denied';

/**
 * Minta izin lalu aktifkan peringatan. Semua izin diminta lewat dialog sistem di dalam aplikasi (tanpa ke Pengaturan).
 * Pemantauan latar belakang memakai layanan latar depan (notifikasi tetap), yang TIDAK butuh izin lokasi "sepanjang waktu".
 * 'full' = notifikasi juga muncul saat aplikasi ditutup/di latar belakang; 'foreground' = hanya saat aplikasi terbuka;
 * 'denied' = izin lokasi/notifikasi ditolak.
 */
export async function enableAlerts(): Promise<EnableResult> {
  await ensureChannel();
  const notif = await Notifications.requestPermissionsAsync();
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted' || !notif.granted) return 'denied';
  try {
    await startBackground();
    return 'full';
  } catch {
    return 'foreground';
  }
}

/** Dipanggil saat aplikasi dibuka: lanjutkan pemantauan latar belakang bila izinnya sudah ada (tanpa menampilkan permintaan izin). */
export async function resumeBackground() {
  const [fg, notif] = await Promise.all([Location.getForegroundPermissionsAsync(), Notifications.getPermissionsAsync()]);
  if (fg.status === 'granted' && notif.granted) {
    await ensureChannel();
    await startBackground();
  }
}

export type Diagnosis = { lines: string[]; ok: boolean };

/** Periksa semua syarat peringatan dan kirim satu notifikasi uji. Dipakai tombol "Uji peringatan" di Profil. */
export async function diagnoseAlerts(): Promise<Diagnosis> {
  const lines: string[] = [];
  let ok = true;
  const bad = (s: string) => {
    ok = false;
    lines.push('✗ ' + s);
  };
  const good = (s: string) => lines.push('✓ ' + s);

  const notif = await Notifications.getPermissionsAsync().catch(() => null);
  notif?.granted ? good('Izin notifikasi aktif') : bad('Izin notifikasi belum diberikan');
  const fg = await Location.getForegroundPermissionsAsync().catch(() => null);
  fg?.status === 'granted' ? good('Izin lokasi aktif') : bad('Izin lokasi belum diberikan');
  const enabled = (await AsyncStorage.getItem(ENABLED_KEY).catch(() => null)) !== '0';
  enabled ? good('Saklar peringatan menyala') : bad('Saklar peringatan mati');
  const running = await Location.hasStartedLocationUpdatesAsync(PROXIMITY_TASK).catch(() => false);
  running ? good('Pemantauan latar belakang berjalan') : bad('Pemantauan latar belakang belum berjalan (buka ulang aplikasi)');

  try {
    await AsyncStorage.removeItem(CACHE_KEY);
    const list = await loadDangerous();
    if (list.length === 0) {
      bad('Tidak ada laporan berbahaya (belum selesai, tingkat parah ≥ 3 / jenis Area berbahaya / prioritas ≥ 70)');
    } else {
      good(list.length + ' laporan berbahaya terdeteksi');
      try {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        let near = list[0];
        let nearM = Infinity;
        for (const r of list) {
          const m = distanceMeters(pos.coords.latitude, pos.coords.longitude, r.latitude, r.longitude);
          if (m < nearM) {
            nearM = m;
            near = r;
          }
        }
        const txt = 'Terdekat: ' + near.title + ' ±' + Math.round(nearM) + ' m';
        nearM <= RADIUS_M ? good(txt + ' (dalam ' + RADIUS_M + ' m)') : lines.push('• ' + txt + ' (di luar ' + RADIUS_M + ' m)');
      } catch {
        bad('Posisi saat ini tidak terbaca (nyalakan GPS)');
      }
    }
  } catch (e) {
    bad('Gagal memuat laporan: ' + (e instanceof Error ? e.message : 'tidak diketahui'));
  }

  try {
    await ensureChannel();
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Uji peringatan LaporJalan', body: 'Jika notifikasi ini muncul, peringatan area berbahaya siap bekerja.', sound: true, color: colors.primary },
      trigger: Platform.OS === 'android' ? { channelId: CHANNEL } : null,
    });
    good('Notifikasi uji dikirim');
  } catch (e) {
    bad('Notifikasi uji gagal: ' + (e instanceof Error ? e.message : 'tidak diketahui'));
  }
  return { lines, ok };
}
