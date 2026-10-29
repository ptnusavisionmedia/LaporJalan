import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { supabase } from '@/services/supabase';

// Client-only auth state. Server data (reports, profile rows) lives in TanStack Query.
type SessionState = {
  session: Session | null;
  ready: boolean;
  init: () => () => void;
};

export const useSession = create<SessionState>((set) => ({
  session: null,
  ready: false,
  init: () => {
    supabase.auth.getSession().then(({ data }) => set({ session: data.session, ready: true }));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => set({ session, ready: true }));
    return () => data.subscription.unsubscribe();
  },
}));
