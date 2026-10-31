import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Icon, Logo } from '../components/Icon';
import { Sticker } from '../components/Sticker';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../lib/auth';
import { fetchReports, setLike } from '../lib/api';
import type { Report } from '../lib/types';
import { colors, fonts } from '../lib/theme';
import { ReportCard } from '../components/ReportCard';

/** Dipakai untuk Beranda (semua laporan) dan Profil (laporan milik sendiri). */
export function ReportList({
  onlyMine = false,
  header,
  show = 'semua',
}: {
  onlyMine?: boolean;
  header?: React.ReactElement | ((reports: Report[]) => React.ReactElement);
  /** 'belum' = laporan yang belum selesai, 'selesai' = laporan yang sudah selesai. */
  show?: 'semua' | 'belum' | 'selesai';
}) {
  const { session } = useAuth();
  const nav = useNavigation<any>();
  const userId = session!.user.id;
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setReports(await fetchReports(onlyMine ? userId : undefined));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat laporan.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onlyMine, userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const toggleLike = async (r: Report) => {
    const liked = r.likes.some((l) => l.user_id === userId);
    // optimistic update
    setReports((prev) =>
      prev.map((x) =>
        x.id === r.id
          ? { ...x, likes: liked ? x.likes.filter((l) => l.user_id !== userId) : [...x.likes, { user_id: userId }] }
          : x,
      ),
    );
    try {
      await setLike(r.id, userId, !liked);
    } catch {
      load();
    }
  };

  if (loading) return <ActivityIndicator style={{ marginTop: 60 }} color={colors.primary} size="large" />;

  // Laporan yang baru diselesaikan admin otomatis pindah dari daftar "belum" ke "selesai" saat layar dimuat ulang.
  const data = show === 'semua' ? reports : reports.filter((r) => (r.status === 'selesai') === (show === 'selesai'));
  const emptyText =
    error ||
    (show === 'selesai'
      ? 'Belum ada laporan yang selesai diperbaiki.'
      : show === 'belum'
        ? 'Semua laporan sudah selesai. Terima kasih, warga!'
        : onlyMine
          ? 'Kamu belum membuat laporan.'
          : 'Belum ada laporan. Jadilah yang pertama!');

  return (
    <FlatList
      data={data}
      keyExtractor={(r) => r.id}
      contentContainerStyle={{ padding: 14, paddingBottom: 28, width: '100%', maxWidth: 680, alignSelf: 'center' }}
      ListHeaderComponent={typeof header === 'function' ? header(reports) : header}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          tintColor={colors.primary}
        />
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{emptyText}</Text>
        </View>
      }
      renderItem={({ item }) => (
        <ReportCard
          report={item}
          userId={userId}
          onLike={() => toggleLike(item)}
          onPress={() => nav.navigate('ReportDetail', { id: item.id })}
        />
      )}
    />
  );
}

function Hero({ reports }: { reports: Report[] }) {
  const { username } = useAuth();
  const nav = useNavigation<any>();
  const done = reports.filter((r) => r.status === 'selesai').length;
  const belum = reports.length - done;
  return (
    <View style={{ marginBottom: 8 }}>
      <View style={styles.sign}>
        <View style={styles.signInner}>
          <View style={styles.brandRow}>
            <Logo size={40} radius={10} />
            <Text style={styles.heroHi}>Selamat datang{username ? `, @${username}` : ''}</Text>
          </View>
          <Text style={styles.heroTitle}>Lihat jalan rusak?{'\n'}Laporkan di sini.</Text>
          <View style={styles.lane} />
          <View style={styles.heroRow}>
            <View>
              <Text style={styles.heroNum}>{belum}</Text>
              <Text style={styles.heroLabel}>belum selesai</Text>
            </View>
            <Pressable onPress={() => nav.navigate('ReportsDone')}>
              <Text style={styles.heroNum}>{done}</Text>
              <Text style={styles.heroLabel}>sudah selesai</Text>
            </Pressable>
            <Pressable style={styles.heroBtn} onPress={() => nav.navigate('Lapor')}>
              <Icon name="tambah" size={31} />
              <Text style={styles.heroBtnText}>Buat laporan</Text>
            </Pressable>
          </View>
        </View>
      </View>
      <Pressable style={styles.doneLink} onPress={() => nav.navigate('ReportsDone')}>
        <Icon name="berhasil" size={36} />
        <View style={{ flex: 1 }}>
          <Text style={styles.doneLinkTitle}>Laporan yang sudah selesai</Text>
          <Text style={styles.doneLinkSub}>{done} jalan sudah diperbaiki, lihat foto sebelum dan sesudahnya</Text>
        </View>
      </Pressable>
      <Text style={styles.sectionTitle}>Belum terselesaikan ({belum})</Text>
    </View>
  );
}

export function FeedScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ReportList show="belum" header={(reports) => <Hero reports={reports} />} />
    </View>
  );
}

/** Daftar laporan yang sudah selesai diperbaiki (dibuka dari Beranda). */
export function ReportsDoneScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ReportList show="selesai" />
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', marginTop: 40, paddingHorizontal: 20 },
  emptyText: { color: colors.muted, textAlign: 'center' },
  sign: { backgroundColor: colors.primary, borderRadius: 18, padding: 6 },
  signInner: { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.85)', borderRadius: 13, padding: 16 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroHi: { color: '#B9D8CE', fontSize: 13, flex: 1 },
  doneLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    padding: 12,
    marginTop: 14,
  },
  doneLinkTitle: { fontFamily: fonts.displayBold, fontSize: 16, color: colors.ink },
  doneLinkSub: { fontSize: 12, color: colors.muted, marginTop: 1 },
  heroTitle: { color: '#fff', fontSize: 30, lineHeight: 32, fontFamily: fonts.displayBold, marginTop: 4 },
  lane: { borderTopWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.5)', marginVertical: 14 },
  heroRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', rowGap: 12, columnGap: 22 },
  heroNum: { fontSize: 28, fontFamily: fonts.displayBold, color: '#fff', lineHeight: 30 },
  heroLabel: { fontSize: 11.5, color: '#B9D8CE' },
  heroBtn: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  heroBtnText: { color: colors.primary, fontWeight: '700' },
  sectionTitle: { fontSize: 22, fontFamily: fonts.display, color: colors.ink, marginTop: 24, marginBottom: 12 },
});
