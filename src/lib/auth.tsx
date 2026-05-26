'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { getSupabase, setDemoMode, isDemoMode } from './supabase';

const DEMO_USER = {
  id: 'demo-user',
  email: 'demo@billme.app',
  aud: 'authenticated',
  role: 'authenticated',
  app_metadata: {},
  user_metadata: { full_name: 'Demo User' },
  created_at: new Date().toISOString(),
} as unknown as User;

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isDemo: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, businessName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  enterDemoMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    if (isDemoMode()) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setUser(DEMO_USER);
      setIsDemo(true);
      setLoading(false);
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }

    try {
      const s = getSupabase();
      s.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        setLoading(false);
      });

      const { data: { subscription } } = s.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
      });

      return () => subscription.unsubscribe();
    } catch {
      setLoading(false);
    }
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const s = getSupabase();
      const { error } = await s.auth.signInWithPassword({ email, password });
      return { error: error?.message || null };
    } catch (e: unknown) {
      return { error: e instanceof Error ? e.message : 'An unexpected error occurred' };
    }
  };

  const signUp = async (email: string, password: string, businessName: string) => {
    try {
      const s = getSupabase();
      const { data, error } = await s.auth.signUp({ email, password });
      if (error) return { error: error.message };
      if (data.user) {
        await s.from('profiles').insert({
          id: data.user.id,
          business_name: businessName,
          email,
          currency: 'INR',
          country: 'India',
        });
      }
      return { error: null };
    } catch (e: unknown) {
      return { error: e instanceof Error ? e.message : 'An unexpected error occurred' };
    }
  };

  const signOut = async () => {
    if (isDemo) {
      setDemoMode(false);
      setIsDemo(false);
      setUser(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('billme_demo_db');
      }
      return;
    }
    try {
      const s = getSupabase();
      await s.auth.signOut();
    } catch {}
    setUser(null);
  };

  const enterDemoMode = () => {
    setDemoMode(true);
    setIsDemo(true);
    setUser(DEMO_USER);
  };

  return (
    <AuthContext.Provider value={{ user, loading, isDemo, signIn, signUp, signOut, enterDemoMode }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
