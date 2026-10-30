import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isConfigured = url.startsWith('http') && anonKey.length > 20;

export const supabase = createClient(url || 'https://placeholder.supabase.co', anonKey || 'placeholder', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Login memakai username + password. Supabase Auth butuh email,
// jadi username dipetakan ke email internal.
export const EMAIL_DOMAIN = 'laporjalan.app';
export const usernameToEmail = (username: string) =>
  `${username.trim().toLowerCase()}@${EMAIL_DOMAIN}`;
