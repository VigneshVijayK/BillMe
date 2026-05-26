'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Users,
  CreditCard,
  Settings,
  Menu,
  X,
  Sun,
  Moon,
  PlusCircle,
  LogOut
} from 'lucide-react';
import { db } from '../lib/supabase';
import { Profile } from '../types';
import { useAuth } from '../lib/auth';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, isDemo, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [profile, setProfile] = useState<Profile | null>(null);

  const isAuthPage = pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up');

  useEffect(() => {
    const savedTheme = localStorage.getItem('billme_theme') as 'dark' | 'light';
    if (savedTheme) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTheme(savedTheme);
      if (savedTheme === 'light') {
        document.documentElement.classList.add('light-theme');
      }
    }
  }, []);

  useEffect(() => {
    if (user) {
      db.getProfile().then(setProfile).catch(() => {});
    }
  }, [user]);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('billme_theme', nextTheme);
    if (nextTheme === 'light') {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/sign-in');
  };

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Invoices & Estimates', href: '/invoices', icon: FileText },
    { name: 'Clients (CRM)', href: '/clients', icon: Users },
    { name: 'Expenses', href: '/expenses', icon: CreditCard },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (isAuthPage) {
    return <>{children}</>;
  }

  if (!user) {
    router.push('/sign-in');
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background text-foreground transition-colors duration-300">
      {/* Mobile Navbar */}
      <header className="md:hidden flex items-center justify-between p-4 glass-panel border-b border-border no-print z-50 sticky top-0 bg-background/80 backdrop-blur-md">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center font-bold text-primary-foreground shadow-[0_0_15px_rgba(139,92,246,0.5)]">
            B
          </div>
          <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
            BillMe
          </span>
          {isDemo && (
            <span className="text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">
              DEMO
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 md:static md:flex flex-col w-64 glass-panel border-r border-border p-5 no-print transition-all duration-300 ease-in-out z-40 bg-background/95 md:bg-transparent`}
      >
        <div className="hidden md:flex items-center space-x-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center font-black text-xl text-primary-foreground shadow-[0_0_20px_rgba(139,92,246,0.6)]">
            B
          </div>
          <div>
            <span className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
              BillMe
            </span>
            <span className="block text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mt-0.5">
              Billing Platform
            </span>
            {isDemo && (
              <span className="text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full mt-1 inline-block">
                DEMO MODE
              </span>
            )}
          </div>
        </div>

        {/* Create New Invoice Quick Action */}
        <Link
          href="/invoices/new"
          onClick={() => setSidebarOpen(false)}
          className="flex items-center justify-center space-x-2 w-full py-3 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transform hover:-translate-y-0.5 transition-all duration-200 mb-6"
        >
          <PlusCircle size={18} />
          <span>Create Invoice</span>
        </Link>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && (pathname === item.href || pathname.startsWith(item.href + '/')));
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-primary/10 text-primary border-l-4 border-primary pl-3'
                    : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                }`}
              >
                <item.icon size={20} className={isActive ? 'text-primary' : 'text-muted-foreground'} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Profile + Theme + Sign Out */}
        <div className="pt-4 border-t border-border mt-auto space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-sm font-bold border border-border">
                {profile?.business_name ? profile.business_name.substring(0, 2).toUpperCase() : 'B'}
              </div>
              <div className="truncate max-w-[120px]">
                <h4 className="font-semibold text-sm truncate">{profile?.business_name || 'My Business'}</h4>
                <p className="text-xs text-muted-foreground truncate">{profile?.email || user?.email}</p>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors hidden md:block"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>

          <button
            onClick={handleSignOut}
            className="flex items-center space-x-2 w-full py-2.5 px-4 rounded-xl text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all text-sm font-medium"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </div>
      </main>

      {/* Background decorations */}
      <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px] pointer-events-none -z-10" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/5 blur-[120px] pointer-events-none -z-10" />
    </div>
  );
}
