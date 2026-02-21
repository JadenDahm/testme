'use client';

import { useState } from 'react';
import Link from 'next/link';
import { TestMeLogo } from '@/components/ui/testme-logo';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Passwort muss mindestens 8 Zeichen lang sein.');
      return;
    }

    if (password !== passwordConfirm) {
      setError('Passwörter stimmen nicht überein.');
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-surface-0 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <h1 className="text-2xl font-medium text-text-primary mb-4">E-Mail bestätigen</h1>
          <p className="text-text-secondary">
            Wir haben dir eine Bestätigungs-E-Mail an <strong className="text-text-primary">{email}</strong> geschickt.
            Klicke auf den Link in der E-Mail, um dein Konto zu aktivieren.
          </p>
          <Link href="/auth/login" className="font-medium text-sm mt-6 inline-block transition-colors" style={{ color: '#58b247' }} onMouseEnter={(e) => e.currentTarget.style.color = '#4a9a3a'} onMouseLeave={(e) => e.currentTarget.style.color = '#58b247'}>
            Zurück zur Anmeldung
          </Link>
        </div>
      </div>
    );
  }

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
          <h1 className="text-2xl font-medium text-text-primary">Konto erstellen</h1>
          <p className="text-text-secondary mt-2">Starte kostenlos mit deiner Website-Prüfung</p>
        </div>

        <Card padding="lg">
          <form onSubmit={handleRegister} className="space-y-5">
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
              placeholder="Mindestens 8 Zeichen"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />

            <Input
              id="passwordConfirm"
              label="Passwort bestätigen"
              type="password"
              placeholder="Passwort wiederholen"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              required
              minLength={8}
            />

            <Button type="submit" loading={loading} className="w-full btn-tetris-cyan">
              Registrieren
            </Button>
          </form>
        </Card>

        <p className="text-center text-sm text-text-muted mt-6">
          Bereits ein Konto?{' '}
          <Link href="/auth/login" className="font-medium transition-colors" style={{ color: '#ec5e24' }} onMouseEnter={(e) => e.currentTarget.style.color = '#c94e1e'} onMouseLeave={(e) => e.currentTarget.style.color = '#ec5e24'}>
            Jetzt anmelden
          </Link>
        </p>
      </div>
    </div>
  );
}
