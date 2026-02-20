import type { ScanFinding } from '@/types';

type FindingInput = Omit<ScanFinding, 'id' | 'scan_id' | 'created_at'>;

interface ComplianceMapping {
  category: string;
  owaspTop10?: string;
  pcidss?: string;
  iso27001?: string;
  gdpr?: string;
}

// ── OWASP Top 10 2021 Mapping ───────────────────────────────────────────
const OWASP_TOP_10: Record<string, { id: string; name: string; description: string }> = {
  'A01': { id: 'A01:2021', name: 'Broken Access Control', description: 'Fehlende oder fehlerhafte Zugriffskontrolle ermöglicht es Angreifern, auf unberechtigte Ressourcen zuzugreifen.' },
  'A02': { id: 'A02:2021', name: 'Cryptographic Failures', description: 'Schwache oder fehlende Verschlüsselung gefährdet sensible Daten.' },
  'A03': { id: 'A03:2021', name: 'Injection', description: 'Eingaben werden nicht validiert, was SQL Injection, XSS und andere Angriffe ermöglicht.' },
  'A04': { id: 'A04:2021', name: 'Insecure Design', description: 'Fehlende Sicherheitskonzepte im Design führen zu systematischen Schwachstellen.' },
  'A05': { id: 'A05:2021', name: 'Security Misconfiguration', description: 'Fehlerhafte Konfigurationen wie fehlende Security Header oder offene Debug-Modi.' },
  'A06': { id: 'A06:2021', name: 'Vulnerable and Outdated Components', description: 'Veraltete Bibliotheken und Frameworks mit bekannten Schwachstellen.' },
  'A07': { id: 'A07:2021', name: 'Identification and Authentication Failures', description: 'Schwächen bei Authentifizierung und Session-Management.' },
  'A08': { id: 'A08:2021', name: 'Software and Data Integrity Failures', description: 'Fehlende Integritätsprüfungen bei Software-Updates und Datenübertragungen.' },
  'A09': { id: 'A09:2021', name: 'Security Logging and Monitoring Failures', description: 'Unzureichendes Logging und Monitoring verhindert die Erkennung von Angriffen.' },
  'A10': { id: 'A10:2021', name: 'Server-Side Request Forgery', description: 'SSRF ermöglicht es Angreifern, den Server zu missbrauchen, um interne Ressourcen anzugreifen.' },
};

// ── Mapping von Finding-Kategorien zu Compliance-Standards ──────────────
function mapFindingToCompliance(finding: FindingInput): ComplianceMapping {
  const mapping: ComplianceMapping = { category: finding.category };

  // Map based on category and title
  const title = finding.title.toLowerCase();
  const category = finding.category;

  // OWASP Top 10 Mapping
  if (category === 'ssl' || title.includes('ssl') || title.includes('tls') || title.includes('https') || title.includes('zertifikat') || title.includes('hsts')) {
    mapping.owaspTop10 = 'A02';
    mapping.pcidss = 'Req 4.1';
    mapping.iso27001 = 'A.10.1';
    mapping.gdpr = 'Art. 32 (Verschlüsselung)';
  }

  if (category === 'vulnerability' && (title.includes('xss') || title.includes('injection') || title.includes('sql'))) {
    mapping.owaspTop10 = 'A03';
    mapping.pcidss = 'Req 6.5';
    mapping.iso27001 = 'A.14.2';
  }

  if (title.includes('header') || title.includes('csp') || title.includes('cors') || title.includes('security-header')) {
    mapping.owaspTop10 = 'A05';
    mapping.pcidss = 'Req 6.5';
    mapping.iso27001 = 'A.14.1';
  }

  if (title.includes('bibliothek') || title.includes('library') || title.includes('veraltet') || title.includes('eol') || title.includes('cve')) {
    mapping.owaspTop10 = 'A06';
    mapping.pcidss = 'Req 6.2';
    mapping.iso27001 = 'A.12.6';
  }

  if (title.includes('cookie') || title.includes('session') || title.includes('auth') || title.includes('login') || title.includes('rate limit')) {
    mapping.owaspTop10 = 'A07';
    mapping.pcidss = 'Req 8';
    mapping.iso27001 = 'A.9.4';
  }

  if (title.includes('sri') || title.includes('integrity') || title.includes('subresource')) {
    mapping.owaspTop10 = 'A08';
    mapping.pcidss = 'Req 6.5';
    mapping.iso27001 = 'A.14.2';
  }

  if (title.includes('host header') || title.includes('ssrf') || title.includes('forwarded')) {
    mapping.owaspTop10 = 'A10';
    mapping.pcidss = 'Req 6.5';
    mapping.iso27001 = 'A.14.2';
  }

  if (category === 'cors') {
    mapping.owaspTop10 = 'A01';
    mapping.pcidss = 'Req 6.5';
    mapping.iso27001 = 'A.13.1';
  }

  if (category === 'email') {
    mapping.pcidss = 'Req 4.2';
    mapping.iso27001 = 'A.13.2';
  }

  if (title.includes('waf') || title.includes('firewall')) {
    mapping.owaspTop10 = 'A05';
    mapping.pcidss = 'Req 6.6';
    mapping.iso27001 = 'A.13.1';
  }

  if (category === 'secrets' || title.includes('source map') || title.includes('secret') || title.includes('api key') || title.includes('passwort') || title.includes('password')) {
    mapping.owaspTop10 = 'A02';
    mapping.pcidss = 'Req 3.4';
    mapping.iso27001 = 'A.8.2';
    mapping.gdpr = 'Art. 32 (Datensicherheit)';
  }

  if (title.includes('clickjacking') || title.includes('frame')) {
    mapping.owaspTop10 = 'A04';
    mapping.pcidss = 'Req 6.5';
  }

  if (title.includes('mixed content')) {
    mapping.owaspTop10 = 'A02';
    mapping.pcidss = 'Req 4.1';
    mapping.gdpr = 'Art. 32 (Verschlüsselung)';
  }

  if (title.includes('subdomain') || title.includes('dns') || title.includes('nameserver')) {
    mapping.owaspTop10 = 'A05';
    mapping.iso27001 = 'A.13.1';
  }

  return mapping;
}

