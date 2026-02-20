import type { ScanFinding } from '@/types';

type FindingInput = Omit<ScanFinding, 'id' | 'scan_id' | 'created_at'>;

interface HeaderCheck {
  header: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  recommendation: string;
  validateValue?: (value: string) => { ok: boolean; note?: string };
}

const SECURITY_HEADERS: HeaderCheck[] = [
  {
    header: 'strict-transport-security',
    severity: 'high',
    title: 'HSTS-Header fehlt',
    description:
      'Ohne Strict-Transport-Security können Angreifer HTTPS-Verbindungen per Man-in-the-Middle auf HTTP downgraden.',
    recommendation:
      'Setze den Header: Strict-Transport-Security: max-age=31536000; includeSubDomains; preload',
    validateValue: (val) => {
      const maxAge = parseInt(val.match(/max-age=(\d+)/)?.[1] || '0');
      if (maxAge < 15768000) {
        return {
          ok: false,
          note: `max-age ist ${maxAge} (< 6 Monate). Empfohlen: mindestens 31536000 (1 Jahr).`,
        };
      }
      if (!val.toLowerCase().includes('includesubdomains')) {
        return {
          ok: false,
          note: 'includeSubDomains fehlt. Subdomains sind nicht geschützt.',
        };
      }
      return { ok: true };
    },
  },
  {
    header: 'content-security-policy',
    severity: 'high',
    title: 'Content-Security-Policy fehlt',
    description:
      'Ohne CSP gibt es keinen Schutz gegen Cross-Site-Scripting (XSS), Clickjacking und andere Injection-Angriffe auf Browser-Ebene.',
    recommendation:
      "Implementiere eine Content-Security-Policy. Starte mit einer restriktiven Policy und lockere sie nach Bedarf: default-src 'self'; script-src 'self'; style-src 'self'",
    validateValue: (val) => {
      const issues: string[] = [];

      // Check for unsafe-inline in script-src
      if (
        val.includes("script-src") &&
        val.includes("'unsafe-inline'") &&
        !val.includes("'nonce-") &&
        !val.includes("'strict-dynamic'")
      ) {
        issues.push("script-src enthält 'unsafe-inline' ohne Nonce/Hash – XSS-Schutz ist unwirksam.");
      }

      // Check for unsafe-eval
      if (val.includes("'unsafe-eval'")) {
        issues.push("'unsafe-eval' ist aktiv – erlaubt eval() und ähnliche gefährliche Funktionen.");
      }

      // Check for wildcard sources
      if (/(?:script-src|default-src)[^;]*\*/.test(val)) {
        issues.push('Wildcard (*) in script-src/default-src erlaubt Scripts von beliebigen Quellen.');
      }

      // Check for data: in script-src
      if (/script-src[^;]*data:/i.test(val)) {
        issues.push("data: URI in script-src kann für XSS-Angriffe missbraucht werden.");
      }

      // Check for missing directives
      if (!val.includes('frame-ancestors')) {
        issues.push('frame-ancestors fehlt – kein Clickjacking-Schutz durch CSP.');
      }
      if (!val.includes('base-uri')) {
        issues.push("base-uri fehlt – Base-Tag-Injection möglich.");
      }
      if (!val.includes('form-action')) {
        issues.push('form-action fehlt – Formulare können an beliebige Ziele senden.');
      }

      if (issues.length > 0) {
        return { ok: false, note: issues.join(' | ') };
      }
      return { ok: true };
    },
  },
  {
    header: 'x-content-type-options',
    severity: 'medium',
    title: 'X-Content-Type-Options fehlt',
    description:
      'Ohne diesen Header kann der Browser MIME-Typen erraten (Sniffing), was zu XSS-Angriffen führen kann.',
    recommendation: 'Setze den Header: X-Content-Type-Options: nosniff',
    validateValue: (val) => {
      if (val.toLowerCase() !== 'nosniff') {
        return { ok: false, note: `Wert "${val}" ist ungültig. Nur "nosniff" ist korrekt.` };
      }
      return { ok: true };
    },
  },
  {
    header: 'x-frame-options',
    severity: 'medium',
    title: 'X-Frame-Options fehlt',
    description:
      'Ohne X-Frame-Options kann die Website in einem iFrame auf einer anderen Seite eingebettet werden (Clickjacking).',
    recommendation: 'Setze den Header: X-Frame-Options: DENY oder SAMEORIGIN',
    validateValue: (val) => {
      const upper = val.toUpperCase();
      if (upper !== 'DENY' && upper !== 'SAMEORIGIN') {
        return {
          ok: false,
          note: `Wert "${val}" ist ungewöhnlich. Empfohlen: DENY oder SAMEORIGIN.`,
        };
      }
      return { ok: true };
    },
  },
  {
    header: 'referrer-policy',
    severity: 'medium',
    title: 'Referrer-Policy fehlt',
    description:
      'Ohne Referrer-Policy können sensible URL-Informationen an externe Seiten weitergegeben werden.',
    recommendation:
      'Setze den Header: Referrer-Policy: strict-origin-when-cross-origin oder no-referrer',
    validateValue: (val) => {
      const unsafeValues = ['unsafe-url', 'no-referrer-when-downgrade'];
      if (unsafeValues.includes(val.toLowerCase())) {
        return {
          ok: false,
          note: `"${val}" gibt den vollen Referrer an externe Seiten weiter.`,
        };
      }
      return { ok: true };
    },
  },
  {
    header: 'permissions-policy',
    severity: 'medium',
    title: 'Permissions-Policy fehlt',
    description:
      'Ohne Permissions-Policy können eingebettete Inhalte Zugriff auf Kamera, Mikrofon, Geolocation und andere Browser-APIs anfordern.',
    recommendation:
      'Setze den Header: Permissions-Policy: camera=(), microphone=(), geolocation=()',
  },
  {
    header: 'x-xss-protection',
    severity: 'low',
    title: 'X-XSS-Protection fehlt',
    description:
      'Ältere Browser (IE, Safari) nutzen diesen Header für ihren eingebauten XSS-Filter. In modernen Browsern wird er durch CSP ersetzt.',
    recommendation:
      'Setze den Header: X-XSS-Protection: 0 (deaktivieren, da CSP besser ist) oder 1; mode=block',
    validateValue: (val) => {
      if (val === '0') return { ok: true }; // Explicitly disabled is fine with CSP
      if (val.includes('mode=block')) return { ok: true };
      return {
        ok: false,
        note: 'Verwende "0" (bei vorhandener CSP) oder "1; mode=block".',
      };
    },
  },
];

