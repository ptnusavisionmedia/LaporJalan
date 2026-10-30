import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Icon, type IconName } from './src/components/Icon';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/lib/auth';
import { colors, fonts } from './src/lib/theme';
import { useFonts, BarlowSemiCondensed_600SemiBold, BarlowSemiCondensed_700Bold } from '@expo-google-fonts/barlow-semi-condensed';
import { LoginScreen, RegisterScreen } from './src/screens/AuthScreens';
import { FeedScreen } from './src/screens/FeedScreen';
import { CreateReportScreen } from './src/screens/CreateReportScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { ReportDetailScreen } from './src/screens/ReportDetailScreen';
import { MapScreen } from './src/screens/MapScreen';
import { StatsScreen } from './src/screens/StatsScreen';
import { ProximityBanner } from './src/lib/proximity';

type RootParams = {
  Tabs: undefined;
  ReportDetail: { id: string };
  Login: undefined;
  Register: undefined;
};

const styles = StyleSheet.create({
  tab: { paddingHorizontal: 16, paddingVertical: 3, borderRadius: 999 },
  tabActive: { paddingHorizontal: 16, paddingVertical: 3, borderRadius: 999, backgroundColor: colors.primarySoft },
});

const headerStyle = { backgroundColor: colors.primary, elevation: 0, shadowOpacity: 0 } as const;
const headerTitleStyle = { fontFamily: fonts.displayBold, fontSize: 24 } as const;

const Stack = createNativeStackNavigator<RootParams>();
const Tab = createBottomTabNavigator();

const icons: Record<string, IconName> = {
  Beranda: 'beranda',
  Peta: 'peta',
  Lapor: 'buat-laporan',
  Statistik: 'statistik',
  Saya: 'profil',
};

function Tabs() {
  // Tinggi tab bar mengikuti area aman perangkat (bar gestur / tombol navigasi Android, home indicator iPhone).
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: colors.line,
          height: 60 + insets.bottom,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 8),
        },
        tabBarLabelStyle: { fontWeight: '600', fontSize: 11 },
        tabBarIcon: ({ focused, color, size }) => (
          <View style={focused ? styles.tabActive : styles.tab}>
            <Icon name={icons[route.name]} size={size + 2} color={color} />
          </View>
        ),
        headerStyle,
        headerTintColor: '#fff',
        headerTitleStyle,
      })}
    >
      <Tab.Screen name="Beranda" component={FeedScreen} options={{ title: 'LaporJalan' }} />
      <Tab.Screen name="Peta" component={MapScreen} options={{ title: 'Peta Kerusakan' }} />
      <Tab.Screen name="Lapor" component={CreateReportScreen} options={{ title: 'Buat Laporan' }} />
      <Tab.Screen name="Statistik" component={StatsScreen} options={{ title: 'Statistik Wilayah' }} />
      <Tab.Screen name="Saya" component={ProfileScreen} options={{ title: 'Profil' }} />
    </Tab.Navigator>
  );
}

function Root() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      {session && <ProximityBanner />}
      <Stack.Navigator>
        {session ? (
          <>
            <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
            <Stack.Screen
              name="ReportDetail"
              component={ReportDetailScreen}
              options={{
                title: 'Detail Laporan',
                headerStyle,
                headerTintColor: '#fff',
                headerTitleStyle,
                headerShadowVisible: false,
              }}
            />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
          </>
        )}
      </Stack.Navigator>
    </>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({ BarlowSemiCondensed_600SemiBold, BarlowSemiCondensed_700Bold });
  if (!fontsLoaded) return null;
  return (
    <SafeAreaProvider>
      <AuthProvider>
          <NavigationContainer>
            <StatusBar style="light" />
            <Root />
          </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