// ── Generate Compliance Report ──────────────────────────────────────────
export function generateComplianceReport(findings: FindingInput[]): FindingInput[] {
  const complianceFindings: FindingInput[] = [];

  // Map all findings to compliance standards
  const owaspCoverage = new Map<string, { covered: boolean; issues: number; criticalIssues: number }>();
  for (const [key, value] of Object.entries(OWASP_TOP_10)) {
    owaspCoverage.set(key, { covered: false, issues: 0, criticalIssues: 0 });
    void value; // prevent unused
  }

  const pciRequirements = new Map<string, number>();
  let gdprIssues = 0;

  for (const finding of findings) {
    if (finding.severity === 'info') continue;

    const mapping = mapFindingToCompliance(finding);

    if (mapping.owaspTop10) {
      const current = owaspCoverage.get(mapping.owaspTop10);
      if (current) {
        current.covered = true;
        current.issues++;
        if (finding.severity === 'high' || finding.severity === 'critical') {
          current.criticalIssues++;
        }
      }
    }

    if (mapping.pcidss) {
      pciRequirements.set(mapping.pcidss, (pciRequirements.get(mapping.pcidss) || 0) + 1);
    }

    if (mapping.gdpr) {
      gdprIssues++;
    }
  }

  // OWASP Top 10 summary
  let passCount = 0;
  let failCount = 0;
  const failedCategories: string[] = [];

  for (const [key, status] of owaspCoverage) {
    const category = OWASP_TOP_10[key];
    if (status.criticalIssues > 0) {
      failCount++;
      failedCategories.push(`${category.id} ${category.name}`);
    } else if (status.covered && status.issues === 0) {
      passCount++;
    }
  }

  complianceFindings.push({
    category: 'info',
    severity: failCount > 3 ? 'critical' : failCount > 1 ? 'high' : failCount > 0 ? 'medium' : 'info',
    title: `OWASP Top 10 (2021): ${failCount} kritische Kategorien betroffen`,
    description: `Von den 10 OWASP-Kategorien weisen ${failCount} kritische oder hochgradig schwerwiegende Probleme auf. ${failedCategories.length > 0 ? `Betroffene Kategorien: ${failedCategories.join(', ')}` : 'Keine kritischen Probleme erkannt.'}`,
    affected_url: 'Compliance Report',
    recommendation: failCount > 0
      ? 'Priorisiere die Behebung der OWASP Top 10 Schwachstellen. Beginne mit den kritischsten Kategorien und führe nach der Behebung einen erneuten Scan durch.'
      : 'Gute Sicherheitslage bezüglich OWASP Top 10. Führe regelmäßige Scans durch, um den Status beizubehalten.',
    details: {
      owaspTop10: Object.entries(OWASP_TOP_10).map(([key, category]) => {
        const status = owaspCoverage.get(key)!;
        return {
          id: category.id,
          name: category.name,
          issues: status.issues,
          criticalIssues: status.criticalIssues,
          status: status.criticalIssues > 0 ? 'FAIL' : status.issues > 0 ? 'WARNING' : 'PASS',
        };
      }),
    },
  });

  // PCI DSS summary
  if (pciRequirements.size > 0) {
    const pciEntries = [...pciRequirements.entries()].map(([req, count]) => `${req}: ${count} Problem(e)`);
    complianceFindings.push({
      category: 'info',
      severity: pciRequirements.size > 3 ? 'high' : 'medium',
      title: `PCI DSS: ${pciRequirements.size} Requirements betroffen`,
      description: `${pciRequirements.size} PCI DSS Requirements weisen Probleme auf: ${pciEntries.join(', ')}. PCI DSS Compliance erfordert die Behebung aller Findings.`,
      affected_url: 'Compliance Report',
      recommendation: 'Für PCI DSS Compliance müssen alle identifizierten Schwachstellen behoben werden. Beauftrage einen zertifizierten QSA für ein formales PCI DSS Assessment.',
      details: { pciRequirements: Object.fromEntries(pciRequirements) },
    });
  }

  // GDPR summary
  if (gdprIssues > 0) {
    complianceFindings.push({
      category: 'info',
      severity: 'high',
      title: `DSGVO/GDPR: ${gdprIssues} potenzielle Datenschutzprobleme`,
      description: `${gdprIssues} Findings haben potenzielle DSGVO-Relevanz (Verschlüsselung, Datensicherheit). Nach Art. 32 DSGVO sind angemessene technische und organisatorische Maßnahmen zum Schutz personenbezogener Daten erforderlich.`,
      affected_url: 'Compliance Report',
      recommendation: 'Behebe alle DSGVO-relevanten Findings. Verschlüsselung (TLS), Zugriffskontrolle und Datensicherheit sind Kernforderungen der DSGVO.',
      details: { gdprIssueCount: gdprIssues },
    });
  }

  return complianceFindings;
}
