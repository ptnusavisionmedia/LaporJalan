import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { toggleAlerts, useAlertsEnabled } from '../lib/proximity';
import { alert } from '../components/Dialog';
import { Icon } from '../components/Icon';
import { useAuth } from '../lib/auth';
import { colors, fonts } from '../lib/theme';
import { ReportList } from './FeedScreen';

export function ProfileScreen() {
  const { username, signOut } = useAuth();
  const alertsOn = useAlertsEnabled();

  const confirmLogout = () =>
    alert('Keluar', 'Yakin ingin keluar dari akun?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Keluar', style: 'destructive', onPress: signOut },
    ]);

  const header = (
    <>
    <View style={styles.head}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{(username || '?')[0].toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.name, { color: '#fff' }]}>@{username}</Text>
        <Text style={[styles.sub, { color: '#C9CCE8' }]}>Warga pelapor</Text>
      </View>
      <Pressable onPress={confirmLogout} style={styles.logout}>
        <Icon name="keluar" size={31} />
        <Text style={{ color: colors.danger, fontFamily: fonts.displayBold }}>Keluar</Text>
      </Pressable>
    </View>
    <View style={styles.alertRow}>
      <Icon name="sekitar-saya" size={40} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.name, { fontSize: 15 }]}>Peringatan area berbahaya</Text>
        <Text style={styles.sub}>Diberi notifikasi saat dalam 200 m dari kerusakan berbahaya.</Text>
      </View>
      <Switch value={alertsOn} onValueChange={toggleAlerts} trackColor={{ true: colors.primary, false: '#cfd6d2' }} thumbColor="#fff" />
    </View>
    <Text style={styles.listTitle}>Laporan saya</Text>
    </>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ReportList onlyMine header={header} />
    </View>
  );
}

const styles = StyleSheet.create({
  listTitle: { fontSize: 20, fontFamily: fonts.displayBold, color: colors.ink, marginBottom: 14 },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FBF0CF',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 14,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 20,
    marginBottom: 20,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.primary, fontSize: 24, fontWeight: '700' },
  name: { fontSize: 18, fontFamily: fonts.displayBold, color: colors.ink },
  sub: { color: colors.muted, fontSize: 12 },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#fff',
  },
});
