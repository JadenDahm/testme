'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Search, AlertTriangle } from 'lucide-react';

interface Props {
  domainId: string;
  domainName: string;
}

export function StartScanButton({ domainId, domainName }: Props) {
  const router = useRouter();
  const [showConsent, setShowConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleStartScan = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain_id: domainId, consent: true }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Fehler beim Starten des Scans');
        setLoading(false);
        return;
      }

      router.push(`/dashboard/scans/${result.data.id}`);
    } catch {
      setError('Verbindungsfehler. Bitte versuche es erneut.');
      setLoading(false);
    }
  };

  if (showConsent) {
    return (
      <div className="w-full mt-4 p-5 bg-amber-500/8 border border-amber-500/15 rounded space-y-4">
        <div className="flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-200/70 space-y-2">
            <p className="font-semibold text-amber-300">Zustimmung zum Sicherheitsscan</p>
            <p>
              Ich bestätige, dass <strong className="text-amber-200">{domainName}</strong> mir gehört und ich berechtigt bin,
              einen Sicherheitsscan durchführen zu lassen.
            </p>
            <p>
              Der Scan führt ausschließlich nicht-destruktive Tests durch. Es werden keine Daten
              verändert, gelöscht oder manipuliert. Alle Scan-Aktionen werden protokolliert.
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-3 py-2 rounded text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={() => setShowConsent(false)}>
            Abbrechen
          </Button>
          <Button size="sm" loading={loading} onClick={handleStartScan}>
            Ich stimme zu – Scan starten
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button onClick={() => setShowConsent(true)}>
      <Search className="h-4 w-4 mr-2" />
      Scan starten
    </Button>
  );
}
