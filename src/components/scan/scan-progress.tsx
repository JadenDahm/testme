'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import type { Scan } from '@/types';

interface Props {
  scan: Scan;
}

const SCAN_DISPLAY_STEPS = [
  { id: 'recon', label: 'SSL, Header, CORS & Technologie', progressThreshold: 0 },
  { id: 'email', label: 'E-Mail-Sicherheit (SPF/DKIM/DMARC)', progressThreshold: 20 },
  { id: 'crawl', label: 'Seiten-Crawling & Sensible Dateien', progressThreshold: 30 },
  { id: 'analysis', label: 'Schwachstellen, Secrets & SQLi', progressThreshold: 50 },
  { id: 'scoring', label: 'Score-Berechnung & Bericht', progressThreshold: 80 },
];

export function ScanProgress({ scan: initialScan }: Props) {
  const router = useRouter();
  const [scan, setScan] = useState(initialScan);
  const [cancelling, setCancelling] = useState(false);
  const [currentStepLabel, setCurrentStepLabel] = useState('Scan wird vorbereitet...');
  const executingRef = useRef(false);
  const abortRef = useRef(false);

  // Execute scan steps sequentially
  const executeNextStep = useCallback(async () => {
    if (executingRef.current || abortRef.current) return;
    executingRef.current = true;

    try {
      const response = await fetch(`/api/scans/${scan.id}/execute`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Scan step error:', error);
        // Refresh to show error state
        router.refresh();
        return;
      }

      const { data } = await response.json();

      // Update step label
      if (data.steps) {
        const currentStep = data.steps.find((s: { id: string }) => s.id === data.step);
        if (currentStep) {
          setCurrentStepLabel(currentStep.displayName);
        }
      }

      // Refresh scan state
      const statusResponse = await fetch(`/api/scans/${scan.id}`);
      if (statusResponse.ok) {
        const { data: scanData } = await statusResponse.json();
        setScan(scanData);
      }

      if (data.completed) {
        // Scan is done
        router.refresh();
        return;
      }

      // Schedule next step execution
      if (!abortRef.current) {
        executingRef.current = false;
        setTimeout(() => executeNextStep(), 500);
      }
    } catch (error) {
      console.error('Execute error:', error);
      // Retry after delay
      if (!abortRef.current) {
        executingRef.current = false;
        setTimeout(() => executeNextStep(), 3000);
      }
    } finally {
      executingRef.current = false;
    }
  }, [scan.id, router]);

  // Start execution when component mounts
  useEffect(() => {
    if (scan.status === 'pending' || scan.status === 'running') {
      abortRef.current = false;
      executeNextStep();
    }

    return () => {
      abortRef.current = true;
    };
  }, [scan.status, executeNextStep]);

  const handleCancel = async () => {
    setCancelling(true);
    abortRef.current = true;
    try {
      await fetch(`/api/scans/${scan.id}/cancel`, { method: 'POST' });
      router.refresh();
    } catch {
      setCancelling(false);
    }
  };

  const domain = (scan as unknown as { domains?: { domain_name?: string } }).domains?.domain_name || 'Unbekannt';

  const isActive = scan.status === 'running' || scan.status === 'pending';

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <Card padding="lg" className="text-center">
        <div className="space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mx-auto border border-border-subtle bg-surface-200">
            {isActive ? (
              <Loader2 className="h-8 w-8 text-accent-400 animate-spin" />
            ) : scan.status === 'completed' ? (
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            ) : (
              <AlertCircle className="h-8 w-8 text-rose-400" />
            )}
          </div>

          <div>
            <CardTitle className="text-xl">
              {isActive ? 'Tiefenanalyse läuft' : scan.status === 'completed' ? 'Scan abgeschlossen' : 'Scan fehlgeschlagen'}
            </CardTitle>
            <CardDescription className="mt-1">
              <strong className="text-text-primary">{domain}</strong> wird gerade professionell auf Sicherheitslücken analysiert.
            </CardDescription>
          </div>

          {/* Progress Bar */}
          <div className="w-full max-w-sm mx-auto">
            <div className="bg-surface-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-accent-500 rounded-full h-3 transition-all duration-700 ease-out"
                style={{ width: `${scan.progress}%` }}
              />
            </div>
            <div className="flex justify-between items-center mt-2.5">
              <p className="text-sm text-text-muted">{currentStepLabel}</p>
              <p className="text-sm font-medium text-accent-400">{scan.progress}%</p>
            </div>
          </div>

          {/* Steps */}
          <div className="text-left max-w-sm mx-auto space-y-3">
            {SCAN_DISPLAY_STEPS.map((step) => {
              const isCompleted = scan.progress > step.progressThreshold + 15;
              const isRunning = scan.progress >= step.progressThreshold && scan.progress <= step.progressThreshold + 15;
              const isPending = scan.progress < step.progressThreshold;

              return (
                <div key={step.id} className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-5 h-5">
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : isRunning ? (
                      <Loader2 className="w-5 h-5 text-accent-400 animate-spin" />
                    ) : (
                      <div className="w-3 h-3 rounded-full bg-surface-400 ml-1" />
                    )}
                  </div>
                  <span className={`text-sm ${
                    isCompleted ? 'text-emerald-400 font-medium' : isRunning ? 'text-accent-400 font-medium' : 'text-text-faint'
                  }`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Info text */}
          {isActive && (
            <p className="text-xs text-text-faint max-w-sm mx-auto leading-relaxed">
              Der Scan testet SSL/TLS, HTTP-Header, CORS, E-Mail-Sicherheit, crawlt bis zu 25 Seiten,
              prüft 80+ sensible Dateipfade, sucht nach 30+ Secret-Patterns, testet auf SQL-Injection,
              XSS, CSRF und viele weitere Schwachstellen – alles nicht-destruktiv.
            </p>
          )}

          {isActive && (
            <Button variant="outline" onClick={handleCancel} loading={cancelling}>
              <XCircle className="h-4 w-4 mr-2" />
              Scan abbrechen
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
