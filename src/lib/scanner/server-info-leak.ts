import type { ScanFinding } from '@/types';
import { fetchWithRetry } from './utils';

type FindingInput = Omit<ScanFinding, 'id' | 'scan_id' | 'created_at'>;

// ── Server-Timing Header Information Leak ───────────────────────────────
async function checkServerTimingLeak(url: string, findings: FindingInput[]) {
  try {
    const response = await fetchWithRetry(url, {
      headers: { 'User-Agent': 'TestMe-Security-Scanner/1.0' },
      signal: AbortSignal.timeout(10000),
      redirect: 'follow',
    });

    const serverTiming = response.headers.get('server-timing');
    if (serverTiming) {
      // Check if it reveals internal information
      const hasInternalInfo = /db|database|cache|redis|memcache|mysql|postgres|mongo|queue|worker|upstream/i.test(serverTiming);

      if (hasInternalInfo) {
        findings.push({
          category: 'headers',
          severity: 'medium',
          title: 'Server-Timing Header gibt interne Infrastruktur preis',
          description: `Der Server-Timing Header enthält Informationen über die interne Infrastruktur: "${serverTiming}". Angreifer können diese Informationen für gezielte Angriffe nutzen.`,
          affected_url: url,
          recommendation: 'Entferne den Server-Timing Header in der Produktion oder reduziere ihn auf nicht-sensible Metriken. Verwende ihn nur in Entwicklungsumgebungen.',
          details: { serverTiming },
        });
      } else {
        findings.push({
          category: 'info',
          severity: 'info',
          title: 'Server-Timing Header vorhanden',
          description: `Server-Timing Header: "${serverTiming}". Der Header enthält keine offensichtlich sensiblen Informationen.`,
          affected_url: url,
          recommendation: 'Prüfe regelmäßig, ob der Server-Timing Header keine sensiblen Informationen preisgibt.',
          details: { serverTiming },
        });
      }
    }
  } catch {
    // Ignore
  }
}

