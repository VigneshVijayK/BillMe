'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { useAuth } from '../../../lib/auth';

export default function SignIn() {
  const router = useRouter();
  const { user, signIn, signInWithGoogle, enterDemoMode } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const pendingRedirect = useRef(false);

  useEffect(() => {
    if (pendingRedirect.current && user) {
      pendingRedirect.current = false;
      router.push('/dashboard');
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: signInError } = await signIn(email, password);
    if (signInError) {
      if (signInError.toLowerCase().includes('rate limit')) {
        setError('Too many attempts. Please wait a moment or try Demo Mode.');
      } else {
        setError(signInError);
      }
      setLoading(false);
    } else {
      pendingRedirect.current = true;
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    await signInWithGoogle();
  };

  const handleDemo = () => {
    enterDemoMode();
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm glass-panel rounded-3xl p-6 sm:p-8 border border-border space-y-5">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center font-black text-2xl text-primary-foreground shadow-[0_0_25px_rgba(139,92,246,0.6)] mx-auto">
            B
          </div>
          <h1 className="text-3xl font-black tracking-tight">BillMe</h1>
          <p className="text-sm text-muted-foreground">Sign in to your account</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-sm text-red-400 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="you@company.com"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin mx-auto" />
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-card px-3 text-muted-foreground font-medium">or continue with</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={googleLoading}
          className="w-full py-3 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-bold border border-border transition-all flex items-center justify-center space-x-3 disabled:opacity-50"
        >
          {googleLoading ? (
            <div className="w-5 h-5 rounded-full border-2 border-foreground border-t-transparent animate-spin" />
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Sign in with Google</span>
            </>
          )}
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-card px-3 text-muted-foreground font-medium">or</span>
          </div>
        </div>

        <button
          onClick={handleDemo}
          className="w-full py-3 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-bold border border-border transition-all flex items-center justify-center space-x-2"
        >
          <Sparkles size={18} className="text-primary" />
          <span>Try Demo Mode</span>
        </button>

        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href="/sign-up" className="text-primary font-bold hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
