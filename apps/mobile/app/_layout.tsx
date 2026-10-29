import '../global.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Redirect, Stack, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { EmptyState } from '@/components/ui';
import { isSupabaseConfigured } from '@/services/supabase';
import { useSession } from '@/stores/session';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } }),
  );
  const { session, ready, init } = useSession();
  const segments = useSegments();

  useEffect(() => init(), [init]);
  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!isSupabaseConfigured) {
    return (
      <EmptyState
        title="Konfigurasi belum lengkap"
        message="Isi EXPO_PUBLIC_SUPABASE_URL dan EXPO_PUBLIC_SUPABASE_ANON_KEY pada file .env, lalu mulai ulang Expo."
      />
    );
  }
  if (!ready) return null;

  // Protected navigation: signed-out users only see (auth); signed-in users never do.
  const inAuth = segments[0] === '(auth)';
  const inLegal = segments[0] === 'legal'; // public documents, readable before signing in
  if (!session && !inAuth && !inLegal) return <Redirect href="/(auth)/login" />;
  if (session && inAuth) return <Redirect href="/(tabs)" />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={client}>
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false }} />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
