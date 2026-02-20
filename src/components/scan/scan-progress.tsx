'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Shield, XCircle } from 'lucide-react';
import type { Scan } from '@/types';

interface Props {
  scan: Scan;
}

export function ScanProgress({ scan: initialScan }: Props) {
  const router = useRouter();
  const [scan, setScan] = useState(initialScan);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (scan.status !== 'running' && scan.status !== 'pending') return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/scans/${scan.id}`);
        if (response.ok) {
          const { data } = await response.json();
          setScan(data);

          if (data.status === 'completed' || data.status === 'failed' || data.status === 'cancelled') {
            clearInterval(interval);
            router.refresh();
          }
        }
      } catch {
        // Ignore polling errors
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [scan.id, scan.status, router]);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await fetch(`/api/scans/${scan.id}/cancel`, { method: 'POST' });
      router.refresh();
    } catch {
      setCancelling(false);
    }
  };

  const domain = scan.domains?.domain || 'Unbekannt';

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <Card padding="lg" className="text-center">
        <div className="space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-50 mx-auto">
            <Loader2 className="h-8 w-8 text-primary-600 animate-spin" />
          </div>

          <div>
            <CardTitle className="text-xl">Scan läuft</CardTitle>
            <CardDescription className="mt-1">
              <strong>{domain}</strong> wird gerade auf Sicherheitslücken geprüft.
            </CardDescription>
          </div>

          {/* Progress Bar */}
          <div className="w-full max-w-sm mx-auto">
            <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-primary-500 rounded-full h-3 transition-all duration-700 ease-out"
                style={{ width: `${scan.progress}%` }}
              />
            </div>
            <div className="flex justify-between items-center mt-2">
              <p className="text-sm text-gray-500">{scan.current_step || 'Vorbereitung...'}</p>
              <p className="text-sm font-medium text-primary-600">{scan.progress}%</p>
            </div>
          </div>

          {/* Steps */}
          <div className="text-left max-w-xs mx-auto space-y-2">
            {[
              { label: 'SSL/TLS-Prüfung', threshold: 5 },
              { label: 'HTTP-Header-Analyse', threshold: 15 },
              { label: 'Sensible Dateien prüfen', threshold: 30 },
              { label: 'Seiten-Crawling', threshold: 40 },
              { label: 'Secret-Scanning', threshold: 60 },
              { label: 'Schwachstellen-Tests', threshold: 75 },
              { label: 'Bericht erstellen', threshold: 95 },
            ].map((step) => (
              <div key={step.label} className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  scan.progress >= step.threshold + 10
                    ? 'bg-green-500'
                    : scan.progress >= step.threshold
                    ? 'bg-primary-500 animate-pulse-slow'
                    : 'bg-gray-200'
                }`} />
                <span className={`text-sm ${
                  scan.progress >= step.threshold ? 'text-gray-900' : 'text-gray-400'
                }`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>

          <Button variant="outline" onClick={handleCancel} loading={cancelling}>
            <XCircle className="h-4 w-4 mr-2" />
            Scan abbrechen
          </Button>
        </div>
      </Card>
    </div>
  );
}
