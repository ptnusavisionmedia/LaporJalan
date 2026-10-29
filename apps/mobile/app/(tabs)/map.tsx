import { DAMAGE_CATEGORIES, SEVERITIES, clusterPoints, labelOf } from '@laporjalan/shared';
import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { Link } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import MapView, { Marker, UrlTile, type Region } from 'react-native-maps';
import { Button, Card, Chip, StatusBadge } from '@/components/ui';
import { fetchBbox, type MapReport } from '@/services/reports';

// Indonesia overview
const INITIAL: Region = { latitude: -2.5, longitude: 118, latitudeDelta: 30, longitudeDelta: 30 };

// Marker colours: red critical, orange high, yellow medium, green repaired (and low).
const colorOf = (r: MapReport) =>
  r.status === 'selesai' ? '#16A34A' : r.severity === 'critical' ? '#DC2626' : r.severity === 'high' ? '#F59E0B' : r.severity === 'medium' ? '#EAB308' : '#16A34A';

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [debounced, setDebounced] = useState<Region | null>(null);
  const [severities, setSeverities] = useState<string[]>([]);
  const [includeRepaired, setIncludeRepaired] = useState(false);
  const [selected, setSelected] = useState<MapReport | null>(null);
  const [locMsg, setLocMsg] = useState<string | null>(null);

  // Debounce viewport changes so panning does not fire a request per frame.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(region), 500);
    return () => clearTimeout(t);
  }, [region]);

  // A very wide view would return an arbitrary 300 of a huge set: ask the user to zoom in.
  const tooWide = !!debounced && debounced.latitudeDelta > 3;
  const bbox = debounced && !tooWide ? {
    minLng: debounced.longitude - debounced.longitudeDelta / 2, maxLng: debounced.longitude + debounced.longitudeDelta / 2,
    minLat: debounced.latitude - debounced.latitudeDelta / 2, maxLat: debounced.latitude + debounced.latitudeDelta / 2,
  } : null;

  const q = useQuery({
    queryKey: ['bbox', bbox && Object.values(bbox).map((v) => v.toFixed(3)), severities, includeRepaired],
    queryFn: () => fetchBbox(bbox!, { severities, includeRepaired }),
    enabled: !!bbox,
    placeholderData: (prev) => prev,
  });

  const clusters = useMemo(
    () => (q.data && region ? clusterPoints(q.data, region.latitudeDelta) : []),
    [q.data, region],
  );

  const toggle = (v: string) => setSeverities((c) => (c.includes(v) ? c.filter((x) => x !== v) : [...c, v]));

  const locate = async () => {
    setLocMsg(null);
    const perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) return setLocMsg('Izin lokasi ditolak. Geser peta secara manual.');
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    mapRef.current?.animateToRegion({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 });
  };

  return (
    <View className="flex-1 bg-background dark:bg-navy">
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={INITIAL}
        mapType="none" // draw only the OSM tiles below
        showsUserLocation
        onRegionChangeComplete={setRegion}
        onPress={() => setSelected(null)}
        accessibilityLabel="Peta kerusakan jalan"
      >
        {/* Public OSM tiles are for development only; production needs a tile provider whose
            terms allow app traffic (see docs/EXPO_GO.md). */}
        <UrlTile urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maximumZ={19} />
        {clusters.map((c) =>
          c.items.length === 1 ? (
            <Marker
              key={c.items[0].id}
              coordinate={{ latitude: c.lat, longitude: c.lng }}
              pinColor={colorOf(c.items[0])}
              onPress={(e) => { e.stopPropagation(); setSelected(c.items[0]); }}
            />
          ) : (
            <Marker
              key={`${c.lat}:${c.lng}`}
              coordinate={{ latitude: c.lat, longitude: c.lng }}
              onPress={(e) => {
                e.stopPropagation();
                mapRef.current?.animateToRegion({ latitude: c.lat, longitude: c.lng, latitudeDelta: (region?.latitudeDelta ?? 1) / 3, longitudeDelta: (region?.longitudeDelta ?? 1) / 3 });
              }}
            >
              <View className="h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-primary">
                <Text className="font-bold text-white">{c.items.length}</Text>
              </View>
            </Marker>
          ),
        )}
      </MapView>

      <View className="absolute left-0 right-0 top-12 px-3">
        <View className="flex-row flex-wrap gap-2">
          {SEVERITIES.map((s) => (
            <Chip key={s.value} label={s.label} selected={severities.includes(s.value)} onPress={() => toggle(s.value)} />
          ))}
          <Chip label="Termasuk selesai" selected={includeRepaired} onPress={() => setIncludeRepaired((v) => !v)} />
        </View>
        {tooWide ? <Text className="mt-2 rounded-lg bg-white p-2 text-navy">Perbesar peta untuk melihat laporan.</Text> : null}
        {q.isError ? <Text accessibilityRole="alert" className="mt-2 rounded-lg bg-white p-2 text-danger">Laporan gagal dimuat. Geser peta untuk mencoba lagi.</Text> : null}
        {q.data && q.data.length >= 300 ? <Text className="mt-2 rounded-lg bg-white p-2 text-warning">Hanya 300 laporan teratas ditampilkan. Perbesar untuk rincian.</Text> : null}
        {locMsg ? <Text className="mt-2 rounded-lg bg-white p-2 text-danger">{locMsg}</Text> : null}
      </View>

      <View className="absolute bottom-3 left-3 right-3 gap-2">
        {selected ? (
          <Link href={{ pathname: '/report/[id]', params: { id: selected.id } }} asChild>
            <Card>
              <Text className="font-semibold text-navy dark:text-white">{selected.title}</Text>
              <Text className="mb-1 text-muted">{labelOf(DAMAGE_CATEGORIES, selected.category)} · {labelOf(SEVERITIES, selected.severity)}</Text>
              <StatusBadge status={selected.status} />
            </Card>
          </Link>
        ) : null}
        <Button title="Lokasi saya" variant="secondary" onPress={locate} />
        <Text className="self-start rounded bg-white/90 px-2 text-xs text-navy">© OpenStreetMap contributors</Text>
      </View>
    </View>
  );
}
