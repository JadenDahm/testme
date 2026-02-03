'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Clock, Play, AlertCircle, Shield } from 'lucide-react';
import Link from 'next/link';
import type { Domain, Scan } from '@/lib/types';

export default function DomainDetails({
  domain,
  scans: initialScans,
}: {
  domain: Domain;
  scans: Scan[];
}) {
  const router = useRouter();
  const [verifying, setVerifying] = useState(false);
  const [startingScan, setStartingScan] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    verified: boolean;
    message: string;
  } | null>(null);

  const handleVerify = async () => {
    setVerifying(true);
    setVerificationResult(null);

    try {
      const response = await fetch(`/api/domains/${domain.id}/verify`, {
        method: 'POST',
      });

      const data = await response.json();
      setVerificationResult(data);

      if (data.verified) {
        router.refresh();
      }
    } catch (error: any) {
      setVerificationResult({
        verified: false,
        message: error.message || 'Fehler bei der Verifizierung',
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleStartScan = async () => {
    if (!domain.verified) {
      alert('Bitte verifizieren Sie die Domain zuerst.');
      return;
    }

    if (!confirm('Möchten Sie wirklich einen Sicherheitsscan starten? Dieser Vorgang kann einige Minuten dauern.')) {
      return;
    }

    setStartingScan(true);

    try {
      const response = await fetch('/api/scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain_id: domain.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Starten des Scans');
      }

      router.push(`/dashboard/scans/${data.scan.id}`);
    } catch (error: any) {
      alert(error.message || 'Fehler beim Starten des Scans');
    } finally {
      setStartingScan(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'running':
        return <Clock className="h-5 w-5 text-blue-600 animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Abgeschlossen';
      case 'failed':
        return 'Fehlgeschlagen';
      case 'running':
        return 'Läuft...';
      case 'pending':
        return 'Ausstehend';
      default:
        return status;
    }
  };

  return (
    <div>
      <Link
        href="/dashboard"
        className="text-blue-600 hover:underline mb-4 inline-block"
      >
        ← Zurück zum Dashboard
      </Link>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{domain.domain}</h1>
            <div className="flex items-center gap-3">
              {domain.verified ? (
                <span className="flex items-center gap-2 text-green-600 font-medium">
                  <CheckCircle className="h-5 w-5" />
                  Verifiziert
                </span>
              ) : (
                <span className="flex items-center gap-2 text-amber-600 font-medium">
                  <AlertCircle className="h-5 w-5" />
                  Nicht verifiziert
                </span>
              )}
            </div>
          </div>
          {domain.verified && (
            <button
              onClick={handleStartScan}
              disabled={startingScan}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="h-5 w-5" />
              {startingScan ? 'Wird gestartet...' : 'Scan starten'}
            </button>
          )}
        </div>

        {!domain.verified && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-amber-900 mb-2">Domain-Verifizierung erforderlich</h3>
            <p className="text-sm text-amber-800 mb-4">
              Um Scans durchführen zu können, müssen Sie die Domain-Verfügungsberechtigung nachweisen.
            </p>

            {domain.verification_method === 'dns_txt' && (
              <div className="mb-4">
                <p className="text-sm font-medium text-amber-900 mb-2">
                  Fügen Sie folgenden TXT-Eintrag zu Ihrer DNS-Konfiguration hinzu:
                </p>
                <div className="bg-white p-3 rounded border border-amber-300 font-mono text-sm break-all">
                  testmywebsite-verification={domain.verification_token}
                </div>
              </div>
            )}

            {domain.verification_method === 'html_file' && (
              <div className="mb-4">
                <p className="text-sm font-medium text-amber-900 mb-2">
                  Erstellen Sie eine Datei unter:
                </p>
                <div className="bg-white p-3 rounded border border-amber-300 font-mono text-sm">
                  /.well-known/testmywebsite-verification.html
                </div>
                <p className="text-sm text-amber-800 mt-2">
                  Mit folgendem Inhalt:
                </p>
                <div className="bg-white p-3 rounded border border-amber-300 font-mono text-sm break-all">
                  {domain.verification_token}
                </div>
              </div>
            )}

            <button
              onClick={handleVerify}
              disabled={verifying}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {verifying ? 'Wird überprüft...' : 'Jetzt verifizieren'}
            </button>

            {verificationResult && (
              <div
                className={`mt-4 p-3 rounded-lg ${
                  verificationResult.verified
                    ? 'bg-green-50 border border-green-200 text-green-800'
                    : 'bg-red-50 border border-red-200 text-red-800'
                }`}
              >
                {verificationResult.message}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Verifizierungsmethode:</span>
            <span className="ml-2 font-medium">
              {domain.verification_method === 'dns_txt' ? 'DNS-TXT' : 'HTML-Datei'}
            </span>
          </div>
          {domain.verified_at && (
            <div>
              <span className="text-gray-600">Verifiziert am:</span>
              <span className="ml-2 font-medium">
                {new Date(domain.verified_at).toLocaleString('de-DE')}
              </span>
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Vergangene Scans</h2>
        {initialScans.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Noch keine Scans durchgeführt</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {initialScans.map((scan) => (
              <Link
                key={scan.id}
                href={`/dashboard/scans/${scan.id}`}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(scan.status)}
                    <div>
                      <div className="font-semibold text-gray-900">
                        Scan vom {new Date(scan.created_at).toLocaleString('de-DE')}
                      </div>
                      <div className="text-sm text-gray-600">
                        Status: {getStatusText(scan.status)}
                      </div>
                    </div>
                  </div>
                  {scan.completed_at && (
                    <div className="text-sm text-gray-600">
                      Abgeschlossen: {new Date(scan.completed_at).toLocaleString('de-DE')}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
