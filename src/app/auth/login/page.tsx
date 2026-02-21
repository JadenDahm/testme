'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TestMeLogo } from '@/components/ui/testme-logo';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError('E-Mail oder Passwort ist falsch.');
      setLoading(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-surface-0 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
            <TestMeLogo size={32} />
            <span className="text-2xl font-medium text-text-primary">
              Test<span style={{ color: '#3b54a5' }}>Me</span>
            </span>
          </Link>
          <h1 className="text-2xl font-medium text-text-primary">Willkommen zurück</h1>
          <p className="text-text-secondary mt-2">Melde dich an, um fortzufahren</p>
        </div>

        <Card padding="lg">
          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded text-sm">
                {error}
              </div>
            )}

            <Input
              id="email"
              label="E-Mail"
              type="email"
              placeholder="deine@email.de"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              id="password"
              label="Passwort"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button type="submit" loading={loading} className="w-full btn-tetris-green">
              Anmelden
            </Button>
          </form>
        </Card>

        <p className="text-center text-sm text-text-muted mt-6">
          Noch kein Konto?{' '}
          <Link href="/auth/register" className="font-medium transition-colors" style={{ color: '#d61e3c' }} onMouseEnter={(e) => e.currentTarget.style.color = '#b91c1c'} onMouseLeave={(e) => e.currentTarget.style.color = '#d61e3c'}>
            Jetzt registrieren
          </Link>
        </p>
      </div>
    </div>
  );
}
