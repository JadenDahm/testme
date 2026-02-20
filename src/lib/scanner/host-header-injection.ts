import type { ScanFinding } from '@/types';

type FindingInput = Omit<ScanFinding, 'id' | 'scan_id' | 'created_at'>;

// ── Host Header Injection Check ─────────────────────────────────────────
export async function checkHostHeaderInjection(domain: string): Promise<FindingInput[]> {
  const findings: FindingInput[] = [];
  const baseUrl = `https://${domain}`;

  // Test 1: Inject different Host header
  try {
    const evilHost = 'evil.testme-scanner.example';
    const response = await fetch(baseUrl, {
      method: 'GET',
      headers: {
        Host: evilHost,
        'User-Agent': 'TestMe-Security-Scanner/1.0',
      },
      signal: AbortSignal.timeout(10000),
      redirect: 'manual',
    });

    const body = await response.text();
    const location = response.headers.get('location') || '';

    // Check if the evil host appears in the response
    if (body.includes(evilHost) || location.includes(evilHost)) {
      findings.push({
        category: 'vulnerability',
        severity: 'high',
        title: 'Host Header Injection erkannt',
        description: `Der Server reflektiert den injizierten Host-Header "${evilHost}" in der Antwort. Dies ermöglicht Angriffe wie Cache Poisoning, Password Reset Poisoning und SSRF.`,
        affected_url: baseUrl,
        recommendation: 'Konfiguriere den Server so, dass er nur den erwarteten Hostnamen akzeptiert. Verwende eine explizite Server-Konfiguration und validiere den Host-Header serverseitig.',
        details: {
          injectedHost: evilHost,
          reflectedInBody: body.includes(evilHost),
          reflectedInLocation: location.includes(evilHost),
        },
      });
    }
  } catch {
    // Request failed, Host header might be properly validated
  }

  // Test 2: X-Forwarded-Host injection
  try {
    const evilHost = 'evil.testme-scanner.example';
    const response = await fetch(baseUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'TestMe-Security-Scanner/1.0',
        'X-Forwarded-Host': evilHost,
        'X-Forwarded-For': '127.0.0.1',
      },
      signal: AbortSignal.timeout(10000),
      redirect: 'manual',
    });

    const body = await response.text();
    const location = response.headers.get('location') || '';

    if (body.includes(evilHost) || location.includes(evilHost)) {
      findings.push({
        category: 'vulnerability',
        severity: 'high',
        title: 'X-Forwarded-Host Injection erkannt',
        description: `Der Server vertraut dem X-Forwarded-Host Header und reflektiert "${evilHost}" in der Antwort. Dies kann für Cache Poisoning, Open Redirect und Password Reset Poisoning missbraucht werden.`,
        affected_url: baseUrl,
        recommendation: 'Konfiguriere den Server so, dass X-Forwarded-Host nur von vertrauenswürdigen Reverse-Proxies akzeptiert wird. Validiere den Hostnamen serverseitig.',
        details: {
          header: 'X-Forwarded-Host',
          injectedHost: evilHost,
        },
      });
    }
  } catch {
    // Expected for properly configured servers
  }

  // Test 3: Check for open redirect via Host header
  try {
    const response = await fetch(baseUrl + '/', {
      method: 'GET',
      headers: {
        Host: `${domain}@evil.com`,
        'User-Agent': 'TestMe-Security-Scanner/1.0',
      },
      signal: AbortSignal.timeout(10000),
      redirect: 'manual',
    });

    const location = response.headers.get('location') || '';
    if (location.includes('evil.com')) {
      findings.push({
        category: 'vulnerability',
        severity: 'high',
        title: 'Open Redirect via Host Header Manipulation',
        description: 'Der Server leitet zu einer vom Angreifer kontrollierten Domain um, wenn der Host-Header manipuliert wird. Dies ermöglicht Phishing-Angriffe.',
        affected_url: baseUrl,
        recommendation: 'Validiere den Host-Header und erlaube nur den konfigurierten Hostnamen. Verwende keine Host-Header-Werte für Weiterleitungen.',
        details: { redirectTo: location },
      });
    }
  } catch {
    // Expected
  }

  // Test 4: SSRF via Host header with internal IP
  try {
    const response = await fetch(baseUrl, {
      method: 'GET',
      headers: {
        Host: '127.0.0.1',
        'User-Agent': 'TestMe-Security-Scanner/1.0',
      },
      signal: AbortSignal.timeout(10000),
      redirect: 'manual',
    });

    // If the server responds with 200 using a localhost Host header, it might be misconfigured
    if (response.status === 200) {
      const body = await response.text();
      // Check if it's a different page than expected (server info page, default page)
      if (body.includes('Apache') || body.includes('nginx') || body.includes('IIS') ||
          body.includes('Welcome') || body.includes('It works!')) {
        findings.push({
          category: 'vulnerability',
          severity: 'medium',
          title: 'Server akzeptiert Host Header mit internen IP-Adressen',
          description: 'Der Server antwortet auf Anfragen mit Host: 127.0.0.1 mit einer Standardseite. Dies kann auf eine fehlerhafte Server-Konfiguration hinweisen und SSRF-Angriffe erleichtern.',
          affected_url: baseUrl,
          recommendation: 'Konfiguriere den Server so, dass er nur auf den konfigurierten Hostnamen antwortet. Verwende eine Catch-all Virtual Host-Konfiguration, die unbekannte Host-Header ablehnt.',
          details: null,
        });
      }
    }
  } catch {
    // Expected
  }

  if (findings.length === 0) {
    findings.push({
      category: 'headers',
      severity: 'info',
      title: 'Host Header Injection nicht anfällig',
      description: 'Der Server scheint Host Header Manipulation korrekt zu behandeln. Keine Reflektion des injizierten Host-Headers in der Antwort gefunden.',
      affected_url: baseUrl,
      recommendation: null,
      details: null,
    });
  }

  return findings;
}
