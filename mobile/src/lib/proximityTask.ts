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
const CACHE_TTL_MS = 5 * 60 * 1000;
// Satu titik bahaya hanya diberitahukan sekali per 6 jam, supaya tidak berulang di tempat yang sama.
const REALERT_MS = 6 * 60 * 60 * 1000;

type Danger = Pick<Report, 'id' | 'title' | 'category'> & { latitude: number; longitude: number };

// Saat aplikasi terbuka, peringatan ditampilkan sebagai banner di dalam aplikasi (bukan kotak notifikasi sistem).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: true,
    shouldPlaySound: false,
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

  alerted[best.report.id] = now;
  for (const id of Object.keys(alerted)) if (now - alerted[id] > REALERT_MS) delete alerted[id];
  await AsyncStorage.setItem(ALERTED_KEY, JSON.stringify(alerted)).catch(() => {});
  await notifyDanger(best.report, best.meters);
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
 * Minta izin lalu aktifkan peringatan.
 * 'full' = notifikasi juga muncul saat aplikasi tertutup; 'foreground' = hanya saat aplikasi terbuka; 'denied' = izin ditolak.
 */
export async function enableAlerts(): Promise<EnableResult> {
  await ensureChannel();
  const notif = await Notifications.requestPermissionsAsync();
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted' || !notif.granted) return 'denied';
  const bg = await Location.requestBackgroundPermissionsAsync();
  if (bg.status !== 'granted') return 'foreground';
  await startBackground();
  return 'full';
}

/** Dipanggil saat aplikasi dibuka: lanjutkan pemantauan latar belakang bila izinnya sudah ada (tanpa menampilkan permintaan izin). */
export async function resumeBackground() {
  const [bg, notif] = await Promise.all([Location.getBackgroundPermissionsAsync(), Notifications.getPermissionsAsync()]);
  if (bg.status === 'granted' && notif.granted) {
    await ensureChannel();
    await startBackground();
  }
}
