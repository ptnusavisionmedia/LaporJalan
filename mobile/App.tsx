import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { DefaultTheme, NavigationContainer, type Theme } from '@react-navigation/native';
import { PlatformPressable } from '@react-navigation/elements';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Icon, Logo, type IconName } from './src/components/Icon';
import { DialogHost } from './src/components/Dialog';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/lib/auth';
import { colors, fonts } from './src/lib/theme';
import { useFonts, BarlowSemiCondensed_600SemiBold, BarlowSemiCondensed_700Bold } from '@expo-google-fonts/barlow-semi-condensed';
import { LoginScreen, RegisterScreen } from './src/screens/AuthScreens';
import { FeedScreen, ReportsDoneScreen } from './src/screens/FeedScreen';
import { CreateReportScreen } from './src/screens/CreateReportScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { ReportDetailScreen } from './src/screens/ReportDetailScreen';
import { MapScreen } from './src/screens/MapScreen';
import { StatsScreen } from './src/screens/StatsScreen';
import { ProximityBanner } from './src/lib/proximity';

type RootParams = {
  Tabs: undefined;
  ReportDetail: { id: string };
  ReportsDone: undefined;
  Login: undefined;
  Register: undefined;
};

// Latar semua layar dibuat sama dengan warna aplikasi, supaya tidak ada kilatan hitam saat berpindah halaman.
const navTheme: Theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.bg, card: colors.bg, primary: colors.primary, text: colors.ink, border: colors.line },
};

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
        animation: 'fade',
        transitionSpec: { animation: 'timing', config: { duration: 220 } },
        sceneStyle: { backgroundColor: colors.bg },
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: colors.line,
          height: 72 + insets.bottom,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 8),
        },
        tabBarLabelStyle: { fontWeight: '700', fontSize: 11 },
        // Tanpa riak/bayangan gelap saat tombol ditekan.
        tabBarButton: (props) => <PlatformPressable {...props} android_ripple={{ color: 'transparent' }} pressColor="transparent" pressOpacity={1} />,
        tabBarIcon: ({ focused }) => <Icon name={icons[route.name]} size={focused ? 36 : 32} dim={!focused} />,
        headerStyle,
        headerTintColor: '#fff',
        headerTitleStyle,
        headerLeft: () => (
          <View style={{ marginLeft: 14 }}>
            <Logo size={34} radius={9} />
          </View>
        ),
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
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      {session && <ProximityBanner />}
      <Stack.Navigator
        screenOptions={{
          animation: 'slide_from_right',
          animationDuration: 260,
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
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
            <Stack.Screen
              name="ReportsDone"
              component={ReportsDoneScreen}
              options={{
                title: 'Laporan Selesai',
                headerStyle,
                headerTintColor: '#fff',
                headerTitleStyle,
                headerShadowVisible: false,
              }}
            />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false, animation: 'fade' }} />
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
    <SafeAreaProvider style={{ backgroundColor: colors.bg }}>
      <AuthProvider>
        <DialogHost>
        <NavigationContainer theme={navTheme}>
          <StatusBar style="light" />
          <Root />
        </NavigationContainer>
        </DialogHost>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
