import type { ScanFinding } from '@/types';

type FindingInput = Omit<ScanFinding, 'id' | 'scan_id' | 'created_at'>;

export async function checkSsl(domain: string): Promise<FindingInput[]> {
  const findings: FindingInput[] = [];
  const url = `https://${domain}`;

  // 1. Check if HTTPS is accessible
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'TestMe-Security-Scanner/1.0' },
      redirect: 'manual',
    });

    // HTTPS works
    findings.push({
      category: 'ssl',
      severity: 'info',
      title: 'HTTPS ist aktiv',
      description: 'Die Website ist über HTTPS erreichbar.',
      affected_url: url,
      recommendation: null,
      details: { statusCode: response.status },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';

    if (message.includes('certificate') || message.includes('CERT') || message.includes('SSL')) {
      findings.push({
        category: 'ssl',
        severity: 'critical',
        title: 'SSL/TLS-Zertifikatsfehler',
        description: `Die HTTPS-Verbindung ist fehlerhaft: ${message}. Dies kann auf ein abgelaufenes, selbstsigniertes oder falsch konfiguriertes Zertifikat hinweisen.`,
        affected_url: url,
        recommendation: 'Stelle sicher, dass ein gültiges SSL-Zertifikat installiert ist. Nutze z.B. Let\'s Encrypt für kostenlose Zertifikate.',
        details: { error: message },
      });
    } else {
      findings.push({
        category: 'ssl',
        severity: 'high',
        title: 'HTTPS nicht erreichbar',
        description: `Die Website konnte über HTTPS nicht erreicht werden: ${message}`,
        affected_url: url,
        recommendation: 'Aktiviere HTTPS für deine Website mit einem gültigen SSL/TLS-Zertifikat.',
        details: { error: message },
      });
    }
  }

  // 2. Check HTTP to HTTPS redirect
  try {
    const httpResponse = await fetch(`http://${domain}`, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'TestMe-Security-Scanner/1.0' },
      redirect: 'manual',
    });

    const location = httpResponse.headers.get('location');
    if (httpResponse.status >= 300 && httpResponse.status < 400 && location?.startsWith('https://')) {
      findings.push({
        category: 'ssl',
        severity: 'info',
        title: 'HTTP zu HTTPS Weiterleitung aktiv',
        description: 'HTTP-Anfragen werden korrekt auf HTTPS weitergeleitet.',
        affected_url: `http://${domain}`,
        recommendation: null,
        details: { redirectTo: location },
      });
    } else if (httpResponse.ok) {
      findings.push({
        category: 'ssl',
        severity: 'high',
        title: 'Keine HTTP zu HTTPS Weiterleitung',
        description: 'Die Website ist auch über unverschlüsseltes HTTP erreichbar, ohne auf HTTPS weiterzuleiten.',
        affected_url: `http://${domain}`,
        recommendation: 'Konfiguriere eine permanente (301) Weiterleitung von HTTP auf HTTPS.',
        details: { httpStatusCode: httpResponse.status },
      });
    }
  } catch {
    // HTTP not accessible - that's fine if HTTPS works
  }

  return findings;
}
