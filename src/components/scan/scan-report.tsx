'use client';

import { useState } from 'react';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Shield,
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { cn, formatDate, scoreColor, scoreLabel, severityBadge } from '@/lib/utils';
import type { Scan, ScanFinding, Severity, FindingCategory } from '@/types';

interface Props {
  scan: Scan;
  findings: ScanFinding[];
}

const severityOrder: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];
const severityLabels: Record<Severity, string> = {
  critical: 'Kritisch',
  high: 'Hoch',
  medium: 'Mittel',
  low: 'Niedrig',
  info: 'Info',
};

const categoryLabels: Record<FindingCategory, string> = {
  headers: 'HTTP-Header',
  secrets: 'Exponierte Secrets',
  sensitive_files: 'Sensible Dateien',
  vulnerability: 'Schwachstellen',
  ssl: 'SSL/TLS',
  info: 'Informationen',
};

const severityIcons: Record<Severity, typeof AlertTriangle> = {
  critical: XCircle,
  high: AlertTriangle,
  medium: AlertCircle,
  low: Info,
  info: Info,
};

export function ScanReport({ scan, findings }: Props) {
  const [expandedFindings, setExpandedFindings] = useState<Set<string>>(new Set());
  const [filterSeverity, setFilterSeverity] = useState<Severity | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<FindingCategory | 'all'>('all');

  const domain = scan.domains?.domain || 'Unbekannt';

  const toggleFinding = (id: string) => {
    setExpandedFindings((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const counts = severityOrder.reduce((acc, sev) => {
    acc[sev] = findings.filter((f) => f.severity === sev).length;
    return acc;
  }, {} as Record<Severity, number>);

  const filteredFindings = findings
    .filter((f) => filterSeverity === 'all' || f.severity === filterSeverity)
    .filter((f) => filterCategory === 'all' || f.category === filterCategory)
    .sort((a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity));

  const categories = [...new Set(findings.map((f) => f.category))] as FindingCategory[];

  const isFailed = scan.status === 'failed';
  const isCancelled = scan.status === 'cancelled';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sicherheitsbericht</h1>
          <p className="text-gray-500 mt-1">
            {domain} · {formatDate(scan.created_at)}
          </p>
        </div>
        {(isFailed || isCancelled) && (
          <Badge variant={isFailed ? 'danger' : 'warning'}>
            {isFailed ? 'Fehlgeschlagen' : 'Abgebrochen'}
          </Badge>
        )}
      </div>

      {/* Score Card */}
      {scan.score !== null && (
        <Card padding="lg" className="bg-gradient-to-br from-white to-gray-50">
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Score Circle */}
            <div className="relative flex-shrink-0">
              <svg className="w-36 h-36" viewBox="0 0 120 120">
                <circle
                  cx="60" cy="60" r="52"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="8"
                />
                <circle
                  cx="60" cy="60" r="52"
                  fill="none"
                  stroke={scan.score >= 80 ? '#22c55e' : scan.score >= 60 ? '#eab308' : scan.score >= 40 ? '#f97316' : '#ef4444'}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${(scan.score / 100) * 327} 327`}
                  transform="rotate(-90 60 60)"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-3xl font-bold ${scoreColor(scan.score)}`}>
                  {scan.score}
                </span>
                <span className="text-xs text-gray-500">von 100</span>
              </div>
            </div>

            <div className="flex-1 text-center md:text-left">
              <h2 className={`text-2xl font-bold ${scoreColor(scan.score)}`}>
                {scoreLabel(scan.score)}
              </h2>
              <p className="text-gray-600 mt-2 max-w-lg">{scan.summary}</p>

              {/* Severity Counts */}
              <div className="flex flex-wrap gap-3 mt-4 justify-center md:justify-start">
                {severityOrder.map((sev) => (
                  counts[sev] > 0 && (
                    <div
                      key={sev}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium',
                        severityBadge(sev)
                      )}
                    >
                      {counts[sev]} {severityLabels[sev]}
                    </div>
                  )
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Time Info */}
      <div className="flex items-center gap-6 text-sm text-gray-500">
        {scan.started_at && (
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            Gestartet: {formatDate(scan.started_at)}
          </div>
        )}
        {scan.completed_at && (
          <div className="flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4" />
            Beendet: {formatDate(scan.completed_at)}
          </div>
        )}
      </div>

      {/* Filters */}
      {findings.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant={filterSeverity === 'all' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilterSeverity('all')}
          >
            Alle ({findings.length})
          </Button>
          {severityOrder.map((sev) => (
            counts[sev] > 0 && (
              <Button
                key={sev}
                variant={filterSeverity === sev ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setFilterSeverity(sev)}
              >
                {severityLabels[sev]} ({counts[sev]})
              </Button>
            )
          ))}

          {categories.length > 1 && (
            <>
              <div className="w-px bg-gray-200 mx-1" />
              <Button
                variant={filterCategory === 'all' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setFilterCategory('all')}
              >
                Alle Kategorien
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant={filterCategory === cat ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setFilterCategory(cat)}
                >
                  {categoryLabels[cat]}
                </Button>
              ))}
            </>
          )}
        </div>
      )}

      {/* Findings List */}
      {filteredFindings.length > 0 ? (
        <div className="space-y-3">
          {filteredFindings.map((finding) => {
            const isExpanded = expandedFindings.has(finding.id);
            const Icon = severityIcons[finding.severity];

            return (
              <Card key={finding.id} padding="sm" className="overflow-hidden">
                <button
                  onClick={() => toggleFinding(finding.id)}
                  className="w-full text-left p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <Icon className={cn(
                    'h-5 w-5 flex-shrink-0 mt-0.5',
                    finding.severity === 'critical' ? 'text-red-600' :
                    finding.severity === 'high' ? 'text-orange-500' :
                    finding.severity === 'medium' ? 'text-yellow-500' :
                    finding.severity === 'low' ? 'text-blue-500' : 'text-gray-400'
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-medium text-gray-900 text-sm">{finding.title}</h4>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-xs font-medium',
                          severityBadge(finding.severity)
                        )}>
                          {severityLabels[finding.severity]}
                        </span>
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                          {categoryLabels[finding.category]}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5 truncate">{finding.description}</p>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 ml-8 space-y-4 border-t border-gray-100 pt-4">
                    {/* Description */}
                    <div>
                      <h5 className="text-xs font-semibold uppercase text-gray-400 mb-1">Beschreibung</h5>
                      <p className="text-sm text-gray-700">{finding.description}</p>
                    </div>

                    {/* Affected URL */}
                    {finding.affected_url && (
                      <div>
                        <h5 className="text-xs font-semibold uppercase text-gray-400 mb-1">Betroffene URL</h5>
                        <a
                          href={finding.affected_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1 break-all"
                        >
                          {finding.affected_url}
                          <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        </a>
                      </div>
                    )}

                    {/* Recommendation */}
                    {finding.recommendation && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <h5 className="text-xs font-semibold uppercase text-green-700 mb-1">
                          Empfehlung
                        </h5>
                        <p className="text-sm text-green-800">{finding.recommendation}</p>
                      </div>
                    )}

                    {/* Technical Details */}
                    {finding.details && Object.keys(finding.details).length > 0 && (
                      <div>
                        <h5 className="text-xs font-semibold uppercase text-gray-400 mb-1">
                          Technische Details
                        </h5>
                        <pre className="bg-gray-900 text-gray-100 rounded-lg p-3 text-xs overflow-x-auto">
                          {JSON.stringify(finding.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : findings.length > 0 ? (
        <Card className="text-center py-8">
          <p className="text-gray-500">Keine Ergebnisse für den ausgewählten Filter.</p>
        </Card>
      ) : (
        <Card className="text-center py-8">
          <Shield className="h-12 w-12 text-green-500 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900">Keine Probleme gefunden</h3>
          <p className="text-gray-500 mt-1">
            {isFailed
              ? 'Der Scan konnte nicht vollständig durchgeführt werden.'
              : 'Hervorragend! Bei diesem Scan wurden keine Sicherheitsprobleme erkannt.'}
          </p>
        </Card>
      )}
    </div>
  );
}
