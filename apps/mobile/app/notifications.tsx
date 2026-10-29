import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, router } from 'expo-router';
import { FlatList, Text, View } from 'react-native';
import { Card, EmptyState, ErrorState, Skeleton } from '@/components/ui';
import { supabase } from '@/services/supabase';

type N = { id: string; title: string; body: string; data: { report_id?: string }; read_at: string | null; created_at: string };

export default function NotificationsScreen() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data, error } = await supabase.from('notifications').select('id,title,body,data,read_at,created_at').order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      return (data ?? []) as N[];
    },
  });
  const markRead = useMutation({
    mutationFn: async (id: string) => { await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  return (
    <View className="flex-1 bg-background dark:bg-navy">
      <Stack.Screen options={{ headerShown: true, title: 'Notifikasi' }} />
      {q.isLoading ? <View className="p-5"><Skeleton /><Skeleton /></View> : q.isError ? (
        <ErrorState message="Notifikasi gagal dimuat." onRetry={() => q.refetch()} />
      ) : (
        <FlatList
          data={q.data}
          keyExtractor={(n) => n.id}
          contentContainerClassName="p-5"
          ListEmptyComponent={<EmptyState title="Belum ada notifikasi" message="Pembaruan status laporan Anda akan muncul di sini." />}
          renderItem={({ item }) => (
            <Card
              onPress={() => {
                if (!item.read_at) markRead.mutate(item.id);
                if (item.data?.report_id) router.push({ pathname: '/report/[id]', params: { id: item.data.report_id } });
              }}
            >
              <Text className={`text-navy dark:text-white ${item.read_at ? '' : 'font-bold'}`}>{item.title}</Text>
              <Text className="text-navy dark:text-slate-200">{item.body}</Text>
              <Text className="mt-1 text-xs text-muted">{new Date(item.created_at).toLocaleString('id-ID')}</Text>
            </Card>
          )}
        />
      )}
    </View>
  );
}