// ── X-Powered-By and Version Disclosure ─────────────────────────────────
async function checkVersionDisclosure(url: string, findings: FindingInput[]) {
  try {
    const response = await fetchWithRetry(url, {
      headers: { 'User-Agent': 'TestMe-Security-Scanner/1.0' },
      signal: AbortSignal.timeout(10000),
      redirect: 'follow',
    });

    const headers = response.headers;
    const disclosures: { header: string; value: string }[] = [];

    // Check X-Powered-By
    const poweredBy = headers.get('x-powered-by');
    if (poweredBy) {
      disclosures.push({ header: 'X-Powered-By', value: poweredBy });
    }

    // Check X-AspNet-Version
    const aspNetVersion = headers.get('x-aspnet-version');
    if (aspNetVersion) {
      disclosures.push({ header: 'X-AspNet-Version', value: aspNetVersion });
    }

    // Check X-AspNetMvc-Version
    const aspMvcVersion = headers.get('x-aspnetmvc-version');
    if (aspMvcVersion) {
      disclosures.push({ header: 'X-AspNetMvc-Version', value: aspMvcVersion });
    }

    // Check Server header for version info
    const server = headers.get('server');
    if (server && /\d+\.\d+/.test(server)) {
      disclosures.push({ header: 'Server', value: server });
    }

    // Check X-Generator
    const generator = headers.get('x-generator');
    if (generator) {
      disclosures.push({ header: 'X-Generator', value: generator });
    }

    // Check X-Drupal-Cache
    const drupalCache = headers.get('x-drupal-cache');
    if (drupalCache) {
      disclosures.push({ header: 'X-Drupal-Cache', value: drupalCache });
    }

    // Check X-Varnish
    const varnish = headers.get('x-varnish');
    if (varnish) {
      disclosures.push({ header: 'X-Varnish', value: varnish });
    }

    // Check X-Runtime (reveals server processing time = timing attack)
    const runtime = headers.get('x-runtime');
    if (runtime) {
      disclosures.push({ header: 'X-Runtime', value: runtime });
    }

    // Check X-Request-Id (can leak internal request tracking)
    const requestId = headers.get('x-request-id');
    if (requestId) {
      // Not necessarily bad, but worth noting
      disclosures.push({ header: 'X-Request-Id', value: requestId });
    }

    if (disclosures.length > 0) {
      const versionDisclosures = disclosures.filter((d) =>
        d.header !== 'X-Request-Id' && d.header !== 'X-Varnish'
      );

      if (versionDisclosures.length > 0) {
        findings.push({
          category: 'headers',
          severity: 'medium',
          title: `${versionDisclosures.length} Server-Informationsleck(s) in HTTP-Headern`,
          description: `Folgende Header geben Informationen über die Server-Software preis: ${versionDisclosures.map((d) => `${d.header}: ${d.value}`).join(', ')}. Angreifer können diese Informationen nutzen, um gezielt bekannte Schwachstellen der eingesetzten Software auszunutzen.`,
          affected_url: url,
          recommendation: 'Entferne oder maskiere diese Header in der Produktion. Für Express.js: app.disable("x-powered-by"). Für nginx: server_tokens off. Für Apache: ServerTokens Prod.',
          details: { disclosures: versionDisclosures },
        });
      }
    }

    // Check HTML meta generator tag
    const body = await response.text();
    const generatorMatch = body.match(/<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)["']/i);
    if (generatorMatch) {
      findings.push({
        category: 'info',
        severity: 'low',
        title: `CMS/Framework in Meta-Generator Tag: ${generatorMatch[1]}`,
        description: `Die Seite enthält ein Meta-Generator-Tag: "${generatorMatch[1]}". Dies verrät das eingesetzte CMS oder Framework und dessen Version.`,
        affected_url: url,
        recommendation: 'Entferne das Meta-Generator-Tag aus dem HTML-Code, um die eingesetzte Software nicht zu verraten.',
        details: { generator: generatorMatch[1] },
      });
    }

  } catch {
    // Ignore
  }
}

// ── Error Page Information Disclosure ───────────────────────────────────
async function checkErrorPageDisclosure(domain: string, findings: FindingInput[]) {
  const testPaths = [
    '/this-page-does-not-exist-testme-404',
    '/api/v1/testme-nonexistent-endpoint',
    '/%00',  // Null byte
    '/..%2f..%2f..%2fetc%2fpasswd',  // Path traversal
  ];

  for (const path of testPaths) {
    try {
      const url = `https://${domain}${path}`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'TestMe-Security-Scanner/1.0' },
        signal: AbortSignal.timeout(8000),
        redirect: 'follow',
      });

      const body = await response.text();

      // Check for stack traces
      const stackTracePatterns = [
        /at\s+\w+\s+\([^)]+:\d+:\d+\)/,           // Node.js stack trace
        /Traceback \(most recent call last\)/,       // Python
        /Fatal error:/i,                             // PHP
        /Exception in thread/,                       // Java
        /Microsoft\.AspNetCore/,                     // ASP.NET
        /System\.Web\.HttpException/,                // ASP.NET
        /SQLSTATE\[/,                                // Database error
        /mysql_/,                                    // MySQL error
        /pg_query/,                                  // PostgreSQL error
        /ORA-\d{5}/,                                 // Oracle error
        /stack trace:/i,
        /debug\s*=/i,
      ];

      for (const pattern of stackTracePatterns) {
        if (pattern.test(body)) {
          findings.push({
            category: 'vulnerability',
            severity: 'high',
            title: 'Stack Trace / Debug-Informationen in Fehlerseite',
            description: `Die Fehlerseite unter ${path} enthält Stack-Traces oder Debug-Informationen. Diese können Dateipfade, Framework-Versionen und Datenbankdetails preisgeben.`,
            affected_url: `https://${domain}${path}`,
            recommendation: 'Deaktiviere Debug-Modus in der Produktion. Verwende generische Fehlerseiten ohne technische Details. Implementiere eine zentrale Fehlerbehandlung.',
            details: { path, statusCode: response.status },
          });
          break;
        }
      }

      // Check for internal path disclosure
      const pathPatterns = [
        /\/home\/\w+\//,                    // Linux home directory
        /\/var\/www\//,                     // Web root
        /\/usr\/local\//,                   // Linux local
        /C:\\\\?(Users|Windows|inetpub)/i,  // Windows paths
        /\/app\//,                          // Container paths
      ];

      for (const pattern of pathPatterns) {
        if (pattern.test(body)) {
          findings.push({
            category: 'secrets',
            severity: 'medium',
            title: 'Interne Serverpfade in Fehlerseite offengelegt',
            description: `Die Fehlerseite unter ${path} enthält interne Dateisystem-Pfade. Dies gibt Aufschluss über die Server-Konfiguration und kann für weiterführende Angriffe genutzt werden.`,
            affected_url: `https://${domain}${path}`,
            recommendation: 'Maskiere interne Pfade in Fehlermeldungen. Verwende eine zentrale Error-Handler-Middleware.',
            details: { path, statusCode: response.status },
          });
          break;
        }
      }
    } catch {
      // Expected for some requests
    }
  }
}

