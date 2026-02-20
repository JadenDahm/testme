'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Shield } from 'lucide-react';
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
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <Shield className="h-12 w-12 text-primary-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">E-Mail bestätigen</h1>
          <p className="text-gray-500">
            Wir haben dir eine Bestätigungs-E-Mail an <strong>{email}</strong> geschickt.
            Klicke auf den Link in der E-Mail, um dein Konto zu aktivieren.
          </p>
          <Link href="/auth/login" className="text-primary-600 hover:text-primary-700 font-medium text-sm mt-4 inline-block">
            Zurück zur Anmeldung
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <Shield className="h-8 w-8 text-primary-600" />
            <span className="text-2xl font-bold">
              Test<span className="text-primary-600">Me</span>
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Konto erstellen</h1>
          <p className="text-gray-500 mt-1">Starte kostenlos mit deiner Website-Prüfung</p>
        </div>

        <Card>
          <form onSubmit={handleRegister} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
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

            <Button type="submit" loading={loading} className="w-full">
              Registrieren
            </Button>
          </form>
        </Card>

        <p className="text-center text-sm text-gray-500 mt-4">
          Bereits ein Konto?{' '}
          <Link href="/auth/login" className="text-primary-600 hover:text-primary-700 font-medium">
            Jetzt anmelden
          </Link>
        </p>
      </div>
    </div>
  );
}
