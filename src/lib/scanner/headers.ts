import type { ScanFinding, Severity } from '@/types';

type FindingInput = Omit<ScanFinding, 'id' | 'scan_id' | 'created_at'>;

interface HeaderCheck {
  header: string;
  severity: Severity;
  title: string;
  description: string;
  recommendation: string;
  validateValue?: (value: string) => { ok: boolean; note?: string };
}

const SECURITY_HEADERS: HeaderCheck[] = [
  {
    header: 'strict-transport-security',
    severity: 'high',
    title: 'Strict-Transport-Security (HSTS) fehlt',
    description: 'Der HSTS-Header erzwingt sichere HTTPS-Verbindungen und verhindert Downgrade-Angriffe.',
    recommendation: 'Füge den Header hinzu: Strict-Transport-Security: max-age=31536000; includeSubDomains',
    validateValue: (value) => {
      const maxAge = value.match(/max-age=(\d+)/);
      if (maxAge && parseInt(maxAge[1]) < 31536000) {
        return { ok: false, note: 'max-age sollte mindestens 31536000 (1 Jahr) betragen.' };
      }
      return { ok: true };
    },
  },
  {
    header: 'content-security-policy',
    severity: 'high',
    title: 'Content-Security-Policy (CSP) fehlt',
    description: 'CSP schützt gegen XSS und Dateninjektions-Angriffe, indem es definiert, welche Quellen geladen werden dürfen.',
    recommendation: 'Implementiere eine Content-Security-Policy. Starte z.B. mit: Content-Security-Policy: default-src \'self\'; script-src \'self\'',
    validateValue: (value) => {
      if (value.includes('unsafe-inline') && value.includes('unsafe-eval')) {
        return { ok: false, note: 'CSP enthält sowohl unsafe-inline als auch unsafe-eval, was den Schutz erheblich schwächt.' };
      }
      return { ok: true };
    },
  },
  {
    header: 'x-content-type-options',
    severity: 'medium',
    title: 'X-Content-Type-Options fehlt',
    description: 'Verhindert MIME-Type-Sniffing, das zu Sicherheitsproblemen führen kann.',
    recommendation: 'Füge hinzu: X-Content-Type-Options: nosniff',
    validateValue: (value) => {
      return { ok: value.toLowerCase() === 'nosniff' };
    },
  },
  {
    header: 'x-frame-options',
    severity: 'medium',
    title: 'X-Frame-Options fehlt',
    description: 'Schützt gegen Clickjacking-Angriffe, bei denen deine Seite in einem unsichtbaren Frame geladen wird.',
    recommendation: 'Füge hinzu: X-Frame-Options: DENY oder SAMEORIGIN',
    validateValue: (value) => {
      const valid = ['deny', 'sameorigin'];
      return { ok: valid.includes(value.toLowerCase()) };
    },
  },
  {
    header: 'x-xss-protection',
    severity: 'low',
    title: 'X-XSS-Protection fehlt',
    description: 'Aktiviert den in vielen Browsern eingebauten XSS-Filter (veraltet, aber noch nützlich als zusätzliche Schutzschicht).',
    recommendation: 'Füge hinzu: X-XSS-Protection: 1; mode=block',
  },
  {
    header: 'referrer-policy',
    severity: 'low',
    title: 'Referrer-Policy fehlt',
    description: 'Kontrolliert, welche Referrer-Informationen bei Navigation weitergegeben werden.',
    recommendation: 'Füge hinzu: Referrer-Policy: strict-origin-when-cross-origin',
  },
  {
    header: 'permissions-policy',
    severity: 'low',
    title: 'Permissions-Policy fehlt',
    description: 'Kontrolliert, welche Browser-Features (Kamera, Mikrofon, Geolocation etc.) von der Seite genutzt werden dürfen.',
    recommendation: 'Füge hinzu: Permissions-Policy: camera=(), microphone=(), geolocation=()',
  },
];

export async function analyzeHeaders(url: string): Promise<FindingInput[]> {
  const findings: FindingInput[] = [];

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'TestMe-Security-Scanner/1.0' },
      redirect: 'follow',
    });

    const headers = response.headers;

    for (const check of SECURITY_HEADERS) {
      const value = headers.get(check.header);

      if (!value) {
        findings.push({
          category: 'headers',
          severity: check.severity,
          title: check.title,
          description: check.description,
          affected_url: url,
          recommendation: check.recommendation,
          details: { header: check.header, present: false },
        });
      } else if (check.validateValue) {
        const result = check.validateValue(value);
        if (!result.ok) {
          findings.push({
            category: 'headers',
            severity: check.severity === 'high' ? 'medium' : 'low',
            title: `${check.header} – Konfigurationsproblem`,
            description: result.note || `Der Header ${check.header} ist zwar vorhanden, aber nicht optimal konfiguriert.`,
            affected_url: url,
            recommendation: check.recommendation,
            details: { header: check.header, present: true, value, issue: result.note },
          });
        }
      }
    }

    // Check for Server header information disclosure
    const server = headers.get('server');
    if (server && /\d/.test(server)) {
      findings.push({
        category: 'headers',
        severity: 'low',
        title: 'Server-Header gibt Versionsinformation preis',
        description: `Der Server-Header "${server}" enthält Versionsinformationen, die Angreifern helfen können, bekannte Schwachstellen zu identifizieren.`,
        affected_url: url,
        recommendation: 'Entferne oder anonymisiere den Server-Header in deiner Webserver-Konfiguration.',
        details: { header: 'server', value: server },
      });
    }

    // Check for X-Powered-By header
    const poweredBy = headers.get('x-powered-by');
    if (poweredBy) {
      findings.push({
        category: 'headers',
        severity: 'low',
        title: 'X-Powered-By Header gibt Technologie-Stack preis',
        description: `Der Header "X-Powered-By: ${poweredBy}" verrät die verwendete Technologie und erleichtert gezielte Angriffe.`,
        affected_url: url,
        recommendation: 'Entferne den X-Powered-By Header in der Server-/Framework-Konfiguration.',
        details: { header: 'x-powered-by', value: poweredBy },
      });
    }

  } catch (error) {
    findings.push({
      category: 'headers',
      severity: 'info',
      title: 'Header-Analyse fehlgeschlagen',
      description: `Die Header-Analyse konnte nicht durchgeführt werden: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
      affected_url: url,
      recommendation: 'Stelle sicher, dass die Website erreichbar ist.',
      details: null,
    });
  }

  return findings;
}
