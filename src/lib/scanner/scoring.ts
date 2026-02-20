import type { ScanFinding, Severity } from '@/types';

type FindingInput = Omit<ScanFinding, 'id' | 'scan_id' | 'created_at'>;

const SEVERITY_PENALTIES: Record<Severity, number> = {
  critical: 25,
  high: 15,
  medium: 8,
  low: 3,
  info: 0,
};

export function calculateScore(findings: FindingInput[]): number {
  let score = 100;

  // Only count non-info findings for penalties
  const relevantFindings = findings.filter((f) => f.severity !== 'info');

  for (const finding of relevantFindings) {
    score -= SEVERITY_PENALTIES[finding.severity];
  }

  return Math.max(0, Math.min(100, score));
}

export function generateSummary(findings: FindingInput[], score: number): string {
  const counts = {
    critical: findings.filter((f) => f.severity === 'critical').length,
    high: findings.filter((f) => f.severity === 'high').length,
    medium: findings.filter((f) => f.severity === 'medium').length,
    low: findings.filter((f) => f.severity === 'low').length,
    info: findings.filter((f) => f.severity === 'info').length,
  };

  const parts: string[] = [];

  if (score >= 90) {
    parts.push('Die Website zeigt eine ausgezeichnete Sicherheitskonfiguration.');
  } else if (score >= 80) {
    parts.push('Die Website hat eine gute Sicherheitskonfiguration mit einigen Verbesserungsmöglichkeiten.');
  } else if (score >= 60) {
    parts.push('Die Website hat mehrere Sicherheitsprobleme, die behoben werden sollten.');
  } else if (score >= 40) {
    parts.push('Die Website weist erhebliche Sicherheitsmängel auf, die dringend behoben werden müssen.');
  } else {
    parts.push('Die Website hat kritische Sicherheitslücken, die sofort behoben werden müssen.');
  }

  const issuesParts: string[] = [];
  if (counts.critical > 0) issuesParts.push(`${counts.critical} kritische`);
  if (counts.high > 0) issuesParts.push(`${counts.high} schwerwiegende`);
  if (counts.medium > 0) issuesParts.push(`${counts.medium} mittlere`);
  if (counts.low > 0) issuesParts.push(`${counts.low} leichte`);

  if (issuesParts.length > 0) {
    parts.push(`Es wurden ${issuesParts.join(', ')} Probleme gefunden.`);
  } else {
    parts.push('Es wurden keine nennenswerten Probleme gefunden.');
  }

  if (counts.info > 0) {
    parts.push(`Zusätzlich gibt es ${counts.info} informative Hinweise.`);
  }

  return parts.join(' ');
}
