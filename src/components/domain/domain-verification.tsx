'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, FileText, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Domain, VerificationMethod } from '@/types';

interface Props {
  domain: Domain;
}

const methods: { id: VerificationMethod; label: string; icon: typeof Globe; description: string }[] = [
  {
    id: 'dns_txt',
    label: 'DNS TXT-Eintrag',
    icon: Globe,
    description: 'Füge einen TXT-Eintrag zu deinen DNS-Einstellungen hinzu.',
  },
  {
    id: 'html_file',
    label: 'HTML-Datei',
    icon: FileText,
    description: 'Lade eine Textdatei in das .well-known Verzeichnis hoch.',
  },
];

export function DomainVerification({ domain }: Props) {
  const router = useRouter();
  const [selectedMethod, setSelectedMethod] = useState<VerificationMethod>('dns_txt');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ verified: boolean; message: string } | null>(null);

  const handleVerify = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(`/api/domains/${domain.id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: selectedMethod }),
      });

      const data = await response.json();

      if (data.data) {
        setResult(data.data);
        if (data.data.verified) {
          setTimeout(() => router.refresh(), 1500);
        }
      }
    } catch {
      setResult({ verified: false, message: 'Verbindungsfehler. Bitte versuche es erneut.' });
    }

    setLoading(false);
  };

  return (
    <Card padding="lg">
      <div className="space-y-6">
        <div>
          <CardTitle>Domain verifizieren</CardTitle>
          <CardDescription>
            Beweise, dass <strong className="text-text-primary">{domain.domain_name}</strong> dir gehört. Wähle eine Methode:
          </CardDescription>
        </div>

        {/* Method Selection */}
        <div className="grid gap-3 sm:grid-cols-3">
          {methods.map((method) => (
            <button
              key={method.id}
              onClick={() => { setSelectedMethod(method.id); setResult(null); }}
              className={cn(
                'flex flex-col items-start p-4 rounded border text-left transition-all duration-200 cursor-pointer',
                selectedMethod === method.id
                  ? 'border-accent-500/40 bg-accent-500/8 ring-2 ring-accent-500/20'
                  : 'border-border-default hover:border-border-strong bg-surface-200/50'
              )}
            >
              <method.icon className={cn(
                'h-5 w-5 mb-2',
                selectedMethod === method.id ? 'text-accent-400' : 'text-text-faint'
              )} />
              <span className="text-sm font-medium text-text-primary">{method.label}</span>
              <span className="text-xs text-text-muted mt-0.5">{method.description}</span>
            </button>
          ))}
        </div>

        {/* Instructions */}
        <div className="bg-surface-200 rounded p-5 space-y-3 border border-border-subtle">
          <h4 className="text-sm font-semibold text-text-primary">Anleitung</h4>

          {selectedMethod === 'dns_txt' && (
            <div className="space-y-2 text-sm text-text-secondary">
              <p>1. Öffne die DNS-Verwaltung deines Domain-Anbieters.</p>
              <p>2. Erstelle einen neuen <strong className="text-text-primary">TXT-Eintrag</strong> für <code className="bg-surface-300 px-1.5 py-0.5 rounded text-xs text-accent-400">{domain.domain_name}</code></p>
              <p>3. Setze den Wert auf:</p>
              <div className="bg-surface-0 border border-border-default rounded p-3 font-mono text-xs break-all select-all text-accent-400">
                {domain.verification_token}
              </div>
              <p className="text-xs text-text-faint">Hinweis: DNS-Änderungen können bis zu 24 Stunden dauern.</p>
            </div>
          )}

          {selectedMethod === 'html_file' && (
            <div className="space-y-2 text-sm text-text-secondary">
              <p>1. Erstelle eine Datei mit dem Namen <code className="bg-surface-300 px-1.5 py-0.5 rounded text-xs text-accent-400">testme-verify.txt</code></p>
              <p>2. Der Inhalt der Datei muss exakt folgender sein:</p>
              <div className="bg-surface-0 border border-border-default rounded p-3 font-mono text-xs break-all select-all text-accent-400">
                {domain.verification_token}
              </div>
              <p>3. Lade die Datei hoch unter:</p>
              <div className="bg-surface-0 border border-border-default rounded p-3 font-mono text-xs break-all text-text-secondary">
                https://{domain.domain_name}/.well-known/testme-verify.txt
              </div>
            </div>
          )}

        </div>

        {/* Result */}
        {result && (
          <div className={cn(
            'flex items-center gap-3 p-4 rounded border',
            result.verified
              ? 'bg-emerald-500/8 border-emerald-500/15 text-emerald-300'
              : 'bg-rose-500/8 border-rose-500/15 text-rose-300'
          )}>
            {result.verified ? (
              <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0" />
            ) : (
              <XCircle className="h-5 w-5 text-rose-400 flex-shrink-0" />
            )}
            <p className="text-sm">{result.message}</p>
          </div>
        )}

        <Button onClick={handleVerify} loading={loading} className="w-full sm:w-auto">
          Verifizierung prüfen
        </Button>
      </div>
    </Card>
  );
}
