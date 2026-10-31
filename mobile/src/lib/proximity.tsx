import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Pressable, StyleSheet, Text, Vibration, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { Icon } from '../components/Icon';
import { fetchMapReports } from './api';
import { categoryMeta, colors, distanceMeters } from './theme';
import type { Report } from './types';

const KEY = 'alerts_enabled';
const RADIUS_M = 200;

// ---- preferensi on/off (disimpan di perangkat) ----
let enabled = true;
const listeners = new Set<() => void>();
AsyncStorage.getItem(KEY)
  .then((v) => {
    if (v === '0') {
      enabled = false;
      listeners.forEach((l) => l());
    }
  })
  .catch(() => {});

export function setAlertsEnabled(v: boolean) {
  enabled = v;
  AsyncStorage.setItem(KEY, v ? '1' : '0').catch(() => {});
  listeners.forEach((l) => l());
}
export function useAlertsEnabled() {
  return useSyncExternalStore(
    (cb) => (listeners.add(cb), () => listeners.delete(cb)),
    () => enabled,
  );
}

const isDangerous = (r: Report) =>
  r.status !== 'selesai' &&
  r.status !== 'ditolak' &&
  (r.severity >= 3 || r.category === 'area_berbahaya' || r.priority_score >= 70);

/**
 * Peringatan area berbahaya: selama aplikasi terbuka, pantau lokasi dan tampilkan
 * banner + getar saat pengguna mendekati (<= 200 m) laporan yang berbahaya.
 * (Notifikasi saat aplikasi tertutup butuh development build, tidak tersedia di Expo Go.)
 */
export function ProximityBanner() {
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const on = useAlertsEnabled();
  const [alert, setAlert] = useState<{ report: Report; meters: number } | null>(null);
  const reports = useRef<Report[]>([]);
  const alerted = useRef(new Set<string>());

  useEffect(() => {
    if (!on) return;
    let sub: Location.LocationSubscription | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const refresh = () =>
      fetchMapReports()
        .then((r) => (reports.current = r.filter(isDangerous)))
        .catch(() => {});

    (async () => {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted' || cancelled) return;
      await refresh();
      timer = setInterval(refresh, 5 * 60 * 1000);
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 40, timeInterval: 15000 },
        (pos) => {
          let best: { report: Report; meters: number } | null = null;
          for (const r of reports.current) {
            if (alerted.current.has(r.id) || r.latitude == null || r.longitude == null) continue;
            const m = distanceMeters(pos.coords.latitude, pos.coords.longitude, r.latitude, r.longitude);
            if (m <= RADIUS_M && (!best || m < best.meters)) best = { report: r, meters: m };
          }
          if (best) {
            alerted.current.add(best.report.id);
            Vibration.vibrate([0, 300, 150, 300]);
            setAlert(best);
          }
        },
      );
    })().catch(() => {});

    return () => {
      cancelled = true;
      sub?.remove();
      if (timer) clearInterval(timer);
    };
  }, [on]);

  useEffect(() => {
    if (!alert) return;
    const t = setTimeout(() => setAlert(null), 12000);
    return () => clearTimeout(t);
  }, [alert]);

  if (!alert) return null;
  const { report, meters } = alert;
  return (
    <Pressable
      style={[styles.banner, { top: insets.top + 8 }]}
      onPress={() => {
        setAlert(null);
        nav.navigate('ReportDetail', { id: report.id });
      }}
    >
      <Icon name="area-berbahaya" size={43} />
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Hati-hati! Area berbahaya ±{Math.round(meters)} m</Text>
        <Text style={styles.sub} numberOfLines={2}>
          {categoryMeta[report.category]?.label}: {report.title}
        </Text>
      </View>
      <Pressable onPress={() => setAlert(null)} hitSlop={10}>
        <Icon name="tutup" size={37} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 48,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.danger,
    padding: 12,
    borderRadius: 12,
    elevation: 8,
    zIndex: 100,
  },
  title: { color: '#fff', fontWeight: '800' },
  sub: { color: '#FEE2E2', fontSize: 12 },
});
