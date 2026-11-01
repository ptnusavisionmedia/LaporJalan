import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { alert } from '../components/Dialog';
import { Icon } from '../components/Icon';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../lib/auth';
import {
  addComment,
  deleteComment,
  deleteReport,
  fetchComments,
  fetchReport,
  fetchUpdates,
  replaceReportImage,
  setLike,
  setValidation,
} from '../lib/api';
import { ReportImage } from '../components/ReportImage';
import type { Comment, Report, ReportUpdate } from '../lib/types';
import { colors, fixedCount, statusMeta, stillDamagedCount, timeAgo, fonts } from '../lib/theme';
import { Chips, StatusBadge } from '../components/ReportCard';

type Props = NativeStackScreenProps<
  { Login: undefined; Register: undefined; Tabs: undefined; ReportDetail: { id: string } },
  'ReportDetail'
>;

export function ReportDetailScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const userId = session!.user.id;
  const [report, setReport] = useState<Report | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [updates, setUpdates] = useState<ReportUpdate[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [replacingPhoto, setReplacingPhoto] = useState(false);

  const load = useCallback(async () => {
    try {
      const [r, c, u] = await Promise.all([fetchReport(id), fetchComments(id), fetchUpdates(id).catch(() => [])]);
      setReport(r);
      setComments(c);
      setUpdates(u);
    } catch {
      alert('Laporan tidak ditemukan', 'Mungkin sudah dihapus.');
      navigation.goBack();
    }
  }, [id, navigation]);

  useEffect(() => {
    load();
  }, [load]);

  if (!report) return <ActivityIndicator style={{ marginTop: 60 }} color={colors.primary} size="large" />;

  const liked = report.likes.some((l) => l.user_id === userId);

  const changePhoto = async () => {
    setReplacingPhoto(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) throw new Error('Izinkan akses galeri untuk memilih foto pengganti.');
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6, base64: true });
      if (result.canceled) return;
      const base64 = result.assets[0]?.base64;
      if (!base64) throw new Error('Foto tidak bisa dibaca. Pilih ulang foto dari galeri.');
      const imageUrl = await replaceReportImage(report, userId, base64);
      setReport({ ...report, image_url: imageUrl });
      alert('Foto diperbarui', 'Foto pengganti dapat dilihat oleh pengguna dan admin.');
    } catch (error) {
      alert('Gagal mengganti foto', error instanceof Error ? error.message : 'Coba lagi.');
    } finally {
      setReplacingPhoto(false);
    }
  };

  const myVote = report.validations.find((v) => v.user_id === userId);
  const stillN = stillDamagedCount(report);
  const fixedN = fixedCount(report);
  const afterPhoto = [...updates].reverse().find((u) => u.kind === 'after' && u.photo_url)?.photo_url ?? null;
  const open = report.status !== 'selesai' && report.status !== 'ditolak';

  const vote = async (still: boolean) => {
    try {
      await setValidation(report.id, userId, myVote?.still_damaged === still ? null : still);
      await load();
    } catch (e) {
      alert('Gagal menyimpan konfirmasi', e instanceof Error ? e.message : '');
    }
  };

  const toggleLike = async () => {
    await setLike(report.id, userId, !liked).catch(() => {});
    load();
  };

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    try {
      await addComment(id, userId, body);
      setText('');
      await load();
    } catch (e) {
      alert('Gagal mengirim komentar', e instanceof Error ? e.message : '');
    } finally {
      setSending(false);
    }
  };

  const removeReport = () =>
    alert('Hapus laporan', 'Laporan ini akan dihapus permanen.', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteReport(report);
            navigation.goBack();
          } catch (e) {
            alert('Gagal menghapus', e instanceof Error ? e.message : '');
          }
        },
      },
    ]);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior="padding" keyboardVerticalOffset={headerHeight}>
      <ScrollView
        style={{ backgroundColor: colors.bg }}
        contentContainerStyle={{ paddingBottom: 28, width: '100%', maxWidth: 680, alignSelf: 'center' }}
        keyboardShouldPersistTaps="handled"
      >
        <ReportImage uri={report.image_url} style={styles.image} />

        {/* ===== Ringkasan ===== */}
        <View style={styles.card}>
          <View style={styles.row}>
            <StatusBadge status={report.status} />
            <Text style={styles.meta}>{timeAgo(report.created_at)} oleh @{report.profiles?.username ?? 'pengguna'}</Text>
          </View>

          <Text style={styles.title}>{report.title}</Text>
          <Chips report={report} />

          {!!report.address && (
            <View style={[styles.row, { alignItems: 'flex-start', marginTop: 4 }]}>
              <Icon name="lokasi" size={31} style={{ marginTop: 1 }} />
              <Text style={styles.address}>{report.address}</Text>
            </View>
          )}
          {!!report.description && <Text style={styles.desc}>{report.description}</Text>}

          {!!report.admin_note && (
            <View style={styles.note}>
              <Text style={styles.noteTitle}>Tanggapan petugas</Text>
              <Text style={styles.noteText}>{report.admin_note}</Text>
            </View>
          )}

          {!!report.ai_summary && (
            <View style={styles.aiBox}>
              <Text style={styles.aiTitle}>
                Analisis AI{report.ai_confidence != null ? ` (${Math.round(report.ai_confidence * 100)}% yakin)` : ''}
              </Text>
              <Text style={styles.aiText}>{report.ai_summary}</Text>
            </View>
          )}
        </View>

        {/* ===== Tombol aksi ===== */}
        <View style={styles.actionsRow}>
          <Pressable style={[styles.actionBtn, liked && styles.actionBtnOn]} onPress={toggleLike} accessibilityRole="button">
            <Icon name={liked ? 'sudah-disukai' : 'suka'} size={37} />
            <Text style={styles.actionLabel}>{liked ? 'Disukai' : 'Suka'} ({report.likes.length})</Text>
          </Pressable>
          {report.user_id === userId && (
            <Pressable style={styles.actionBtn} onPress={changePhoto} disabled={replacingPhoto} accessibilityRole="button">
              {replacingPhoto ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Icon name="ganti-foto" size={37} />
              )}
              <Text style={styles.actionLabel}>{replacingPhoto ? 'Mengunggah...' : 'Ganti foto'}</Text>
            </Pressable>
          )}
          {report.user_id === userId && (
            <Pressable style={[styles.actionBtn, styles.actionDanger]} onPress={removeReport} accessibilityRole="button">
              <Icon name="hapus" size={37} />
              <Text style={[styles.actionLabel, { color: colors.danger }]}>Hapus laporan</Text>
            </Pressable>
          )}
        </View>

        {/* ===== Validasi komunitas ===== */}
        <Text style={styles.section}>Apakah kerusakan ini masih ada?</Text>
        <View style={styles.card}>
          <Pressable
            onPress={() => vote(true)}
            style={[styles.vote, myVote?.still_damaged === true && styles.voteOnBad]}
            accessibilityRole="button"
          >
            <Icon name="peringatan" size={43} />
            <View style={{ flex: 1 }}>
              <Text style={styles.voteTitle}>Masih rusak</Text>
              <Text style={styles.voteSub}>{stillN} warga menyatakan ini</Text>
            </View>
            {myVote?.still_damaged === true && <Text style={styles.voteMine}>Pilihanmu</Text>}
          </Pressable>
          <Pressable
            onPress={() => vote(false)}
            style={[styles.vote, myVote?.still_damaged === false && styles.voteOnGood]}
            accessibilityRole="button"
          >
            <Icon name="berhasil" size={43} />
            <View style={{ flex: 1 }}>
              <Text style={styles.voteTitle}>Sudah diperbaiki</Text>
              <Text style={styles.voteSub}>{fixedN} warga menyatakan ini</Text>
            </View>
            {myVote?.still_damaged === false && <Text style={styles.voteMine}>Pilihanmu</Text>}
          </Pressable>
          <Text style={styles.meta}>
            {open
              ? 'Ketuk lagi untuk membatalkan pilihanmu. Konfirmasimu membantu menentukan prioritas.'
              : 'Laporan ini sudah ditutup, tetapi konfirmasi masih bisa diberikan.'}
          </Text>
        </View>

        {/* ===== Sebelum & sesudah ===== */}
        {afterPhoto && (
          <>
            <Text style={styles.section}>Sebelum dan sesudah perbaikan</Text>
            <View style={styles.beforeAfter}>
              <View style={{ flex: 1 }}>
                <Text style={styles.baLabel}>Sebelum</Text>
                <ReportImage uri={report.image_url} style={styles.baImage} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.baLabel}>Sesudah</Text>
                <ReportImage uri={afterPhoto} style={styles.baImage} />
              </View>
            </View>
          </>
        )}

        {/* ===== Timeline ===== */}
        <Text style={styles.section}>Perkembangan penanganan</Text>
        <View style={styles.card}>
          {updates.length === 0 && <Text style={styles.meta}>Belum ada catatan.</Text>}
          {updates.map((u, i) => {
            const m = u.status ? statusMeta[u.status] : null;
            return (
              <View key={u.id} style={styles.tl}>
                <View style={styles.tlRail}>
                  <View style={[styles.tlDot, { backgroundColor: m?.pin ?? colors.muted }]} />
                  {i < updates.length - 1 && <View style={styles.tlLine} />}
                </View>
                <View style={{ flex: 1, paddingBottom: 18 }}>
                  <Text style={styles.tlTitle}>
                    {u.kind === 'status' ? m?.label ?? 'Status' : u.kind === 'after' ? 'Foto setelah perbaikan' : 'Catatan petugas'}
                  </Text>
                  <Text style={styles.meta}>{timeAgo(u.created_at)}</Text>
                  {!!u.note && <Text style={styles.tlNote}>{u.note}</Text>}
                  {!!u.photo_url && <ReportImage uri={u.photo_url} style={styles.tlPhoto} />}
                </View>
              </View>
            );
          })}
        </View>

        {/* ===== Komentar ===== */}
        <Text style={styles.section}>Komentar ({comments.length})</Text>
        {comments.length === 0 && <Text style={[styles.meta, { marginHorizontal: 16, marginTop: 8 }]}>Belum ada komentar. Tulis yang pertama di bawah.</Text>}
        {comments.map((c) => (
          <View key={c.id} style={styles.comment}>
            <View style={{ flex: 1 }}>
              <Text style={styles.user}>
                @{c.profiles?.username ?? 'pengguna'} <Text style={styles.meta}>{timeAgo(c.created_at)}</Text>
              </Text>
              <Text style={styles.commentText}>{c.body}</Text>
            </View>
            {c.user_id === userId && (
              <Pressable
                style={styles.commentDel}
                onPress={async () => {
                  await deleteComment(c.id).catch(() => {});
                  load();
                }}
              >
                <Text style={styles.commentDelText}>Hapus</Text>
              </Pressable>
            )}
          </View>
        ))}
      </ScrollView>

      <View style={[styles.composer, { paddingBottom: 10 + insets.bottom }]}>
        <TextInput
          style={styles.composerInput}
          value={text}
          onChangeText={setText}
          placeholder="Tulis komentar..."
          placeholderTextColor={colors.muted}
          maxLength={500}
        />
        <Pressable
          onPress={send}
          disabled={sending || !text.trim()}
          style={[styles.sendBtn, !text.trim() && { opacity: 0.4 }]}
          accessibilityRole="button"
        >
          {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendText}>Kirim</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  image: { width: '100%', aspectRatio: 4 / 3, backgroundColor: colors.line, overflow: 'hidden' },
  card: {
    backgroundColor: colors.card,
    padding: 18,
    gap: 10,
    marginHorizontal: 14,
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  user: { fontWeight: '700', color: colors.ink, fontSize: 15 },
  meta: { color: colors.muted, fontSize: 14 },
  title: { fontSize: 30, fontFamily: fonts.displayBold, color: colors.ink, lineHeight: 34 },
  address: { flex: 1, color: colors.text, fontSize: 16, lineHeight: 22 },
  desc: { color: colors.ink, fontSize: 17, lineHeight: 26 },
  note: { backgroundColor: '#E8EEF8', borderRadius: 12, padding: 14 },
  noteTitle: { fontFamily: fonts.displayBold, color: '#17407A', fontSize: 18, marginBottom: 4 },
  noteText: { color: colors.ink, fontSize: 16, lineHeight: 23 },
  aiBox: { backgroundColor: colors.bg, borderRadius: 12, padding: 14 },
  aiTitle: { fontWeight: '700', color: colors.ink, fontSize: 14, marginBottom: 2 },
  aiText: { color: colors.text, fontSize: 15, lineHeight: 21 },

  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginHorizontal: 14, marginTop: 14 },
  actionBtn: {
    flexGrow: 1,
    flexBasis: '45%',
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#B4BEB9',
    backgroundColor: '#fff',
  },
  actionBtnOn: { backgroundColor: '#FBEEEC', borderColor: colors.danger },
  actionDanger: { borderColor: '#E2B4AF' },
  actionLabel: { fontWeight: '700', color: colors.ink, fontSize: 16 },

  section: { fontFamily: fonts.displayBold, fontSize: 24, color: colors.ink, marginHorizontal: 16, marginTop: 28 },
  vote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#B4BEB9',
    backgroundColor: '#fff',
  },
  voteOnBad: { backgroundColor: '#FBEEEC', borderColor: colors.danger },
  voteOnGood: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  voteTitle: { fontWeight: '700', color: colors.ink, fontSize: 17 },
  voteSub: { color: colors.muted, fontSize: 14 },
  voteMine: { fontWeight: '700', color: colors.ink, fontSize: 13, backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' },

  beforeAfter: { flexDirection: 'row', gap: 10, marginHorizontal: 14, marginTop: 10 },
  baLabel: { fontFamily: fonts.displayBold, fontSize: 18, color: colors.ink, marginBottom: 6 },
  baImage: { width: '100%', aspectRatio: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.line },

  tl: { flexDirection: 'row', gap: 12 },
  tlRail: { alignItems: 'center', width: 16 },
  tlDot: { width: 16, height: 16, borderRadius: 8, marginTop: 3 },
  tlLine: { flex: 1, width: 0, borderLeftWidth: 2, borderStyle: 'dashed', borderColor: '#B4BEB9', marginTop: 4 },
  tlTitle: { fontWeight: '700', color: colors.ink, fontSize: 17 },
  tlNote: { color: colors.text, fontSize: 16, lineHeight: 22, marginTop: 4 },
  tlPhoto: { width: '100%', aspectRatio: 4 / 3, borderRadius: 12, overflow: 'hidden', marginTop: 8, backgroundColor: colors.line },

  comment: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.card,
    marginHorizontal: 14,
    marginTop: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  commentText: { color: colors.ink, fontSize: 16, lineHeight: 22, marginTop: 4 },
  commentDel: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#E2B4AF' },
  commentDelText: { color: colors.danger, fontWeight: '700', fontSize: 13 },

  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  composerInput: {
    flex: 1,
    minHeight: 48,
    backgroundColor: colors.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 14,
    fontSize: 16,
    color: colors.ink,
  },
  sendBtn: { minHeight: 48, paddingHorizontal: 20, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});