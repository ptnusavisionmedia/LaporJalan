import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from './Icon';
import { ReportImage } from './ReportImage';
import { Sticker } from './Sticker';
import type { Report } from '../lib/types';
import { categoryMeta, colors, fonts, priorityLevel, severityMeta, statusMeta, timeAgo } from '../lib/theme';

/** Kategori, tingkat bahaya, dan prioritas otomatis. */
export function Chips({ report }: { report: Report }) {
  const cat = categoryMeta[report.category] ?? categoryMeta.jalan_rusak;
  const sev = severityMeta[report.severity] ?? severityMeta[2];
  const pr = priorityLevel(report.priority_score);
  const active = report.status !== 'selesai' && report.status !== 'ditolak';
  return (
    <View style={styles.chips}>
      <View style={[styles.chip, cat.access && { backgroundColor: colors.primarySoft, borderColor: colors.primarySoft }]}>
        <Icon name={cat.icon} size={14} color={colors.text} />
        <Text style={styles.chipText}>{cat.label}</Text>
      </View>
      <View style={styles.chip}>
        <View style={[styles.dot, { backgroundColor: sev.color }]} />
        <Text style={styles.chipText}>{sev.label}</Text>
      </View>
      {active && (
        <View style={[styles.chip, { backgroundColor: pr.bg, borderColor: pr.bg }]}>
          <Text style={[styles.chipText, { color: pr.color }]}>{pr.label}</Text>
        </View>
      )}
    </View>
  );
}

export function StatusBadge({ status }: { status: Report['status'] }) {
  const m = statusMeta[status];
  return (
    <View style={[styles.badge, { backgroundColor: m.bg }]}>
      <View style={[styles.badgeDot, { backgroundColor: m.color }]} />
      <Text style={[styles.badgeText, { color: m.color }]}>{m.label}</Text>
    </View>
  );
}

interface Props {
  report: Report;
  userId: string;
  onPress: () => void;
  onLike: () => void;
}

export function ReportCard({ report, userId, onPress, onLike }: Props) {
  const liked = report.likes.some((l) => l.user_id === userId);
  const commentCount = report.comments[0]?.count ?? 0;
  const initial = (report.profiles?.username ?? '?')[0].toUpperCase();

  return (
    <Sticker style={{ marginBottom: 16 }} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.user}>@{report.profiles?.username ?? 'pengguna'}</Text>
          <Text style={styles.meta}>{timeAgo(report.created_at)}</Text>
        </View>
        <StatusBadge status={report.status} />
      </View>

      <ReportImage uri={report.image_url} style={styles.image} />

      <View style={styles.body}>
        <Text style={styles.title}>{report.title}</Text>
        <Chips report={report} />
        {!!report.address && (
          <View style={styles.row}>
            <Icon name="lokasi" size={14} color={colors.muted} />
            <Text style={styles.meta} numberOfLines={1}>
              {report.address}
            </Text>
          </View>
        )}
        {!!report.description && (
          <Text style={styles.desc} numberOfLines={2}>
            {report.description}
          </Text>
        )}
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.action} onPress={onLike} hitSlop={8}>
          <Icon name={liked ? 'sudah-disukai' : 'suka'} size={22} color={liked ? colors.pink : colors.muted} />
          <Text style={[styles.actionText, liked && { color: colors.pink }]}>{report.likes.length}</Text>
        </Pressable>
        <View style={styles.action}>
          <Icon name="komentar" size={20} color={colors.muted} />
          <Text style={styles.actionText}>{commentCount}</Text>
        </View>
        <View style={{ flex: 1 }} />
        <Text style={styles.more}>Lihat detail</Text>
      </View>
    </Sticker>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.primary, fontWeight: '700', fontSize: 15 },
  user: { fontWeight: '600', color: colors.ink, fontSize: 14 },
  meta: { color: colors.muted, fontSize: 12, flexShrink: 1 },
  image: { width: '100%', aspectRatio: 4 / 3, backgroundColor: colors.line, overflow: 'hidden' },
  body: { padding: 14, gap: 8 },
  title: { fontSize: 22, fontFamily: fonts.display, color: colors.ink, lineHeight: 26 },
  desc: { color: colors.text, lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { fontWeight: '600', color: colors.muted },
  more: { fontWeight: '600', color: colors.primary, fontSize: 13 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#fff',
  },
  chipText: { fontSize: 11.5, fontWeight: '600', color: colors.text },
  dot: { width: 7, height: 7, borderRadius: 4 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 12, fontWeight: '700' },
});
