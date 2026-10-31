import { useState } from 'react';
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
import { Icon, Logo } from '../components/Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../lib/auth';
import { isConfigured } from '../lib/supabase';
import { colors, fonts } from '../lib/theme';
import { Sticker } from '../components/Sticker';

type AuthStack = { Login: undefined; Register: undefined; Tabs: undefined; ReportDetail: { id: string } };

function AuthForm({ mode, onSwitch }: { mode: 'login' | 'register'; onSwitch: () => void }) {
  const { signIn, signUp } = useAuth();
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isLogin = mode === 'login';

  const submit = async () => {
    setError('');
    if (!username.trim() || !password) return setError('Username dan password wajib diisi.');
    if (!isLogin && password !== confirm) return setError('Konfirmasi password tidak sama.');
    setBusy(true);
    try {
      if (isLogin) await signIn(username, password);
      else await signUp(username, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Terjadi kesalahan.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior="padding">
      <ScrollView
        contentContainerStyle={[styles.wrap, { paddingBottom: insets.bottom + 16 }]}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <View style={[styles.hero, { marginTop: insets.top + 12 }]}>
          <View style={styles.heroInner}>
            <View style={styles.logo}>
              <Logo size={48} radius={12} />
            </View>
            <Text style={styles.brand}>LaporJalan</Text>
            <Text style={styles.sub}>
              {isLogin ? 'Laporkan jalan dan trotoar rusak.\nPantau sampai diperbaiki.' : 'Bantu perbaiki jalan\ndi sekitar tempat tinggalmu.'}
            </Text>
            <View style={styles.dash} />
          </View>
        </View>

        <View style={styles.formWrap}>
          <Sticker innerStyle={styles.form} radius={16}>
            <Text style={styles.formTitle}>{isLogin ? 'Masuk' : 'Buat akun'}</Text>

            {!isConfigured && (
              <Text style={styles.warn}>Supabase belum dikonfigurasi. Isi mobile/.env (lihat README) lalu restart Expo.</Text>
            )}

            <Text style={styles.label}>Username</Text>
            <View style={styles.inputRow}>
              <Icon name="profil" size={31} />
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="contoh: budi_123"
                placeholderTextColor={colors.muted}
              />
            </View>

            <Text style={styles.label}>Password</Text>
            <View style={styles.inputRow}>
              <Icon name="password" size={31} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                placeholder="minimal 6 karakter"
                placeholderTextColor={colors.muted}
              />
            </View>

            {!isLogin && (
              <>
                <Text style={styles.label}>Ulangi password</Text>
                <View style={styles.inputRow}>
                  <Icon name="password" size={31} />
                  <TextInput
                    style={styles.input}
                    value={confirm}
                    onChangeText={setConfirm}
                    secureTextEntry
                    autoCapitalize="none"
                    placeholderTextColor={colors.muted}
                  />
                </View>
              </>
            )}

            {!!error && <Text style={styles.error}>{error}</Text>}

            <Sticker color={colors.primary} radius={10} style={{ marginTop: 20 }} onPress={busy ? undefined : submit} innerStyle={styles.btn}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{isLogin ? 'Masuk' : 'Daftar sekarang'}</Text>}
            </Sticker>
          </Sticker>

          <Pressable onPress={onSwitch} style={{ marginTop: 22 }}>
            <Text style={styles.switch}>
              {isLogin ? 'Belum punya akun? ' : 'Sudah punya akun? '}
              <Text style={{ color: colors.primary, fontWeight: '700' }}>{isLogin ? 'Daftar' : 'Masuk'}</Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function LoginScreen({ navigation }: NativeStackScreenProps<AuthStack, 'Login'>) {
  return <AuthForm mode="login" onSwitch={() => navigation.navigate('Register')} />;
}

export function RegisterScreen({ navigation }: NativeStackScreenProps<AuthStack, 'Register'>) {
  return <AuthForm mode="register" onSwitch={() => navigation.navigate('Login')} />;
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1 },
  hero: { backgroundColor: colors.primary, marginHorizontal: 12, borderRadius: 20, padding: 6, width: '100%', maxWidth: 520, alignSelf: 'center' },
  heroInner: { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.85)', borderRadius: 15, padding: 22, paddingBottom: 18 },
  logo: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  brand: { fontSize: 40, fontFamily: fonts.displayBold, color: '#fff', marginTop: 14, lineHeight: 46 },
  sub: { fontSize: 16, color: '#CFE5DE', lineHeight: 22, marginTop: 4 },
  dash: { borderTopWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.5)', marginTop: 20 },
  formWrap: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24, width: '100%', maxWidth: 520, alignSelf: 'center' },
  form: { padding: 20 },
  formTitle: { fontSize: 30, fontFamily: fonts.displayBold, color: colors.ink },
  label: { fontWeight: '600', color: colors.ink, marginBottom: 6, marginTop: 14 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#C3CBC7',
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  input: { flex: 1, paddingVertical: 12, fontSize: 16, color: colors.ink },
  btn: { paddingVertical: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  error: { color: colors.danger, marginTop: 12, fontWeight: '600' },
  warn: { backgroundColor: '#FDF4D6', color: colors.ink, padding: 10, borderRadius: 8, marginTop: 10, borderWidth: 1, borderColor: '#ECD68A' },
  switch: { textAlign: 'center', color: colors.text },
});