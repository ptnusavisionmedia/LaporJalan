import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { fetchReports } from '../lib/api';
import type { Report } from '../lib/types';
import { colors, fonts } from '../lib/theme';

type Level = 'province' | 'city' | 'district' | 'village';
const LEVELS: [Level, string][] = [
  ['province', 'Provinsi'],
  ['city', 'Kab/Kota'],
  ['district', 'Kecamatan'],
  ['village', 'Desa/Kel.'],
];

interface Row {
  name: string;
  total: number;
  pending: number; // menunggu + diverifikasi (belum ditangani)
  progress: number; // diproses
  done: number;
}

export function aggregate(reports: Report[], level: Level): Row[] {
  const map = new Map<string, Row>();
  for (const r of reports) {
    const name = r[level].trim() || 'Tidak diketahui';
    const row = map.get(name) ?? { name, total: 0, pending: 0, progress: 0, done: 0 };
    if (r.status === 'ditolak') continue;
    row.total++;
    if (r.status === 'menunggu' || r.status === 'diverifikasi') row.pending++;
    else if (r.status === 'diproses') row.progress++;
    else if (r.status === 'selesai') row.done++;
    map.set(name, row);
  }
  return [...map.values()].sort((a, b) => b.pending - a.pending || b.total - a.total);
}

export function StatsScreen() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [level, setLevel] = useState<Level>('city');
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      fetchReports()
        .then((r) => (setReports(r), setError('')))
        .catch((e) => setError(e instanceof Error ? e.message : 'Gagal memuat statistik.'))
        .finally(() => setLoading(false));
    }, []),
  );

  const rows = useMemo(() => aggregate(reports, level), [reports, level]);
  const sum = rows.reduce(
    (a, r) => ({ total: a.total + r.total, pending: a.pending + r.pending, progress: a.progress + r.progress, done: a.done + r.done }),
    { total: 0, pending: 0, progress: 0, done: 0 },
  );

  if (loading) return <ActivityIndicator style={{ marginTop: 60 }} color={colors.primary} size="large" />;

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: 14, paddingBottom: 28, gap: 12, width: '100%', maxWidth: 680, alignSelf: 'center' }}>
      <View style={styles.summary}>
        <Box label="Total laporan" value={sum.total} color={colors.ink} />
        <Box label="Belum ditangani" value={sum.pending} color="#B45309" />
        <Box label="Selesai" value={sum.done} color="#15803D" />
      </View>

      <View style={styles.levels}>
        {LEVELS.map(([key, label]) => (
          <Pressable key={key} onPress={() => setLevel(key)} style={[styles.level, level === key && styles.levelActive]}>
            <Text style={[styles.levelText, level === key && { color: '#fff' }]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {!!error && <Text style={{ color: colors.danger }}>{error}</Text>}
      {rows.length === 0 && !error && <Text style={styles.muted}>Belum ada data.</Text>}

      {rows.map((r) => {
        const pct = r.total ? Math.round((r.done / r.total) * 100) : 0;
        return (
          <View key={r.name} style={styles.card}>
            <View style={styles.rowTop}>
              <Text style={styles.name}>{r.name}</Text>
              <Text style={styles.pct}>{pct}% selesai</Text>
            </View>
            <View style={styles.bar}>
              <View style={[styles.barDone, { flex: r.done }]} />
              <View style={[styles.barProg, { flex: r.progress }]} />
              <View style={[styles.barPend, { flex: r.pending }]} />
            </View>
            <Text style={styles.muted}>
              {r.total} laporan · {r.pending} belum ditangani · {r.progress} diproses · {r.done} selesai
            </Text>
          </View>
        );
      })}
      <Text style={[styles.muted, { textAlign: 'center' }]}>Laporan yang ditolak tidak dihitung.</Text>
    </ScrollView>
  );
}

function Box({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.box}>
      <Text style={[styles.boxValue, { color }]}>{value}</Text>
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', gap: 10 },
  box: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.line },
  boxValue: { fontSize: 30, fontFamily: fonts.displayBold },
  levels: { flexDirection: 'row', gap: 8 },
  level: { flex: 1, paddingVertical: 9, borderRadius: 999, backgroundColor: '#fff', alignItems: 'center', borderWidth: 1, borderColor: colors.line },
  levelActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  levelText: { fontWeight: '700', color: colors.ink, fontSize: 12 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 14, gap: 8, borderWidth: 1, borderColor: colors.line },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontFamily: fonts.displayBold, color: colors.ink, fontSize: 16, flex: 1 },
  pct: { color: colors.ink, fontFamily: fonts.displayBold, fontSize: 12, backgroundColor: '#DCEFE6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, borderWidth: 1, borderColor: colors.line },
  bar: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', backgroundColor: colors.line, borderWidth: 1, borderColor: colors.line },
  barDone: { backgroundColor: '#22C55E' },
  barProg: { backgroundColor: '#3B82F6' },
  barPend: { backgroundColor: '#F59E0B' },
  muted: { color: colors.muted, fontSize: 12 },
});
