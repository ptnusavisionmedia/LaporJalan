import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, usernameToEmail } from './supabase';

interface AuthValue {
  session: Session | null;
  username: string;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signUp: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

function friendly(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login')) return 'Username atau password salah.';
  if (m.includes('already registered') || m.includes('already been registered'))
    return 'Username sudah dipakai, coba yang lain.';
  if (m.includes('email not confirmed'))
    return 'Akun belum aktif. Matikan "Confirm email" di pengaturan Supabase Auth.';
  if (m.includes('password')) return 'Password minimal 6 karakter.';
  if (m.includes('network') || m.includes('fetch')) return 'Tidak bisa terhubung ke server. Cek internet / konfigurasi .env.';
  return message;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .catch(() => setSession(null))
      .finally(() => setLoading(false));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const signIn = async (username: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(username),
      password,
    });
    if (error) throw new Error(friendly(error.message));
  };

  const signUp = async (username: string, password: string) => {
    const name = username.trim().toLowerCase();
    if (!USERNAME_RE.test(name)) throw new Error('Username 3-20 karakter: huruf kecil, angka, atau _.');
    const { data, error } = await supabase.auth.signUp({
      email: usernameToEmail(name),
      password,
      options: { data: { username: name } },
    });
    if (error) throw new Error(friendly(error.message));
    if (!data.session) throw new Error(friendly('email not confirmed'));
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const username = (session?.user.user_metadata?.username as string | undefined) ?? '';

  return (
    <AuthContext.Provider value={{ session, username, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus di dalam AuthProvider');
  return ctx;
}
