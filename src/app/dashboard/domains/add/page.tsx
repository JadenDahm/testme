'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AddDomainPage() {
  const router = useRouter();
  const [domain, setDomain] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Ein Fehler ist aufgetreten');
        setLoading(false);
        return;
      }

      router.push(`/dashboard/domains/${result.data.id}`);
    } catch {
      setError('Verbindungsfehler. Bitte versuche es erneut.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-fade-in">
      <div>
        <Link
          href="/dashboard/domains"
          className="text-sm text-text-muted hover:text-text-secondary flex items-center gap-1 mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zu Domains
        </Link>
        <h1 className="text-2xl font-bold text-text-primary">Domain hinzufügen</h1>
        <p className="text-text-muted mt-1">
          Gib die Domain ein, die du auf Sicherheitslücken prüfen möchtest.
        </p>
      </div>

      <Card padding="lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div>
            <Input
              id="domain"
              label="Domain"
              type="text"
              placeholder="beispiel.de"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              required
            />
            <p className="text-xs text-text-secondary mt-1.5">
              Gib nur die Domain ein, ohne https:// oder www.
            </p>
          </div>

          <div className="bg-amber-500/8 border border-amber-500/15 rounded-xl p-4 text-sm text-amber-200/70">
            <strong className="text-amber-300">Wichtig:</strong> Du musst im nächsten Schritt nachweisen, dass diese Domain dir gehört,
            bevor ein Scan gestartet werden kann.
          </div>

          <div className="flex gap-3 justify-end">
            <Link href="/dashboard/domains">
              <Button variant="outline" type="button">Abbrechen</Button>
            </Link>
            <Button type="submit" loading={loading}>
              Domain hinzufügen
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
