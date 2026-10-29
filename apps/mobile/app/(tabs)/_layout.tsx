import { Link, Tabs } from 'expo-router';
import { Activity, Home, Map, PlusCircle, User } from 'lucide-react-native';
import { Pressable, Text, View, type ColorValue } from 'react-native';
import { useProximityAlerts } from '@/hooks/useProximityAlerts';
import { useSession } from '@/stores/session';

const icon = (Icon: typeof Home) =>
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Icon color={color as string} size={size} />;
  };

export default function TabsLayout() {
  const userId = useSession((s) => s.session!.user.id);
  const { alerts, dismiss } = useProximityAlerts(userId);
  const top = alerts[0];

  return (
    <View style={{ flex: 1 }}>
      {top ? (
        <View accessibilityRole="alert" accessibilityLiveRegion="assertive" className="absolute left-3 right-3 top-10 z-10 rounded-xl bg-danger p-3">
          <Text className="font-bold text-white">Peringatan Jalan Rusak</Text>
          <Text className="text-white">
            {top.title} — sekitar {Math.round(top.distance_m)} m dari Anda{alerts.length > 1 ? ` (+${alerts.length - 1} lainnya)` : ''}.
          </Text>
          <View className="mt-2 flex-row gap-4">
            <Link href={{ pathname: '/report/[id]', params: { id: top.id } }} onPress={() => dismiss(top.id)} className="min-h-8 font-semibold text-white underline">Lihat</Link>
            <Pressable accessibilityRole="button" onPress={() => dismiss(top.id)} className="min-h-8"><Text className="font-semibold text-white underline">Tutup</Text></Pressable>
          </View>
        </View>
      ) : null}
      <Tabs screenOptions={{ tabBarActiveTintColor: '#2563EB', headerShown: false }}>
        <Tabs.Screen name="index" options={{ title: 'Beranda', tabBarIcon: icon(Home) }} />
        <Tabs.Screen name="map" options={{ title: 'Peta', tabBarIcon: icon(Map) }} />
        <Tabs.Screen name="report" options={{ title: 'Lapor', tabBarIcon: icon(PlusCircle) }} />
        <Tabs.Screen name="activity" options={{ title: 'Aktivitas', tabBarIcon: icon(Activity) }} />
        <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarIcon: icon(User) }} />
      </Tabs>
    </View>
  );
}
