import { DAMAGE_CATEGORIES, labelOf } from '@laporjalan/shared';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import { Card, EmptyState, ErrorState, Skeleton, StatusBadge } from '@/components/ui';
import { fetchMyReports } from '@/services/reports';
import { useSession } from '@/stores/session';

export default function ActivityScreen() {
  const userId = useSession((s) => s.session!.user.id);
  const q = useInfiniteQuery({
    queryKey: ['my-reports', userId],
    queryFn: ({ pageParam }) => fetchMyReports(userId, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last) => last.next,
  });
  const rows = q.data?.pages.flatMap((p) => p.rows) ?? [];

  return (
    <View className="flex-1 bg-background pt-14 dark:bg-navy">
      <Text accessibilityRole="header" className="px-5 pb-3 text-2xl font-bold text-navy dark:text-white">Aktivitas</Text>
      {q.isLoading ? (
        <View className="px-5"><Skeleton /><Skeleton /><Skeleton /></View>
      ) : q.isError ? (
        <ErrorState message="Riwayat laporan gagal dimuat. Periksa koneksi Anda." onRetry={() => q.refetch()} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.id}
          contentContainerClassName="px-5 pb-8"
          onEndReached={() => q.hasNextPage && !q.isFetchingNextPage && q.fetchNextPage()}
          onEndReachedThreshold={0.5}
          refreshing={q.isRefetching}
          onRefresh={() => q.refetch()}
          ListEmptyComponent={<EmptyState title="Belum ada laporan" message="Laporan yang Anda buat akan muncul di sini beserta statusnya." />}
          ListFooterComponent={q.isFetchingNextPage ? <ActivityIndicator /> : undefined}
          renderItem={({ item }) => (
            <Link href={{ pathname: '/report/[id]', params: { id: item.id } }} asChild>
              <Card>
                <Text className="mb-1 font-semibold text-navy dark:text-white">{item.title}</Text>
                <Text className="mb-2 text-muted">{labelOf(DAMAGE_CATEGORIES, item.category)} · {new Date(item.created_at).toLocaleDateString('id-ID')}</Text>
                <StatusBadge status={item.status} />
              </Card>
            </Link>
          )}
        />
      )}
    </View>
  );
}
