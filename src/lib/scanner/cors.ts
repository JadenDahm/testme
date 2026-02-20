import type { ScanFinding } from '@/types';

type FindingInput = Omit<ScanFinding, 'id' | 'scan_id' | 'created_at'>;

export async function checkCors(domain: string): Promise<FindingInput[]> {
  const findings: FindingInput[] = [];
  const url = `https://${domain}`;

  // Test 1: Wildcard Origin
  await testOrigin(url, 'https://evil-attacker.com', findings, domain);

  // Test 2: Null Origin (used in sandboxed iframes, redirects)
  await testNullOrigin(url, findings, domain);

  // Test 3: Subdomain takeover via CORS
  await testOrigin(url, `https://evil.${domain}`, findings, domain);

  // Test 4: HTTP origin on HTTPS site
  await testOrigin(url, `http://${domain}`, findings, domain);

  // Test 5: Check common API endpoints
  const apiPaths = ['/api', '/api/v1', '/graphql', '/api/graphql'];
  for (const path of apiPaths) {
    await testOrigin(`${url}${path}`, 'https://evil-attacker.com', findings, domain);
    await new Promise((r) => setTimeout(r, 200));
  }

  return findings;
}

async function testOrigin(
  url: string,
  origin: string,
  findings: FindingInput[],
  domain: string
) {
  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(8000),
      headers: {
        'User-Agent': 'TestMe-Security-Scanner/1.0',
        'Origin': origin,
      },
      redirect: 'follow',
    });

    const acao = response.headers.get('access-control-allow-origin');
    const acac = response.headers.get('access-control-allow-credentials');

    if (!acao) return;

    // Critical: Wildcard with credentials
    if (acao === '*' && acac === 'true') {
      findings.push({
        category: 'vulnerability',
        severity: 'critical',
        title: 'CORS: Wildcard-Origin mit Credentials erlaubt',
        description: 'Die CORS-Konfiguration erlaubt jeden Origin (*) in Kombination mit Credentials. Jede beliebige Website kann authentifizierte Anfragen an deine API senden.',
        affected_url: url,
        recommendation: 'Entferne entweder Access-Control-Allow-Credentials oder ersetze den Wildcard-Origin durch eine explizite Whitelist.',
        details: { 'access-control-allow-origin': acao, 'access-control-allow-credentials': acac, testedOrigin: origin },
      });
      return;
    }

    // High: Reflects arbitrary origin
    if (acao === origin && !origin.endsWith(domain)) {
      const severity = acac === 'true' ? 'critical' : 'high';
      findings.push({
        category: 'vulnerability',
        severity,
        title: `CORS: Beliebiger Origin wird reflektiert${acac === 'true' ? ' (mit Credentials)' : ''}`,
        description: `Der Server reflektiert den Origin-Header "${origin}" in der CORS-Antwort${acac === 'true' ? ' und erlaubt Credentials' : ''}. Angreifer können Cross-Origin-Anfragen von jeder Domain senden.`,
        affected_url: url,
        recommendation: 'Implementiere eine strikte Whitelist für erlaubte Origins. Reflektiere niemals blindlings den Origin-Header.',
        details: { 'access-control-allow-origin': acao, 'access-control-allow-credentials': acac, testedOrigin: origin },
      });
      return;
    }

    // Medium: Wildcard without credentials
    if (acao === '*') {
      findings.push({
        category: 'vulnerability',
        severity: 'medium',
        title: 'CORS: Wildcard-Origin konfiguriert',
        description: 'Access-Control-Allow-Origin ist auf * gesetzt. Jede Website kann Daten von dieser Ressource laden.',
        affected_url: url,
        recommendation: 'Beschränke den erlaubten Origin auf die tatsächlich benötigten Domains, falls sensible Daten zurückgegeben werden.',
        details: { 'access-control-allow-origin': acao, testedOrigin: origin },
      });
    }
  } catch {
    // Ignore
  }
}

async function testNullOrigin(url: string, findings: FindingInput[], domain: string) {
  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(8000),
      headers: {
        'User-Agent': 'TestMe-Security-Scanner/1.0',
        'Origin': 'null',
      },
      redirect: 'follow',
    });

    const acao = response.headers.get('access-control-allow-origin');
    const acac = response.headers.get('access-control-allow-credentials');

    if (acao === 'null') {
      findings.push({
        category: 'vulnerability',
        severity: acac === 'true' ? 'high' : 'medium',
        title: 'CORS: Null-Origin wird akzeptiert',
        description: 'Der Server akzeptiert "null" als Origin. Sandboxed iFrames und lokale Dateien senden null als Origin und können so Zugriff erhalten.',
        affected_url: url,
        recommendation: 'Blockiere "null" als erlaubten Origin in deiner CORS-Konfiguration.',
        details: { 'access-control-allow-origin': acao, 'access-control-allow-credentials': acac },
      });
    }
  } catch {
    // Ignore
  }
}
