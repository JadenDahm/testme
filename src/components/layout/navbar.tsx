'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield, LogOut, LayoutDashboard, Menu, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface NavbarProps {
  user?: { email?: string } | null;
}

export function Navbar({ user }: NavbarProps) {
  const router = useRouter();
  const supabase = createClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border-subtle bg-surface-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link href={user ? '/dashboard' : '/'} className="flex items-center gap-2.5">
            <Shield className="h-6 w-6" style={{ color: '#3b54a5' }} />
            <span className="text-xl font-medium text-text-primary">
              Test<span style={{ color: '#3b54a5' }}>Me</span>
            </span>
          </Link>

          {/* Desktop */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-sm text-text-secondary hover:text-text-primary flex items-center gap-1.5 transition-colors duration-200"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>
                <span className="text-sm text-text-faint">{user.email}</span>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-1.5" />
                  Abmelden
                </Button>
              </>
            ) : (
              <>
                <Link href="/auth/login">
                  <Button variant="ghost" size="sm">Anmelden</Button>
                </Link>
                <Link href="/auth/register">
                  <Button size="sm" style={{ backgroundColor: '#9e237e', borderColor: '#9e237e' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#851d6a'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#9e237e'}>Kostenlos starten</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Toggle */}
          <button
            className="md:hidden p-2 text-text-secondary hover:text-text-primary transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden pb-4 border-t border-border-subtle pt-3 space-y-1 animate-fade-in">
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="block px-3 py-2.5 text-sm text-text-secondary hover:bg-surface-200 hover:text-text-primary rounded transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-3 py-2.5 text-sm text-text-secondary hover:bg-surface-200 hover:text-text-primary rounded-xl transition-colors"
                >
                  Abmelden
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="block px-3 py-2.5 text-sm text-text-secondary hover:bg-surface-200 hover:text-text-primary rounded transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  Anmelden
                </Link>
                <Link
                  href="/auth/register"
                  className="block px-3 py-2.5 text-sm text-text-primary font-medium hover:bg-surface-200 rounded transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  Kostenlos starten
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
