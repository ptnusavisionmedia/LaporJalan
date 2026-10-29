import { DAMAGE_CATEGORIES, REPORT_STATUSES, SEVERITIES, labelOf } from '@laporjalan/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Alert, Image, ScrollView, Text, View } from 'react-native';
import { Button, Card, ErrorState, Skeleton, StatusBadge } from '@/components/ui';
import { confirmReport, fetchReportDetail } from '@/services/reports';
import { useSession } from '@/stores/session';

export default function ReportDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useSession((s) => s.session!.user.id);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['report', id], queryFn: () => fetchReportDetail(id, userId) });
  const confirm = useMutation({
    mutationFn: (t: 'still_exists' | 'repaired') => confirmReport(id, t),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['report', id] }),
    onError: (e) => Alert.alert('Gagal', e instanceof Error ? e.message : 'Coba lagi.'),
  });

  return (
    <ScrollView className="flex-1 bg-background dark:bg-navy" contentContainerClassName="p-5">
      <Stack.Screen options={{ headerShown: true, title: 'Detail Laporan' }} />
      {q.isLoading ? <><Skeleton height={180} /><Skeleton /></> : q.isError || !q.data ? (
        <ErrorState message="Laporan tidak ditemukan atau gagal dimuat." onRetry={() => q.refetch()} />
      ) : (() => {
        const { report, photoUrls, history, evidence } = q.data;
        const own = report.reporter_id === userId;
        const before = evidence.filter((e) => e.kind !== 'after');
        const after = evidence.filter((e) => e.kind === 'after');
        return (
          <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
              {photoUrls.map((u, i) => <Image key={u} source={{ uri: u }} accessibilityLabel={`Foto kerusakan ${i + 1}`} className="mr-2 h-48 w-64 rounded-2xl" />)}
            </ScrollView>
            <Text accessibilityRole="header" className="mb-1 text-xl font-bold text-navy dark:text-white">{report.title}</Text>
            <StatusBadge status={report.status} />
            <Text className="mt-3 text-navy dark:text-slate-200">{report.description}</Text>
            <Text className="mt-2 text-muted">{labelOf(DAMAGE_CATEGORIES, report.category)} · Keparahan (estimasi): {labelOf(SEVERITIES, report.severity)}</Text>
            {report.road_name ? <Text className="text-muted">Jalan: {report.road_name}</Text> : null}
            <Text className="text-muted">Diperbarui: {new Date(report.updated_at).toLocaleString('id-ID')}</Text>

            {own ? (
              <>
                <Text className="mb-2 mt-5 text-lg font-semibold text-navy dark:text-white">Riwayat status</Text>
                {history.map((h, i) => (
                  <Card key={i}>
                    <Text className="font-semibold text-navy dark:text-white">{labelOf(REPORT_STATUSES, h.to_status)}</Text>
                    <Text className="text-xs text-muted">{new Date(h.created_at).toLocaleString('id-ID')}</Text>
                    {h.note ? <Text className="mt-1 text-navy dark:text-slate-200">Catatan: {h.note}</Text> : null}
                  </Card>
                ))}
              </>
            ) : null}

            {evidence.length > 0 ? (
              <>
                <Text className="mb-2 mt-5 text-lg font-semibold text-navy dark:text-white">Dokumentasi perbaikan</Text>
                {[['Sebelum / proses', before], ['Sesudah', after]].map(([label, list]) => (list as typeof evidence).length ? (
                  <View key={label as string} className="mb-3">
                    <Text className="mb-1 text-muted">{label as string}</Text>
                    <ScrollView horizontal>
                      {(list as typeof evidence).map((e, i) => e.url ? <Image key={i} source={{ uri: e.url }} accessibilityLabel={`Foto ${label as string}`} className="mr-2 h-36 w-48 rounded-xl" /> : null)}
                    </ScrollView>
                  </View>
                ) : null)}
              </>
            ) : null}

            {report.is_public && !own ? (
              <>
                <Text className="mb-1 mt-5 text-lg font-semibold text-navy dark:text-white">Validasi komunitas</Text>
                <Text className="mb-3 text-muted">
                  {q.data.stillExists} masih rusak · {q.data.repaired} tampak diperbaiki
                  {q.data.lastConfirmedAt ? ` · terakhir ${new Date(q.data.lastConfirmedAt).toLocaleDateString('id-ID')}` : ''}.
                  Konfirmasi komunitas tidak mengubah status resmi.
                </Text>
                <View className="gap-2">
                  <Button title={q.data.myConfirmation === 'still_exists' ? 'Anda: masih rusak ✓' : 'Kerusakan masih ada'} loading={confirm.isPending} onPress={() => confirm.mutate('still_exists')} />
                  <Button variant="secondary" title={q.data.myConfirmation === 'repaired' ? 'Anda: sudah diperbaiki ✓' : 'Tampak sudah diperbaiki'} loading={confirm.isPending} onPress={() => confirm.mutate('repaired')} />
                </View>
              </>
            ) : null}
          </View>
        );
      })()}
    </ScrollView>
  );
}
