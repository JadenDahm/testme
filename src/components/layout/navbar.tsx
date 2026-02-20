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
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link href={user ? '/dashboard' : '/'} className="flex items-center gap-2.5">
            <Shield className="h-7 w-7 text-primary-600" />
            <span className="text-xl font-bold text-gray-900">
              Test<span className="text-primary-600">Me</span>
            </span>
          </Link>

          {/* Desktop */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1.5"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>
                <span className="text-sm text-gray-400">{user.email}</span>
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
                  <Button size="sm">Kostenlos starten</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Toggle */}
          <button
            className="md:hidden p-2 text-gray-600"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden pb-4 border-t border-gray-100 pt-3 space-y-2">
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg"
                  onClick={() => setMobileOpen(false)}
                >
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg"
                >
                  Abmelden
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg"
                  onClick={() => setMobileOpen(false)}
                >
                  Anmelden
                </Link>
                <Link
                  href="/auth/register"
                  className="block px-3 py-2 text-sm text-primary-600 font-medium hover:bg-primary-50 rounded-lg"
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
