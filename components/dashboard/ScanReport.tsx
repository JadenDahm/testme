'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle, Clock, Shield, ArrowLeft } from 'lucide-react';
import type { ScanResult, Vulnerability, Severity } from '@/lib/types';

export default function ScanReport({ scanResult: initialResult }: { scanResult: ScanResult }) {
  const [scanResult, setScanResult] = useState(initialResult);
  const [filter, setFilter] = useState<Severity | 'all'>('all');

  // Polling für laufende Scans
  useEffect(() => {
    if (scanResult.scan.status === 'running' || scanResult.scan.status === 'pending') {
      const interval = setInterval(async () => {
        try {
          const response = await fetch(`/api/scans/${scanResult.scan.id}`);
          if (response.ok) {
            const data = await response.json();
            setScanResult(data);
            if (data.scan.status === 'completed' || data.scan.status === 'failed') {
              clearInterval(interval);
            }
          }
        } catch (error) {
          console.error('Error polling scan:', error);
        }
      }, 3000); // Alle 3 Sekunden

      return () => clearInterval(interval);
    }
  }, [scanResult.scan.id, scanResult.scan.status]);

  const getSeverityColor = (severity: Severity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'info':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getSeverityLabel = (severity: Severity) => {
    const labels: Record<Severity, string> = {
      critical: 'Kritisch',
      high: 'Hoch',
      medium: 'Mittel',
      low: 'Niedrig',
      info: 'Information',
    };
    return labels[severity];
  };

  const filteredVulnerabilities = filter === 'all'
    ? scanResult.vulnerabilities
    : scanResult.vulnerabilities.filter((v) => v.severity === filter);

  const isRunning = scanResult.scan.status === 'running' || scanResult.scan.status === 'pending';

  return (
    <div>
      <Link
        href="/dashboard"
        className="flex items-center gap-2 text-blue-600 hover:underline mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zum Dashboard
      </Link>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Sicherheitsbericht</h1>
            <div className="flex items-center gap-3">
              {isRunning ? (
                <span className="flex items-center gap-2 text-blue-600">
                  <Clock className="h-5 w-5 animate-spin" />
                  Scan läuft...
                </span>
              ) : scanResult.scan.status === 'completed' ? (
                <span className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  Abgeschlossen
                </span>
              ) : (
                <span className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-5 w-5" />
                  Fehlgeschlagen
                </span>
              )}
            </div>
          </div>
          {scanResult.scan.status === 'completed' && (
            <div className="text-right">
              <div className="text-4xl font-bold text-gray-900 mb-1">
                {scanResult.summary.security_score}
              </div>
              <div className="text-sm text-gray-600">Security Score</div>
            </div>
          )}
        </div>

        {scanResult.scan.status === 'completed' && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{scanResult.summary.total}</div>
              <div className="text-sm text-gray-600">Gesamt</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{scanResult.summary.critical}</div>
              <div className="text-sm text-red-600">Kritisch</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{scanResult.summary.high}</div>
              <div className="text-sm text-orange-600">Hoch</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{scanResult.summary.medium}</div>
              <div className="text-sm text-yellow-600">Mittel</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{scanResult.summary.low}</div>
              <div className="text-sm text-blue-600">Niedrig</div>
            </div>
          </div>
        )}

        {scanResult.scan.error_message && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg">
            <strong>Fehler:</strong> {scanResult.scan.error_message}
          </div>
        )}
      </div>

      {scanResult.scan.status === 'completed' && (
        <>
          <div className="mb-4 flex gap-2 flex-wrap">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Alle ({scanResult.summary.total})
            </button>
            <button
              onClick={() => setFilter('critical')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'critical'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Kritisch ({scanResult.summary.critical})
            </button>
            <button
              onClick={() => setFilter('high')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'high'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Hoch ({scanResult.summary.high})
            </button>
            <button
              onClick={() => setFilter('medium')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'medium'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Mittel ({scanResult.summary.medium})
            </button>
            <button
              onClick={() => setFilter('low')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'low'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Niedrig ({scanResult.summary.low})
            </button>
          </div>

          {filteredVulnerabilities.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <Shield className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Keine Schwachstellen gefunden
              </h3>
              <p className="text-gray-600">
                {filter === 'all'
                  ? 'Ihre Website hat keine bekannten Sicherheitsprobleme!'
                  : `Keine ${getSeverityLabel(filter as Severity)}-Schwachstellen gefunden.`}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredVulnerabilities.map((vuln) => (
                <div
                  key={vuln.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-gray-900">{vuln.title}</h3>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium border ${getSeverityColor(
                            vuln.severity
                          )}`}
                        >
                          {getSeverityLabel(vuln.severity)}
                        </span>
                      </div>
                      <p className="text-gray-700 mb-3">{vuln.description}</p>
                      {vuln.affected_url && (
                        <p className="text-sm text-gray-600 mb-3">
                          <strong>Betroffene URL:</strong>{' '}
                          <a
                            href={vuln.affected_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline break-all"
                          >
                            {vuln.affected_url}
                          </a>
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">Empfehlung:</h4>
                    <p className="text-blue-800">{vuln.recommendation}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
