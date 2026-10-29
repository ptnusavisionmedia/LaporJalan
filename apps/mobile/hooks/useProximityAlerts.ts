import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchNearby } from '@/services/reports';
import { supabase } from '@/services/supabase';

const KEY = 'proximity.alerted.v1';
const SUPPRESS_MS = 24 * 3600 * 1000; // never re-alert the same report within 24 h

export type Danger = Awaited<ReturnType<typeof fetchNearby>>[number];

async function loadAlerted(): Promise<Record<string, number>> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    const now = Date.now();
    return Object.fromEntries(Object.entries(map).filter(([, t]) => now - t < SUPPRESS_MS));
  } catch {
    return {};
  }
}

export function useProfilePrefs(userId: string) {
  return useQuery({
    queryKey: ['prefs', userId],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('alert_radius_m,notification_prefs').eq('id', userId).single();
      if (error) throw error;
      return data as { alert_radius_m: number; notification_prefs: { nearby_alerts?: boolean; status_updates?: boolean } };
    },
  });
}

/**
 * Foreground-only proximity check. It runs while the app is open, only when the user turned
 * "peringatan area berbahaya" on AND granted location permission, and samples at most every
 * 200 m / 60 s with balanced accuracy. Background alerts are NOT implemented (they need a
 * development build and device testing; see docs/EXPO_GO.md).
 */
export function useProximityAlerts(userId: string) {
  const prefs = useProfilePrefs(userId);
  const qc = useQueryClient();
  const [alerts, setAlerts] = useState<Danger[]>([]);
  const alerted = useRef<Record<string, number>>({});
  const enabled = prefs.data?.notification_prefs?.nearby_alerts === true;
  const radius = prefs.data?.alert_radius_m ?? 500;

  useEffect(() => {
    if (!enabled) { setAlerts([]); return; }
    let sub: Location.LocationSubscription | undefined;
    let cancelled = false;

    (async () => {
      const perm = await Location.getForegroundPermissionsAsync();
      if (!perm.granted || cancelled) return; // never prompt from a background effect
      alerted.current = await loadAlerted();
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 200, timeInterval: 60_000 },
        async (pos) => {
          try {
            const near = await qc.fetchQuery({
              queryKey: ['proximity', pos.coords.latitude.toFixed(3), pos.coords.longitude.toFixed(3), radius],
              queryFn: () => fetchNearby(pos.coords.latitude, pos.coords.longitude, radius),
              staleTime: 60_000,
            });
            const fresh = near.filter(
              (r) => (r.severity === 'high' || r.severity === 'critical') && r.status !== 'selesai' && !alerted.current[r.id],
            );
            if (fresh.length) setAlerts((cur) => [...cur, ...fresh.filter((f) => !cur.some((c) => c.id === f.id))]);
          } catch {
            // transient network failure: try again on the next position update
          }
        },
      );
    })();

    return () => { cancelled = true; sub?.remove(); };
  }, [enabled, radius, qc]);

  const dismiss = useCallback(async (id: string) => {
    alerted.current[id] = Date.now();
    setAlerts((cur) => cur.filter((a) => a.id !== id));
    try { await AsyncStorage.setItem(KEY, JSON.stringify(alerted.current)); } catch { /* storage unavailable */ }
  }, []);

  return { alerts, dismiss };
}
