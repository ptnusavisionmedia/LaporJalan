import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { Alert, ScrollView, Switch, Text, View } from 'react-native';
import { Button, Card, Chip } from '@/components/ui';
import { useProfilePrefs } from '@/hooks/useProximityAlerts';
import { pushSupported, registerForPush } from '@/services/push';
import { fetchMyStats } from '@/services/reports';
import { supabase } from '@/services/supabase';
import { useSession } from '@/stores/session';

const RADII = [250, 500, 1000, 2000];

export default function ProfileScreen() {
  const user = useSession((s) => s.session!.user);
  const qc = useQueryClient();
  const stats = useQuery({ queryKey: ['my-stats', user.id], queryFn: () => fetchMyStats(user.id) });
  const profile = useQuery({
    queryKey: ['profile', user.id],
    queryFn: async () => (await supabase.from('profiles').select('full_name').eq('id', user.id).single()).data,
  });
  const prefs = useProfilePrefs(user.id);
  const np = prefs.data?.notification_prefs ?? {};

  const save = useMutation({
    mutationFn: async (patch: { alert_radius_m?: number; notification_prefs?: Record<string, boolean | undefined> }) => {
      const { error } = await supabase.from('profiles').update(patch).eq('id', user.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prefs', user.id] }),
    onError: () => Alert.alert('Gagal', 'Pengaturan tidak tersimpan. Coba lagi.'),
  });

  const setPref = (key: string, value: boolean) => save.mutate({ notification_prefs: { ...np, [key]: value } });

  const toggleNearby = async (on: boolean) => {
    if (on) {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) return Alert.alert('Izin lokasi diperlukan', 'Peringatan area berbahaya memerlukan izin lokasi saat aplikasi dibuka.');
    }
    setPref('nearby_alerts', on);
  };

  const enablePush = async () => {
    const r = await registerForPush();
    Alert.alert(r.ok ? 'Berhasil' : 'Tidak dapat diaktifkan', r.ok ? 'Notifikasi push diaktifkan di perangkat ini.' : r.reason);
  };

  const requestDeletion = () =>
    Alert.alert('Hapus akun?', 'Permintaan penghapusan akan diproses. Laporan Anda dipertahankan tanpa identitas.', [
      { text: 'Batal' },
      {
        text: 'Ajukan',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.rpc('request_account_deletion');
          Alert.alert(error ? 'Gagal' : 'Permintaan tercatat', error ? 'Coba lagi nanti.' : 'Kami akan memproses permintaan Anda.');
        },
      },
    ]);

  return (
    <ScrollView className="flex-1 bg-background dark:bg-navy" contentContainerClassName="gap-3 p-5 pt-14">
      <Text accessibilityRole="header" className="text-2xl font-bold text-navy dark:text-white">Profil</Text>
      <Card>
        <Text className="text-lg font-semibold text-navy dark:text-white">{profile.data?.full_name || '-'}</Text>
        <Text className="text-muted">{user.email}</Text>
      </Card>
      <Card>
        <Text className="text-navy dark:text-slate-200">Laporan dikirim: {stats.data?.total ?? '-'}</Text>
        <Text className="text-navy dark:text-slate-200">Terverifikasi: {stats.data?.verified ?? '-'}</Text>
        <Text className="text-navy dark:text-slate-200">Selesai: {stats.data?.completed ?? '-'}</Text>
      </Card>

      <Text className="mt-2 text-lg font-semibold text-navy dark:text-white">Notifikasi & privasi</Text>
      <Card>
        <View className="min-h-12 flex-row items-center justify-between">
          <Text className="mr-3 flex-1 text-navy dark:text-slate-200">Pembaruan status laporan</Text>
          <Switch accessibilityLabel="Pembaruan status laporan" value={np.status_updates !== false} onValueChange={(v) => setPref('status_updates', v)} />
        </View>
        <View className="min-h-12 flex-row items-center justify-between">
          <Text className="mr-3 flex-1 text-navy dark:text-slate-200">Peringatan area berbahaya (saat aplikasi terbuka, memakai lokasi)</Text>
          <Switch accessibilityLabel="Peringatan area berbahaya" value={np.nearby_alerts === true} onValueChange={toggleNearby} />
        </View>
        <Text className="mb-2 mt-2 text-sm text-muted">Radius peringatan</Text>
        <View className="flex-row flex-wrap gap-2">
          {RADII.map((r) => (
            <Chip key={r} label={r >= 1000 ? `${r / 1000} km` : `${r} m`} selected={prefs.data?.alert_radius_m === r} onPress={() => save.mutate({ alert_radius_m: r })} />
          ))}
        </View>
      </Card>
      <Button title="Lihat notifikasi" variant="secondary" onPress={() => router.push('/notifications')} />
      {pushSupported ? <Button title="Aktifkan notifikasi push" variant="secondary" onPress={enablePush} /> : (
        <Text className="text-sm text-muted">Notifikasi push tidak tersedia di Expo Go; gunakan development build.</Text>
      )}

      <Button title="Kebijakan Privasi" variant="secondary" onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'privacy' } })} />
      <Button title="Syarat Layanan" variant="secondary" onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'terms' } })} />
      <Button title="Keluar" variant="secondary" onPress={() => supabase.auth.signOut()} />
      <Button title="Ajukan penghapusan akun" variant="danger" onPress={requestDeletion} />
    </ScrollView>
  );
}
