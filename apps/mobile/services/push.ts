import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Remote push was removed from Expo Go on Android (SDK 53+), so this only works in a
// development build or a release build. In Expo Go we skip silently; in-app notifications
// (the `notifications` table) still work everywhere.
export const pushSupported = Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

async function register(token: string) {
  await supabase.rpc('register_device_token', { p_token: token, p_platform: Platform.OS === 'ios' ? 'ios' : 'android' });
}

/**
 * Asks for notification permission (only when called, never at launch), registers the Expo
 * push token with the backend, and re-registers when the token rotates. Returns a cleanup fn.
 */
export async function registerForPush(): Promise<{ ok: boolean; reason?: string; cleanup: () => void }> {
  const noop = () => {};
  if (!pushSupported) return { ok: false, reason: 'Notifikasi push tidak didukung di Expo Go. Gunakan development build.', cleanup: noop };

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', { name: 'Notifikasi LaporJalan', importance: Notifications.AndroidImportance.DEFAULT });
  }
  let perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) perm = await Notifications.requestPermissionsAsync();
  if (!perm.granted) return { ok: false, reason: 'Izin notifikasi ditolak.', cleanup: noop };

  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  if (!projectId) return { ok: false, reason: 'EAS_PROJECT_ID belum diatur.', cleanup: noop };

  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    await register(data);
    const sub = Notifications.addPushTokenListener(async () => {
      const fresh = await Notifications.getExpoPushTokenAsync({ projectId });
      await register(fresh.data);
    });
    return { ok: true, cleanup: () => sub.remove() };
  } catch {
    return { ok: false, reason: 'Pendaftaran notifikasi gagal. Pastikan FCM sudah dikonfigurasi di EAS.', cleanup: noop };
  }
}
