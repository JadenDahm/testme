import type { ScanFinding } from '@/types';

type FindingInput = Omit<ScanFinding, 'id' | 'scan_id' | 'created_at'>;

// ── Severity-based penalties ─────────────────────────────────────────────
const SEVERITY_PENALTIES: Record<string, number> = {
  critical: 20,
  high: 12,
  medium: 5,
  low: 2,
  info: 0,
};

// ── Category weights (some categories are more important) ────────────────
const CATEGORY_WEIGHTS: Record<string, number> = {
  ssl: 1.5,
  vulnerability: 1.3,
  secrets: 1.5,
  sensitive_files: 1.2,
  headers: 0.8,
  cors: 1.1,
  email: 0.9,
  info: 0.5,
};

// ── Score calculation with category weighting ────────────────────────────
export function calculateScore(findings: FindingInput[]): number {
  let totalPenalty = 0;

  // Only count non-info findings for penalties
  const relevantFindings = findings.filter((f) => f.severity !== 'info');

  // Deduplicate similar findings (same category + severity)
  const processedKeys = new Set<string>();

  for (const finding of relevantFindings) {
    const key = `${finding.category}:${finding.severity}:${finding.title}`;

    // Reduce penalty for duplicate findings of the same type
    let multiplier = 1.0;
    if (processedKeys.has(key)) {
      multiplier = 0.3; // 30% penalty for duplicates
    }
    processedKeys.add(key);

    const basePenalty = SEVERITY_PENALTIES[finding.severity] || 0;
    const categoryWeight = CATEGORY_WEIGHTS[finding.category] || 1.0;
    totalPenalty += basePenalty * categoryWeight * multiplier;
  }

  return Math.max(0, Math.min(100, Math.round(100 - totalPenalty)));
}

// ── Category-specific scores ─────────────────────────────────────────────
export interface CategoryScore {
  name: string;
  displayName: string;
  score: number;
  findings: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
}

export function calculateCategoryScores(findings: FindingInput[]): CategoryScore[] {
  const categories: Record<string, FindingInput[]> = {};

  for (const finding of findings) {
    const cat = finding.category;
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(finding);
  }

  const categoryDisplayNames: Record<string, string> = {
    ssl: 'SSL/TLS',
    headers: 'HTTP-Header',
    sensitive_files: 'Sensible Dateien',
    secrets: 'Offene Geheimnisse',
    vulnerability: 'Schwachstellen',
    cors: 'CORS',
    email: 'E-Mail Security',
    info: 'Informationen',
  };

  const scores: CategoryScore[] = [];

  for (const [name, catFindings] of Object.entries(categories)) {
    const relevant = catFindings.filter((f) => f.severity !== 'info');
    let catScore = 100;

    for (const finding of relevant) {
      catScore -= SEVERITY_PENALTIES[finding.severity] || 0;
    }

    scores.push({
      name,
      displayName: categoryDisplayNames[name] || name,
      score: Math.max(0, Math.min(100, catScore)),
      findings: catFindings.length,
      criticalCount: catFindings.filter((f) => f.severity === 'critical').length,
      highCount: catFindings.filter((f) => f.severity === 'high').length,
      mediumCount: catFindings.filter((f) => f.severity === 'medium').length,
      lowCount: catFindings.filter((f) => f.severity === 'low').length,
    });
  }

  // Sort by score ascending (worst first)
  scores.sort((a, b) => a.score - b.score);

  return scores;
}

// ── Summary generation ───────────────────────────────────────────────────
export function generateSummary(findings: FindingInput[], score: number): string {
  const counts = {
    critical: findings.filter((f) => f.severity === 'critical').length,
    high: findings.filter((f) => f.severity === 'high').length,
    medium: findings.filter((f) => f.severity === 'medium').length,
    low: findings.filter((f) => f.severity === 'low').length,
    info: findings.filter((f) => f.severity === 'info').length,
  };

  const parts: string[] = [];

  // Overall assessment
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

  // Issue counts
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

  // Priority recommendations
  if (counts.critical > 0) {
    parts.push('⚠️ Es gibt kritische Schwachstellen, die sofortige Aufmerksamkeit erfordern.');
  } else if (counts.high > 0) {
    parts.push('Die schwerwiegenden Probleme sollten zeitnah behoben werden.');
  }

  return parts.join(' ');
}
