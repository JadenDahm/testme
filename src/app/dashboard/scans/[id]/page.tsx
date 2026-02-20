'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { ScanReport } from '@/components/scan/scan-report';
import { ScanProgress } from '@/components/scan/scan-progress';
import { DeleteScanButton } from '@/components/scan/delete-scan-button';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Scan, ScanFinding } from '@/types';

export default function ScanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [scan, setScan] = useState<Scan | null>(null);
  const [findings, setFindings] = useState<ScanFinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchScan = async () => {
      try {
        const response = await fetch(`/api/scans/${id}`);

        if (response.status === 401) {
          router.push('/auth/login');
          return;
        }

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          setError(data.error || `Fehler beim Laden des Scans (HTTP ${response.status})`);
          setLoading(false);
          return;
        }

        const { data } = await response.json();

        if (!data) {
          setError('Scan-Daten sind leer');
          setLoading(false);
          return;
        }

        setScan(data as Scan);
        setFindings((data.findings || []) as ScanFinding[]);
        setLoading(false);
      } catch (err) {
        console.error('[ScanDetail] Fetch error:', err);
        setError('Verbindungsfehler beim Laden des Scans');
        setLoading(false);
      }
    };

    fetchScan();
  }, [id, router]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
        <Loader2 className="h-8 w-8 text-accent-400 animate-spin mb-4" />
        <p className="text-text-muted">Scan wird geladen...</p>
      </div>
    );
  }

  if (error || !scan) {
    return (
      <div className="max-w-md mx-auto py-20 animate-fade-in">
        <Card className="text-center py-8">
          <AlertCircle className="h-10 w-10 text-rose-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-text-primary mb-2">Scan nicht gefunden</h2>
          <p className="text-text-muted text-sm mb-6">{error || 'Der Scan konnte nicht geladen werden.'}</p>
          <Link href="/dashboard/scans">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zurück zu Scans
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/scans"
          className="text-sm text-text-muted hover:text-text-secondary flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zu Scans
        </Link>
        {(scan.status === 'completed' || scan.status === 'failed' || scan.status === 'cancelled') && (
          <DeleteScanButton scanId={scan.id} />
        )}
      </div>

      {(scan.status === 'running' || scan.status === 'pending') ? (
        <ScanProgress scan={scan} />
      ) : (
        <ScanReport scan={scan} findings={findings} />
      )}
    </div>
  );
}
