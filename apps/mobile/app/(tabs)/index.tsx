import { DAMAGE_CATEGORIES, labelOf } from '@laporjalan/shared';
import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Button, Card, ErrorState, Skeleton, StatusBadge } from '@/components/ui';
import { fetchMyReports, fetchMyStats, fetchNearby } from '@/services/reports';
import { supabase } from '@/services/supabase';
import { useSession } from '@/stores/session';

type Coords = { lat: number; lng: number };

export default function HomeScreen() {
  const userId = useSession((s) => s.session!.user.id);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locState, setLocState] = useState<'idle' | 'loading' | 'denied'>('idle');

  const profile = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => (await supabase.from('profiles').select('full_name').eq('id', userId).single()).data,
  });
  const stats = useQuery({ queryKey: ['my-stats', userId], queryFn: () => fetchMyStats(userId) });
  const recent = useQuery({ queryKey: ['my-reports', userId, 'recent'], queryFn: () => fetchMyReports(userId, 0) });
  const nearby = useQuery({
    queryKey: ['nearby', coords?.lat.toFixed(3), coords?.lng.toFixed(3)],
    queryFn: () => fetchNearby(coords!.lat, coords!.lng),
    enabled: !!coords,
  });

  const locate = async () => {
    setLocState('loading');
    const perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) return setLocState('denied');
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    setLocState('idle');
  };

  const name = profile.data?.full_name?.split(' ')[0];
  return (
    <ScrollView className="flex-1 bg-background dark:bg-navy" contentContainerClassName="p-5 pt-14">
      <Text accessibilityRole="header" className="text-2xl font-bold text-navy dark:text-white">
        Halo{name ? `, ${name}` : ''}
      </Text>
      <Text className="mb-5 text-muted">Bantu jaga jalan di sekitar Anda tetap aman.</Text>

      <Button title="Buat Laporan" onPress={() => router.navigate('/(tabs)/report')} />

      <Text className="mb-2 mt-6 text-lg font-semibold text-navy dark:text-white">Laporan saya</Text>
      {stats.isLoading ? <Skeleton height={72} /> : stats.isError ? (
        <ErrorState message="Statistik gagal dimuat." onRetry={() => stats.refetch()} />
      ) : (
        <View className="flex-row gap-3">
          {[['Dikirim', stats.data!.total], ['Terverifikasi', stats.data!.verified], ['Selesai', stats.data!.completed]].map(([l, v]) => (
            <View key={l as string} className="flex-1 rounded-2xl border border-border bg-surface p-3 dark:border-slate-700 dark:bg-slate-800">
              <Text className="text-2xl font-bold text-navy dark:text-white">{v}</Text>
              <Text className="text-xs text-muted">{l}</Text>
            </View>
          ))}
        </View>
      )}

      <Text className="mb-2 mt-6 text-lg font-semibold text-navy dark:text-white">Kerusakan di sekitar Anda</Text>
      {!coords ? (
        <Card>
          <Text className="mb-3 text-navy dark:text-slate-200">
            {locState === 'denied'
              ? 'Izin lokasi ditolak. Aktifkan izin lokasi di pengaturan perangkat untuk melihat laporan di sekitar Anda.'
              : 'Izinkan akses lokasi (hanya saat aplikasi dibuka) untuk melihat kerusakan yang dilaporkan dalam radius 2 km.'}
          </Text>
          <Button title="Tampilkan yang di sekitar saya" loading={locState === 'loading'} onPress={locate} />
        </Card>
      ) : nearby.isLoading ? <Skeleton /> : nearby.isError ? (
        <ErrorState message="Laporan sekitar gagal dimuat." onRetry={() => nearby.refetch()} />
      ) : nearby.data!.length === 0 ? (
        <Text className="text-muted">Belum ada laporan terverifikasi dalam radius 2 km.</Text>
      ) : (
        nearby.data!.map((r) => (
          <Link key={r.id} href={{ pathname: '/report/[id]', params: { id: r.id } }} asChild>
            <Card>
              <Text className="font-semibold text-navy dark:text-white">{r.title}</Text>
              <Text className="text-muted">{labelOf(DAMAGE_CATEGORIES, r.category)} · {Math.round(r.distance_m)} m · {r.confirm_count} konfirmasi</Text>
            </Card>
          </Link>
        ))
      )}

      <Text className="mb-2 mt-6 text-lg font-semibold text-navy dark:text-white">Laporan terbaru saya</Text>
      {recent.isLoading ? <Skeleton /> : recent.isError ? (
        <ErrorState message="Laporan gagal dimuat." onRetry={() => recent.refetch()} />
      ) : recent.data!.rows.length === 0 ? (
        <Text className="text-muted">Anda belum membuat laporan.</Text>
      ) : (
        recent.data!.rows.slice(0, 3).map((r) => (
          <Link key={r.id} href={{ pathname: '/report/[id]', params: { id: r.id } }} asChild>
            <Card>
              <Text className="mb-1 font-semibold text-navy dark:text-white">{r.title}</Text>
              <StatusBadge status={r.status} />
            </Card>
          </Link>
        ))
      )}
    </ScrollView>
  );
}
