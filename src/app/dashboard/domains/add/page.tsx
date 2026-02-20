'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Globe, ArrowLeft } from 'lucide-react';
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
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zu Domains
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Domain hinzufügen</h1>
        <p className="text-gray-500 mt-1">
          Gib die Domain ein, die du auf Sicherheitslücken prüfen möchtest.
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-primary-50 rounded-lg mt-6">
              <Globe className="h-5 w-5 text-primary-600" />
            </div>
            <div className="flex-1">
              <Input
                id="domain"
                label="Domain"
                type="text"
                placeholder="beispiel.de"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                Gib nur die Domain ein, ohne https:// oder www.
              </p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
            <strong>Wichtig:</strong> Du musst im nächsten Schritt nachweisen, dass diese Domain dir gehört, 
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