// ── Source Map Detection ────────────────────────────────────────────────
async function checkSourceMaps(domain: string, findings: FindingInput[]) {
  try {
    const response = await fetchWithRetry(`https://${domain}`, {
      headers: { 'User-Agent': 'TestMe-Security-Scanner/1.0' },
      signal: AbortSignal.timeout(10000),
    });
    const html = await response.text();

    // Find JS files
    const jsFiles = html.match(/src=["']([^"']+\.js(?:\?[^"']*)?)/gi) || [];
    let sourceMapFound = false;

    // Check SourceMap header on main page
    const mainSourceMap = response.headers.get('sourcemap') || response.headers.get('x-sourcemap');
    if (mainSourceMap) {
      sourceMapFound = true;
    }

    // Check a few JS files for sourceMappingURL
    const filesToCheck = jsFiles.slice(0, 5);
    for (const jsFile of filesToCheck) {
      const src = jsFile.replace(/^src=["']/, '');
      let fullUrl = src;
      if (src.startsWith('/')) fullUrl = `https://${domain}${src}`;
      else if (src.startsWith('//')) fullUrl = `https:${src}`;
      else if (!src.startsWith('http')) fullUrl = `https://${domain}/${src}`;

      try {
        const jsResponse = await fetch(fullUrl, {
          headers: { 'User-Agent': 'TestMe-Security-Scanner/1.0' },
          signal: AbortSignal.timeout(6000),
        });

        // Check header
        const smHeader = jsResponse.headers.get('sourcemap') || jsResponse.headers.get('x-sourcemap');
        if (smHeader) {
          sourceMapFound = true;
          break;
        }

        const jsContent = await jsResponse.text();
        if (jsContent.includes('//# sourceMappingURL=')) {
          sourceMapFound = true;

          // Try to access the source map
          const smMatch = jsContent.match(/\/\/# sourceMappingURL=(\S+)/);
          if (smMatch) {
            let smUrl = smMatch[1];
            if (!smUrl.startsWith('http')) {
              const base = fullUrl.substring(0, fullUrl.lastIndexOf('/') + 1);
              smUrl = base + smUrl;
            }

            try {
              const smResponse = await fetch(smUrl, {
                signal: AbortSignal.timeout(5000),
              });
              if (smResponse.ok) {
                findings.push({
                  category: 'secrets',
                  severity: 'high',
                  title: 'Source Maps öffentlich zugänglich',
                  description: `JavaScript Source Maps sind öffentlich erreichbar (${smUrl}). Source Maps enthalten den originalen, unminifizierten Quellcode und können Geschäftslogik, API-Schlüssel und interne Kommentare preisgeben.`,
                  affected_url: smUrl,
                  recommendation: 'Entferne Source Maps aus der Produktion oder beschränke den Zugriff. Konfiguriere den Build-Prozess so, dass Source Maps nur intern verfügbar sind.',
                  details: { sourceMapUrl: smUrl, jsFile: fullUrl },
                });
                return;
              }
            } catch {
              // Source map URL not accessible
            }
          }
          break;
        }
      } catch {
        continue;
      }
    }

    if (sourceMapFound) {
      findings.push({
        category: 'secrets',
        severity: 'medium',
        title: 'Source Map Referenzen in JavaScript-Dateien',
        description: 'JavaScript-Dateien enthalten Source Map Referenzen (sourceMappingURL). Falls die Source Maps zugänglich sind, können Angreifer den originalen Quellcode einsehen.',
        affected_url: `https://${domain}`,
        recommendation: 'Entferne sourceMappingURL Kommentare und Source Maps Header aus Produktions-Builds.',
        details: null,
      });
    }
  } catch {
    // Ignore
  }
}

// ── robots.txt & sitemap analysis ───────────────────────────────────────
async function checkRobotsAndSitemap(domain: string, findings: FindingInput[]) {
  try {
    const response = await fetchWithRetry(`https://${domain}/robots.txt`, {
      headers: { 'User-Agent': 'TestMe-Security-Scanner/1.0' },
      signal: AbortSignal.timeout(8000),
    });

    if (response.ok) {
      const content = await response.text();

      // Check for sensitive paths in Disallow
      const disallowedPaths = content.match(/Disallow:\s*(.+)/gi) || [];
      const sensitivePaths = disallowedPaths
        .map((d) => d.replace(/^Disallow:\s*/i, '').trim())
        .filter((p) => /admin|login|api|dashboard|internal|private|secret|backup|config|debug|test|staging|\.env|\.git|wp-admin|phpmyadmin/i.test(p));

      if (sensitivePaths.length > 0) {
        findings.push({
          category: 'info',
          severity: 'low',
          title: `robots.txt enthält ${sensitivePaths.length} sensible Pfad(e)`,
          description: `Die robots.txt-Datei listet sensible Pfade auf, die von Suchmaschinen nicht indexiert werden sollen: ${sensitivePaths.slice(0, 10).join(', ')}. Angreifer können diese als Angriffsziele nutzen.`,
          affected_url: `https://${domain}/robots.txt`,
          recommendation: 'Sensible Pfade sollten per Zugriffskontrolle geschützt werden, nicht nur über robots.txt. Reduziere die in robots.txt aufgeführten sensiblen Pfade.',
          details: { sensitivePaths },
        });
      }

      // Check for Allow: * (everything accessible)
      if (/Allow:\s*\//i.test(content) && disallowedPaths.length === 0) {
        findings.push({
          category: 'info',
          severity: 'info',
          title: 'robots.txt erlaubt alle Crawler',
          description: 'Die robots.txt erlaubt allen Suchmaschinen-Crawlern vollen Zugriff ohne Einschränkungen.',
          affected_url: `https://${domain}/robots.txt`,
          recommendation: 'Prüfe, ob sensible Bereiche in robots.txt ausgeschlossen werden sollten.',
          details: null,
        });
      }
    } else {
      findings.push({
        category: 'info',
        severity: 'info',
        title: 'Keine robots.txt vorhanden',
        description: 'Die Website hat keine robots.txt-Datei. Es fehlen Anweisungen für Suchmaschinen-Crawler.',
        affected_url: `https://${domain}/robots.txt`,
        recommendation: 'Erstelle eine robots.txt mit sinnvollen Einschränkungen für sensible Bereiche.',
        details: null,
      });
    }
  } catch {
    // Ignore
  }
}

// ── Main Server Info Leak Check ─────────────────────────────────────────
export async function checkServerInfoLeak(domain: string): Promise<FindingInput[]> {
  const findings: FindingInput[] = [];
  const baseUrl = `https://${domain}`;

  await Promise.all([
    checkServerTimingLeak(baseUrl, findings),
    checkVersionDisclosure(baseUrl, findings),
    checkErrorPageDisclosure(domain, findings),
    checkSourceMaps(domain, findings),
    checkRobotsAndSitemap(domain, findings),
  ]);

  return findings;
}
