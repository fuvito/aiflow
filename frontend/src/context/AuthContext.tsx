import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { API_BASE } from '../config';

export interface UserProfile {
  id: string;
  email: string;
  access_status: 'pending' | 'approved' | 'demo' | 'disabled';
  role: 'user' | 'demo' | 'admin';
  must_change_password: boolean;
  created_at: string;
  updated_at: string;
  last_login: string | null;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  profileError: string | null;  // backend error detail after successful auth
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(token: string): Promise<void> {
    try {
      const res = await fetch(`${API_BASE}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setProfile(await res.json());
        setProfileError(null);
      } else {
        const data = await res.json().catch(() => ({}));
        const msg = data.detail ?? `Server error (${res.status})`;
        setProfile(null);
        setProfileError(msg);
      }
    } catch {
      setProfile(null);
      setProfileError('Could not reach the backend. Is it running?');
    }
  }

  async function refreshProfile(): Promise<void> {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
      await fetchProfile(data.session.access_token);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.access_token) {
        fetchProfile(data.session.access_token).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.access_token) {
        fetchProfile(newSession.access_token);
      } else {
        setProfile(null);
        setProfileError(null);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
    setProfileError(null);
  }

  return (
    <AuthContext.Provider value={{ session, user, profile, profileError, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