// Additional security-relevant headers
const ADDITIONAL_HEADERS: HeaderCheck[] = [
  {
    header: 'cross-origin-opener-policy',
    severity: 'low',
    title: 'Cross-Origin-Opener-Policy fehlt',
    description:
      'Ohne COOP können andere Browsing-Contexts (geöffnete Fenster/Tabs) auf Objekte deiner Seite zugreifen.',
    recommendation: 'Setze den Header: Cross-Origin-Opener-Policy: same-origin',
  },
  {
    header: 'cross-origin-resource-policy',
    severity: 'low',
    title: 'Cross-Origin-Resource-Policy fehlt',
    description:
      'Ohne CORP können Ressourcen deiner Website von beliebigen anderen Seiten eingebunden werden.',
    recommendation:
      'Setze den Header: Cross-Origin-Resource-Policy: same-origin oder same-site',
  },
  {
    header: 'cross-origin-embedder-policy',
    severity: 'low',
    title: 'Cross-Origin-Embedder-Policy fehlt',
    description:
      'COEP kontrolliert, welche Cross-Origin-Ressourcen eingebettet werden dürfen und aktiviert höhere Isolation.',
    recommendation: 'Setze den Header: Cross-Origin-Embedder-Policy: require-corp',
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

    // ── Primary Security Headers ─────────────────────────────────
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
            description:
              result.note ||
              `Der Header ${check.header} ist vorhanden, aber nicht optimal konfiguriert.`,
            affected_url: url,
            recommendation: check.recommendation,
            details: { header: check.header, present: true, value, issue: result.note },
          });
        }
      }
    }

    // ── Additional Security Headers ──────────────────────────────
    for (const check of ADDITIONAL_HEADERS) {
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
      }
    }

    // ── Information Disclosure Headers ────────────────────────────
    const server = headers.get('server');
    if (server && /\d/.test(server)) {
      findings.push({
        category: 'headers',
        severity: 'low',
        title: 'Server-Header gibt Versionsinformation preis',
        description: `Der Server-Header "${server}" enthält Versionsinformationen.`,
        affected_url: url,
        recommendation:
          'Entferne oder anonymisiere den Server-Header in deiner Webserver-Konfiguration.',
        details: { header: 'server', value: server },
      });
    }

    const poweredBy = headers.get('x-powered-by');
    if (poweredBy) {
      findings.push({
        category: 'headers',
        severity: 'low',
        title: 'X-Powered-By Header gibt Technologie-Stack preis',
        description: `Der Header "X-Powered-By: ${poweredBy}" verrät die verwendete Technologie.`,
        affected_url: url,
        recommendation:
          'Entferne den X-Powered-By Header in der Server-/Framework-Konfiguration.',
        details: { header: 'x-powered-by', value: poweredBy },
      });
    }

    const aspNetVersion = headers.get('x-aspnet-version');
    if (aspNetVersion) {
      findings.push({
        category: 'headers',
        severity: 'low',
        title: 'ASP.NET-Version wird offengelegt',
        description: `X-AspNet-Version: ${aspNetVersion}`,
        affected_url: url,
        recommendation: 'Entferne den X-AspNet-Version Header.',
        details: { header: 'x-aspnet-version', value: aspNetVersion },
      });
    }

    const aspNetMvcVersion = headers.get('x-aspnetmvc-version');
    if (aspNetMvcVersion) {
      findings.push({
        category: 'headers',
        severity: 'low',
        title: 'ASP.NET MVC-Version wird offengelegt',
        description: `X-AspNetMvc-Version: ${aspNetMvcVersion}`,
        affected_url: url,
        recommendation: 'Entferne den X-AspNetMvc-Version Header.',
        details: { header: 'x-aspnetmvc-version', value: aspNetMvcVersion },
      });
    }

    // ── Cache-Control for sensitive pages ──────────────────────────
    const cacheControl = headers.get('cache-control');
    const isHttps = url.startsWith('https://');
    if (isHttps && (!cacheControl || (!cacheControl.includes('no-store') && !cacheControl.includes('private')))) {
      findings.push({
        category: 'headers',
        severity: 'low',
        title: 'Cache-Control Header fehlt oder ist zu permissiv',
        description: 'Ohne Cache-Control: no-store oder private können sensible Daten in Browser-/Proxy-Caches gespeichert werden.',
        affected_url: url,
        recommendation: 'Setze Cache-Control: no-store für Seiten mit sensiblen Daten oder private für personalisierte Inhalte.',
        details: { header: 'cache-control', value: cacheControl || 'nicht gesetzt' },
      });
    }

    // ── Detailed CSP Analysis (if present) ────────────────────────
    const csp = headers.get('content-security-policy');
    if (csp) {
      analyzeCspInDepth(csp, url, findings);
    }

    // Check for CSP Report-Only (it doesn't enforce)
    const cspReportOnly = headers.get('content-security-policy-report-only');
    if (cspReportOnly && !csp) {
      findings.push({
        category: 'headers',
        severity: 'medium',
        title: 'Nur CSP Report-Only, keine aktive CSP',
        description: 'Es existiert nur eine Content-Security-Policy-Report-Only, die Verstöße nicht blockiert. Ohne eine aktive CSP besteht kein effektiver Schutz.',
        affected_url: url,
        recommendation: 'Aktiviere eine echte Content-Security-Policy zusätzlich zur Report-Only-Policy.',
        details: { reportOnly: cspReportOnly.substring(0, 200) },
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

function analyzeCspInDepth(csp: string, url: string, findings: FindingInput[]) {
  const directives = parseCspDirectives(csp);

  // Check for missing important directives
  const importantDirectives = [
    { name: 'default-src', desc: 'Fallback für alle Ressourcentypen' },
    { name: 'script-src', desc: 'JavaScript-Quellen' },
    { name: 'style-src', desc: 'CSS-Quellen' },
    { name: 'img-src', desc: 'Bild-Quellen' },
    { name: 'connect-src', desc: 'Fetch/XHR-Ziele' },
    { name: 'font-src', desc: 'Schriftarten-Quellen' },
    { name: 'object-src', desc: 'Plugin-Objekte (Flash, etc.)' },
    { name: 'frame-src', desc: 'iFrame-Quellen' },
    { name: 'frame-ancestors', desc: 'Clickjacking-Schutz' },
    { name: 'base-uri', desc: 'Base-Tag-Schutz' },
    { name: 'form-action', desc: 'Formular-Ziele' },
  ];

  const missingCritical: string[] = [];
  for (const dir of importantDirectives) {
    if (!directives[dir.name] && !directives['default-src'] && dir.name !== 'default-src') {
      // Only flag if no default-src either
      continue;
    }
    if (
      !directives[dir.name] &&
      (dir.name === 'frame-ancestors' ||
        dir.name === 'base-uri' ||
        dir.name === 'form-action' ||
        dir.name === 'object-src')
    ) {
      missingCritical.push(`${dir.name} (${dir.desc})`);
    }
  }

  if (missingCritical.length > 0) {
    findings.push({
      category: 'headers',
      severity: 'medium',
      title: 'CSP: Wichtige Direktiven fehlen',
      description: `Folgende wichtige CSP-Direktiven fehlen: ${missingCritical.join(', ')}`,
      affected_url: url,
      recommendation: `Ergänze die fehlenden Direktiven in deiner CSP: ${missingCritical.map((c) => c.split(' ')[0]).join('; ')}`,
      details: { missingDirectives: missingCritical },
    });
  }

  // Check object-src
  const objectSrc = directives['object-src'];
  if (objectSrc && objectSrc !== "'none'" && !objectSrc.includes("'none'")) {
    findings.push({
      category: 'headers',
      severity: 'medium',
      title: "CSP: object-src ist nicht 'none'",
      description: 'object-src erlaubt Plugin-Objekte (Flash, Java). Diese sollten blockiert werden.',
      affected_url: url,
      recommendation: "Setze object-src auf 'none' in deiner CSP.",
      details: { 'object-src': objectSrc },
    });
  }

  // Check for report-uri / report-to
  if (!directives['report-uri'] && !directives['report-to']) {
    findings.push({
      category: 'headers',
      severity: 'info',
      title: 'CSP: Kein Reporting konfiguriert',
      description: 'Ohne report-uri oder report-to werden CSP-Verstöße nicht gemeldet.',
      affected_url: url,
      recommendation: 'Füge report-to oder report-uri zu deiner CSP hinzu, um Verstöße zu überwachen.',
      details: null,
    });
  }
}

function parseCspDirectives(csp: string): Record<string, string> {
  const directives: Record<string, string> = {};
  const parts = csp.split(';').map((s) => s.trim()).filter(Boolean);

  for (const part of parts) {
    const spaceIndex = part.indexOf(' ');
    if (spaceIndex === -1) {
      directives[part.toLowerCase()] = '';
    } else {
      const name = part.substring(0, spaceIndex).toLowerCase();
      const value = part.substring(spaceIndex + 1).trim();
      directives[name] = value;
    }
  }

  return directives;
}
