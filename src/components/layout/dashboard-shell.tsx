'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Globe, Search, LogOut } from 'lucide-react';
import { TestMeLogo } from '@/components/ui/testme-logo';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import type { User } from '@supabase/supabase-js';

const navItems = [
  { href: '/dashboard', label: 'Übersicht', icon: LayoutDashboard },
  { href: '/dashboard/domains', label: 'Domains', icon: Globe },
  { href: '/dashboard/scans', label: 'Scans', icon: Search },
];

export function DashboardShell({ user, children }: { user: User; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-surface-0 flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 bg-surface-50 border-r border-border-subtle flex-col fixed inset-y-0">
        <div className="p-6 border-b border-border-subtle">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <TestMeLogo size={28} />
            <span className="text-xl font-medium text-text-primary">
              Test<span style={{ color: '#3b54a5' }}>Me</span>
            </span>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-colors duration-200',
                  isActive
                    ? 'bg-surface-200 text-text-primary'
                    : 'text-text-secondary hover:bg-surface-100 hover:text-text-primary'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border-subtle">
          <div className="text-xs text-text-faint truncate mb-2 px-3">{user.email}</div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium text-text-secondary hover:bg-surface-200 hover:text-text-primary w-full transition-all duration-200"
          >
            <LogOut className="h-5 w-5" />
            Abmelden
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-surface-50 border-b border-border-subtle">
        <div className="flex items-center justify-between px-4 h-14">
          <Link href="/dashboard" className="flex items-center gap-2">
            <TestMeLogo size={24} />
            <span className="text-lg font-medium text-text-primary">
              Test<span style={{ color: '#3b54a5' }}>Me</span>
            </span>
          </Link>
        </div>
        <div className="flex border-t border-border-subtle">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors duration-200',
                  isActive ? 'text-accent-400' : 'text-text-muted'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 pt-[6.5rem] lg:pt-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
