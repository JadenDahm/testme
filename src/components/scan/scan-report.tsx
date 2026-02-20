'use client';

import { useState, useMemo } from 'react';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  CheckCircle,
  Clock,
  Download,
  BarChart3,
  List,
  TrendingDown,
} from 'lucide-react';
import { cn, formatDate, scoreColor, severityBadge } from '@/lib/utils';
import { calculateCategoryScores } from '@/lib/scanner/scoring';
import { ScoreGauge } from '@/components/charts/score-gauge';
import { SeverityDonutChart } from '@/components/charts/severity-donut';
import { CategoryBarChart } from '@/components/charts/category-bar-chart';
import { SecurityRadarChart } from '@/components/charts/security-radar';
import { FindingsHeatmap } from '@/components/charts/findings-heatmap';
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
  cors: 'CORS',
  email: 'E-Mail Security',
};


type ViewMode = 'overview' | 'findings';

export function ScanReport({ scan, findings }: Props) {
  const [expandedFindings, setExpandedFindings] = useState<Set<string>>(new Set());
  const [filterSeverity, setFilterSeverity] = useState<Severity | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<FindingCategory | 'all'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('overview');

  const domain = (scan as unknown as { domains?: { domain_name?: string } }).domains?.domain_name || 'Unbekannt';

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

  const counts = useMemo(() => severityOrder.reduce((acc, sev) => {
    acc[sev] = findings.filter((f) => f.severity === sev).length;
    return acc;
  }, {} as Record<Severity, number>), [findings]);

  const categoryScores = useMemo(() => {
    const findingInputs = findings.map((f) => ({
      category: f.category,
      severity: f.severity,
      title: f.title,
      description: f.description,
      affected_url: f.affected_url,
      recommendation: f.recommendation,
      details: f.details,
    }));
    return calculateCategoryScores(findingInputs);
  }, [findings]);

  const filteredFindings = findings
    .filter((f) => filterSeverity === 'all' || f.severity === filterSeverity)
    .filter((f) => filterCategory === 'all' || f.category === filterCategory)
    .sort((a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity));

  const categories = [...new Set(findings.map((f) => f.category))] as FindingCategory[];

  const isFailed = scan.status === 'failed';
  const isCancelled = scan.status === 'cancelled';

  // Calculate scan duration
  const scanDuration = scan.started_at && scan.completed_at
    ? Math.round((new Date(scan.completed_at).getTime() - new Date(scan.started_at).getTime()) / 1000)
    : null;

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Sicherheitsbericht</h1>
          <p className="text-text-secondary text-sm mt-1">
            {domain} · {formatDate(scan.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(isFailed || isCancelled) && (
            <Badge variant={isFailed ? 'danger' : 'warning'}>
              {isFailed ? 'Fehlgeschlagen' : 'Abgebrochen'}
            </Badge>
          )}
          <a
            href={`/api/scans/${scan.id}/pdf`}
            download
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-500 text-white text-sm font-medium hover:bg-accent-400 transition-colors duration-200"
          >
            <Download className="h-4 w-4" />
            PDF Report
          </a>
        </div>
      </div>

      {/* ── Score Hero Section ──────────────────────────────────────────── */}
      {scan.score !== null && (
        <Card padding="lg">
          <div className="flex flex-col lg:flex-row items-center gap-8">
            {/* Score Gauge */}
            <ScoreGauge score={scan.score} size={180} />

            <div className="flex-1 text-center lg:text-left">
              <p className="text-text-secondary max-w-lg leading-relaxed">{scan.summary}</p>

              {/* Quick Stats */}
              <div className="flex flex-wrap gap-2 mt-5 justify-center lg:justify-start">
                {severityOrder.map((sev) => (
                  counts[sev] > 0 && (
                    <button
                      key={sev}
                      onClick={() => {
                        setViewMode('findings');
                        setFilterSeverity(sev);
                      }}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors duration-200 cursor-pointer',
                        severityBadge(sev)
                      )}
                    >
                      {counts[sev]} {severityLabels[sev]}
                    </button>
                  )
                ))}
              </div>

              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-text-faint justify-center lg:justify-start">
                {scan.started_at && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    Gestartet: {formatDate(scan.started_at)}
                  </div>
                )}
                {scan.completed_at && (
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Beendet: {formatDate(scan.completed_at)}
                  </div>
                )}
                {scanDuration !== null && (
                  <div className="flex items-center gap-1">
                    <TrendingDown className="h-3.5 w-3.5" />
                    Dauer: {scanDuration}s
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <BarChart3 className="h-3.5 w-3.5" />
                  {findings.length} Ergebnisse
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ── View Mode Toggle ────────────────────────────────────────────── */}
      {findings.length > 0 && (
        <div className="flex items-center gap-1 bg-surface-200 rounded-xl p-1 w-fit border border-border-subtle">
          <button
            onClick={() => setViewMode('overview')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
              viewMode === 'overview'
                ? 'bg-surface-400 text-text-primary shadow-sm'
                : 'text-text-muted hover:text-text-secondary'
            )}
          >
            <BarChart3 className="h-4 w-4" />
            Übersicht
          </button>
          <button
            onClick={() => setViewMode('findings')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
              viewMode === 'findings'
                ? 'bg-surface-400 text-text-primary shadow-sm'
                : 'text-text-muted hover:text-text-secondary'
            )}
          >
            <List className="h-4 w-4" />
            Ergebnisse ({findings.length})
          </button>
        </div>
      )}

      {/* ── Charts Overview ─────────────────────────────────────────────── */}
      {viewMode === 'overview' && findings.length > 0 && (
        <div className="space-y-6">
          {/* Charts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Severity Distribution */}
            <Card padding="lg">
              <SeverityDonutChart counts={counts} />
            </Card>

            {/* Category Scores */}
            <Card padding="lg">
              <CategoryBarChart categoryScores={categoryScores} />
            </Card>
          </div>

          {/* Radar + Heatmap */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Security Radar */}
            <Card padding="lg">
              <SecurityRadarChart categoryScores={categoryScores} />
            </Card>

            {/* Findings Heatmap */}
            <Card padding="lg">
              <FindingsHeatmap findings={findings} />
            </Card>
          </div>

          {/* Category Detail Cards */}
          <div>
            <h3 className="text-sm font-semibold text-text-secondary mb-3">Kategoriedetails</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryScores.map((cat) => {
                const catColorClasses =
                  cat.score >= 90 ? 'border-emerald-500/20 bg-emerald-500/5' :
                  cat.score >= 70 ? 'border-cyan-500/20 bg-cyan-500/5' :
                  cat.score >= 50 ? 'border-yellow-500/20 bg-yellow-500/5' :
                  cat.score >= 30 ? 'border-orange-500/20 bg-orange-500/5' :
                  'border-rose-500/20 bg-rose-500/5';

                return (
                  <button
                    key={cat.name}
                    onClick={() => {
                      setViewMode('findings');
                      setFilterCategory(cat.name as FindingCategory);
                      setFilterSeverity('all');
                    }}
                    className={cn(
                      'text-left p-4 rounded-lg border transition-colors duration-200 cursor-pointer hover:border-border-default',
                      catColorClasses
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl font-bold text-text-primary">{cat.score}</span>
                    </div>
                    <h4 className="font-semibold text-sm text-text-primary">{cat.displayName}</h4>
                    <p className="text-xs mt-1 text-text-secondary">
                      {cat.findings} {cat.findings === 1 ? 'Ergebnis' : 'Ergebnisse'}
                      {cat.criticalCount > 0 && ` · ${cat.criticalCount} kritisch`}
                      {cat.highCount > 0 && ` · ${cat.highCount} hoch`}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Top Issues Preview */}
          {findings.filter((f) => f.severity === 'critical' || f.severity === 'high').length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-text-secondary">Wichtigste Probleme</h3>
                <button
                  onClick={() => {
                    setViewMode('findings');
                    setFilterSeverity('all');
                  }}
                  className="text-xs text-accent-400 hover:text-accent-300 font-medium transition-colors"
                >
                  Alle anzeigen →
                </button>
              </div>
              <div className="space-y-2">
                {findings
                  .filter((f) => f.severity === 'critical' || f.severity === 'high')
                  .slice(0, 5)
                  .map((finding) => {
                    return (
                      <Card key={finding.id} padding="sm">
                        <div className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-medium text-text-primary text-sm">{finding.title}</h4>
                            <span className={cn(
                              'px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0',
                              severityBadge(finding.severity)
                            )}>
                              {severityLabels[finding.severity]}
                            </span>
                          </div>
                          <p className="text-xs text-text-secondary mt-1 line-clamp-1">{finding.description}</p>
                        </div>
                      </Card>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Findings List View ──────────────────────────────────────────── */}
      {viewMode === 'findings' && (
        <>
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
                  <div className="w-px bg-border-default mx-1" />
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

                return (
                  <Card key={finding.id} padding="sm" className="overflow-hidden">
                    <button
                      onClick={() => toggleFinding(finding.id)}
                      className="w-full text-left p-4 flex items-start gap-3 hover:bg-surface-200/50 transition-colors duration-200 cursor-pointer"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-medium text-text-primary text-sm">
                            {finding.title}
                          </h4>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={cn(
                              'px-2 py-0.5 rounded-full text-xs font-medium',
                              severityBadge(finding.severity)
                            )}>
                              {severityLabels[finding.severity]}
                            </span>
                            <span className="text-xs text-text-secondary bg-surface-200 px-2 py-0.5 rounded-full">
                              {categoryLabels[finding.category]}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-text-secondary mt-1 truncate">{finding.description}</p>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-text-secondary flex-shrink-0" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-text-secondary flex-shrink-0" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 ml-8 space-y-4 border-t border-border-subtle pt-4 animate-fade-in">
                        {/* Description */}
                        <div>
                          <h5 className="text-xs font-semibold uppercase text-text-faint mb-1 tracking-wide">Beschreibung</h5>
                          <p className="text-sm text-text-secondary leading-relaxed">{finding.description}</p>
                        </div>

                        {/* Affected URL */}
                        {finding.affected_url && (
                          <div>
                            <h5 className="text-xs font-semibold uppercase text-text-faint mb-1 tracking-wide">Betroffene URL</h5>
                            <a
                              href={finding.affected_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-accent-400 hover:text-accent-300 flex items-center gap-1 break-all transition-colors"
                            >
                              {finding.affected_url}
                              <ExternalLink className="h-3 w-3 flex-shrink-0" />
                            </a>
                          </div>
                        )}

                        {/* Recommendation */}
                        {finding.recommendation && (
                          <div className="bg-emerald-500/8 border border-emerald-500/15 rounded-xl p-4">
                            <h5 className="text-xs font-semibold uppercase text-emerald-400 mb-1.5 tracking-wide flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Empfehlung
                            </h5>
                            <p className="text-sm text-emerald-300/80 leading-relaxed">{finding.recommendation}</p>
                          </div>
                        )}

                        {/* Technical Details */}
                        {finding.details && Object.keys(finding.details).length > 0 && (
                          <div>
                            <h5 className="text-xs font-semibold uppercase text-text-faint mb-1 tracking-wide">
                              Technische Details
                            </h5>
                            <pre className="bg-surface-0 border border-border-subtle text-accent-300 rounded-xl p-4 text-xs overflow-x-auto leading-relaxed">
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
              <p className="text-text-muted">Keine Ergebnisse für den ausgewählten Filter.</p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => { setFilterSeverity('all'); setFilterCategory('all'); }}
              >
                Filter zurücksetzen
              </Button>
            </Card>
          ) : null}
        </>
      )}

      {/* ── Empty State ─────────────────────────────────────────────────── */}
      {findings.length === 0 && (
        <Card className="text-center py-12">
          <h3 className="text-lg font-medium text-text-primary">Keine Probleme gefunden</h3>
          <p className="text-text-secondary mt-2 max-w-md mx-auto">
            {isFailed
              ? 'Der Scan konnte nicht vollständig durchgeführt werden.'
              : 'Hervorragend! Bei diesem Scan wurden keine Sicherheitsprobleme erkannt.'}
          </p>
        </Card>
      )}
    </div>
  );
}
