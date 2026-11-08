import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Linking, Pressable, StyleSheet, Text, Vibration, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { useNavigation } from '@react-navigation/native';
import { Icon } from '../components/Icon';
import { alert } from '../components/Dialog';
import { checkNearby, enableAlerts, ENABLED_KEY, stopBackground } from './proximityTask';
import { colors } from './theme';

// ---- preferensi on/off (disimpan di perangkat) ----
let enabled = true;
const listeners = new Set<() => void>();
AsyncStorage.getItem(ENABLED_KEY)
  .then((v) => {
    if (v === '0') {
      enabled = false;
      listeners.forEach((l) => l());
    }
  })
  .catch(() => {});

function setEnabled(v: boolean) {
  enabled = v;
  AsyncStorage.setItem(ENABLED_KEY, v ? '1' : '0').catch(() => {});
  listeners.forEach((l) => l());
}

export function useAlertsEnabled() {
  return useSyncExternalStore(
    (cb) => (listeners.add(cb), () => listeners.delete(cb)),
    () => enabled,
  );
}

/** Dipanggil dari saklar di Profil: meminta izin saat dinyalakan, menghentikan pemantauan saat dimatikan. */
export async function toggleAlerts(on: boolean) {
  if (!on) {
    setEnabled(false);
    await stopBackground();
    return;
  }
  const result = await enableAlerts().catch(() => 'denied' as const);
  if (result === 'denied') {
    setEnabled(false);
    alert('Izin diperlukan', 'Izin lokasi dan notifikasi ditolak. Aktifkan keduanya di pengaturan perangkat agar peringatan bisa berjalan.', [
      { text: 'Nanti', style: 'cancel' },
      { text: 'Buka pengaturan', onPress: () => Linking.openSettings().catch(() => {}) },
    ]);
    return;
  }
  setEnabled(true);
  if (result === 'foreground') {
    alert('Hanya saat aplikasi terbuka', 'Pemantauan di latar belakang belum bisa dijalankan. Peringatan tetap muncul selama aplikasi terbuka.');
  }
}

type Banner = { reportId: string; title: string; body: string };

/**
 * Peringatan area berbahaya. Saat pengguna mendekati (<= 200 m) laporan yang berbahaya:
 * - aplikasi tertutup: notifikasi sistem (dari tugas lokasi latar belakang di proximityTask.ts)
 * - aplikasi terbuka: banner di dalam aplikasi + getar
 */
export function ProximityBanner() {
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const on = useAlertsEnabled();
  const [banner, setBanner] = useState<Banner | null>(null);
  const handled = useRef<string | null>(null);
  const lastResponse = Notifications.useLastNotificationResponse();

  // Pemantauan: latar belakang (bila diizinkan) + saat aplikasi terbuka.
  useEffect(() => {
    if (!on) return;
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;

    (async () => {
      // Minta izin lewat dialog sistem (sekali; bila sudah diizinkan langsung lanjut). Memulai layanan pemantauan latar belakang.
      const result = await enableAlerts().catch(() => 'denied' as const);
      if (result === 'denied' || cancelled) return;
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 40, timeInterval: 15000 },
        (pos) => {
          checkNearby(pos.coords.latitude, pos.coords.longitude).catch(() => {});
        },
      );
    })().catch(() => {});

    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [on]);

  // Notifikasi yang masuk saat aplikasi terbuka -> tampilkan sebagai banner.
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener((n) => {
      const reportId = (n.request.content.data as { reportId?: string } | undefined)?.reportId;
      if (!reportId) return;
      Vibration.vibrate([0, 300, 150, 300]);
      setBanner({ reportId, title: n.request.content.title ?? 'Hati-hati! Area berbahaya', body: n.request.content.body ?? '' });
    });
    return () => sub.remove();
  }, []);

  // Ketuk notifikasi (termasuk saat aplikasi dibuka dari kondisi tertutup) -> buka detail laporan.
  useEffect(() => {
    if (!lastResponse) return;
    const id = lastResponse.notification.request.identifier;
    const reportId = (lastResponse.notification.request.content.data as { reportId?: string } | undefined)?.reportId;
    if (!reportId || handled.current === id) return;
    handled.current = id;
    const t = setTimeout(() => nav.navigate('ReportDetail', { id: reportId }), 300);
    return () => clearTimeout(t);
  }, [lastResponse, nav]);

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 12000);
    return () => clearTimeout(t);
  }, [banner]);

  if (!banner) return null;
  return (
    <Pressable
      style={[styles.banner, { top: insets.top + 8 }]}
      onPress={() => {
        setBanner(null);
        nav.navigate('ReportDetail', { id: banner.reportId });
      }}
    >
      <Icon name="area-berbahaya" size={43} />
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{banner.title}</Text>
        <Text style={styles.sub} numberOfLines={2}>
          {banner.body}
        </Text>
      </View>
      <Pressable onPress={() => setBanner(null)} hitSlop={10}>
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
