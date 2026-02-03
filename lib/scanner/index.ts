import axios from 'axios';
import * as cheerio from 'cheerio';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Severity } from '@/lib/types';

interface ScanContext {
  baseUrl: string;
  visitedUrls: Set<string>;
  vulnerabilities: Array<{
    type: string;
    severity: Severity;
    title: string;
    description: string;
    affected_url?: string;
    recommendation: string;
  }>;
}

export async function runSecurityScan(
  scanId: string,
  domain: string,
  supabase: SupabaseClient
) {
  const SCAN_TIMEOUT = 25000; // 25 Sekunden Gesamt-Timeout
  
  const scanPromise = (async () => {
    // Versuche zuerst HTTPS, dann HTTP
    let baseUrl = `https://${domain}`;
    let isHttps = true;
    
    try {
      await axios.get(baseUrl, { timeout: 2000, validateStatus: () => true });
    } catch {
      baseUrl = `http://${domain}`;
      isHttps = false;
    }
    
    const context: ScanContext = {
      baseUrl,
      visitedUrls: new Set(),
      vulnerabilities: [],
    };
    
    // Warnung wenn HTTP verwendet wird
    if (!isHttps) {
      context.vulnerabilities.push({
        type: 'insecure_protocol',
        severity: 'high',
        title: 'HTTP statt HTTPS verwendet',
        description: 'Die Website verwendet HTTP anstelle von HTTPS, was zu unsicheren Verbindungen führt.',
        affected_url: baseUrl,
        recommendation: 'Implementieren Sie HTTPS mit einem gültigen SSL/TLS-Zertifikat.',
      });
    }

    // 1. Teste Erreichbarkeit
    await testReachability(context, supabase, scanId);

    // 2. Analysiere HTTP-Security-Headers
    await analyzeSecurityHeaders(context, supabase, scanId);

    // 3. Crawle Website
    await crawlWebsite(context, supabase, scanId);

    // 4. Suche nach sensiblen Daten
    await searchForSecrets(context, supabase, scanId);

    // 5. Teste auf typische Schwachstellen
    await testCommonVulnerabilities(context, supabase, scanId);

    // 6. Prüfe auf öffentliche sensible Dateien
    await checkSensitiveFiles(context, supabase, scanId);

    // Speichere alle Vulnerabilities
    if (context.vulnerabilities.length > 0) {
      await supabase.from('vulnerabilities').insert(
        context.vulnerabilities.map((v) => ({
          scan_id: scanId,
          ...v,
        }))
      );
    }

    // Markiere Scan als abgeschlossen
    await supabase
      .from('scans')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', scanId);
  })();

  // Race zwischen Scan und Timeout
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Scan-Timeout überschritten')), SCAN_TIMEOUT)
  );

  try {
    await Promise.race([scanPromise, timeoutPromise]);
  } catch (error: any) {
    console.error('Scan error:', error);
    await supabase
      .from('scans')
      .update({
        status: 'failed',
        error_message: error.message || 'Unbekannter Fehler',
        completed_at: new Date().toISOString(),
      })
      .eq('id', scanId);
  }
}

async function testReachability(
  context: ScanContext,
  supabase: SupabaseClient,
  scanId: string
) {
  try {
    const response = await axios.get(context.baseUrl, {
      timeout: 3000,
      maxRedirects: 3,
      validateStatus: () => true,
    });

    if (response.status >= 400) {
      context.vulnerabilities.push({
        type: 'reachability',
        severity: 'high',
        title: 'Website nicht erreichbar',
        description: `Die Website antwortet mit HTTP ${response.status}`,
        affected_url: context.baseUrl,
        recommendation: 'Überprüfen Sie die Server-Konfiguration und stellen Sie sicher, dass die Website erreichbar ist.',
      });
    }
  } catch (error: any) {
    context.vulnerabilities.push({
      type: 'reachability',
      severity: 'critical',
      title: 'Website nicht erreichbar',
      description: `Fehler beim Zugriff: ${error.message}`,
      affected_url: context.baseUrl,
      recommendation: 'Überprüfen Sie die Domain-Konfiguration und Netzwerk-Verbindung.',
    });
  }
}

async function analyzeSecurityHeaders(
  context: ScanContext,
  supabase: SupabaseClient,
  scanId: string
) {
  try {
    const response = await axios.get(context.baseUrl, {
      timeout: 3000,
      maxRedirects: 3,
      validateStatus: () => true,
    });

    const headers = response.headers;
    const requiredHeaders = {
      'Strict-Transport-Security': {
        severity: 'high' as Severity,
        description: 'HSTS (HTTP Strict Transport Security) fehlt',
        recommendation: 'Fügen Sie den Header "Strict-Transport-Security: max-age=31536000; includeSubDomains" hinzu.',
      },
      'X-Content-Type-Options': {
        severity: 'medium' as Severity,
        description: 'X-Content-Type-Options Header fehlt',
        recommendation: 'Fügen Sie den Header "X-Content-Type-Options: nosniff" hinzu.',
      },
      'X-Frame-Options': {
        severity: 'medium' as Severity,
        description: 'X-Frame-Options Header fehlt',
        recommendation: 'Fügen Sie den Header "X-Frame-Options: DENY" oder "SAMEORIGIN" hinzu.',
      },
      'Content-Security-Policy': {
        severity: 'high' as Severity,
        description: 'Content-Security-Policy fehlt',
        recommendation: 'Implementieren Sie eine Content-Security-Policy, um XSS-Angriffe zu verhindern.',
      },
      'Referrer-Policy': {
        severity: 'low' as Severity,
        description: 'Referrer-Policy fehlt',
        recommendation: 'Fügen Sie den Header "Referrer-Policy: strict-origin-when-cross-origin" hinzu.',
      },
    };

    for (const [header, info] of Object.entries(requiredHeaders)) {
      if (!headers[header.toLowerCase()]) {
        context.vulnerabilities.push({
          type: 'missing_security_header',
          severity: info.severity,
          title: info.description,
          description: `Der Sicherheits-Header "${header}" ist nicht gesetzt.`,
          affected_url: context.baseUrl,
          recommendation: info.recommendation,
        });
      }
    }

    // Prüfe HSTS max-age
    const hsts = headers['strict-transport-security'];
    if (hsts && !hsts.includes('max-age=')) {
      context.vulnerabilities.push({
        type: 'insecure_hsts',
        severity: 'medium',
        title: 'HSTS Header ohne max-age',
        description: 'Der HSTS-Header enthält keine max-age-Direktive.',
        affected_url: context.baseUrl,
        recommendation: 'Fügen Sie "max-age=31536000" zum HSTS-Header hinzu.',
      });
    }
  } catch (error) {
    // Fehler wird bereits in testReachability behandelt
  }
}

async function crawlWebsite(
  context: ScanContext,
  supabase: SupabaseClient,
  scanId: string
) {
  const urlsToVisit = [context.baseUrl];
  const maxPages = 3; // Limit für schnelle Scans

  while (urlsToVisit.length > 0 && context.visitedUrls.size < maxPages) {
    const url = urlsToVisit.shift();
    if (!url || context.visitedUrls.has(url)) continue;

    try {
      context.visitedUrls.add(url);
      const response = await axios.get(url, {
        timeout: 2000,
        maxRedirects: 2,
        validateStatus: (status) => status < 400,
      });

      const $ = cheerio.load(response.data);

      // Finde Links
      $('a[href]').each((_, element) => {
        const href = $(element).attr('href');
        if (!href) return;

        try {
          const absoluteUrl = new URL(href, url).href;
          if (
            absoluteUrl.startsWith(context.baseUrl) &&
            !context.visitedUrls.has(absoluteUrl) &&
            urlsToVisit.length < maxPages
          ) {
            urlsToVisit.push(absoluteUrl);
          }
        } catch {
          // Ungültige URL, ignorieren
        }
      });
    } catch (error) {
      // Seite konnte nicht geladen werden, weiter
    }
  }
}

async function searchForSecrets(
  context: ScanContext,
  supabase: SupabaseClient,
  scanId: string
) {
  const secretPatterns = [
    {
      pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*["']?([a-zA-Z0-9_\-]{20,})["']?/gi,
      type: 'api_key_exposure',
      severity: 'critical' as Severity,
      title: 'API-Key im Code gefunden',
      description: 'Ein API-Key wurde im Quellcode oder in JavaScript-Dateien gefunden.',
      recommendation: 'Entfernen Sie alle API-Keys aus dem Client-Code. Verwenden Sie Backend-Proxies für API-Aufrufe.',
    },
    {
      pattern: /(?:password|pwd|passwd)\s*[:=]\s*["']?([^"'\s]{8,})["']?/gi,
      type: 'password_exposure',
      severity: 'critical' as Severity,
      title: 'Passwort im Code gefunden',
      description: 'Ein Passwort wurde im Quellcode gefunden.',
      recommendation: 'Entfernen Sie alle Passwörter aus dem Code. Verwenden Sie Umgebungsvariablen oder sichere Secrets-Management.',
    },
    {
      pattern: /(?:secret|token|access[_-]?token)\s*[:=]\s*["']?([a-zA-Z0-9_\-]{20,})["']?/gi,
      type: 'token_exposure',
      severity: 'high' as Severity,
      title: 'Token oder Secret im Code gefunden',
      description: 'Ein Token oder Secret wurde im Quellcode gefunden.',
      recommendation: 'Entfernen Sie alle Tokens und Secrets aus dem Client-Code.',
    },
  ];

  for (const url of context.visitedUrls) {
    try {
      const response = await axios.get(url, {
        timeout: 2000,
        validateStatus: (status) => status < 400,
      });

      const content = response.data.toString();

      for (const { pattern, type, severity, title, description, recommendation } of secretPatterns) {
        if (pattern.test(content)) {
          context.vulnerabilities.push({
            type,
            severity,
            title,
            description,
            affected_url: url,
            recommendation,
          });
          break; // Nur einmal pro Seite melden
        }
      }
    } catch {
      // Seite konnte nicht geladen werden
    }
  }
}

async function testCommonVulnerabilities(
  context: ScanContext,
  supabase: SupabaseClient,
  scanId: string
) {
  // Teste auf SQL Injection (nicht-destruktiv)
  const testUrls = Array.from(context.visitedUrls).slice(0, 1); // Limit für schnelle Scans

  for (const url of testUrls) {
    try {
      // Teste auf SQL Injection in Query-Parametern
      const testParams = ["' OR '1'='1", "1' UNION SELECT NULL--", "'; DROP TABLE--"];
      
      for (const param of testParams) {
        try {
          const testUrl = new URL(url);
          testUrl.searchParams.set('id', param);
          
          const response = await axios.get(testUrl.toString(), {
            timeout: 2000,
            validateStatus: () => true,
          });

          // Prüfe auf SQL-Fehlermeldungen
          const errorIndicators = [
            'sql syntax',
            'mysql error',
            'postgresql error',
            'sqlite error',
            'ora-',
            'sqlstate',
          ];

          const body = response.data.toString().toLowerCase();
          if (errorIndicators.some((indicator) => body.includes(indicator))) {
            context.vulnerabilities.push({
              type: 'sql_injection',
              severity: 'critical',
              title: 'Mögliche SQL-Injection-Schwachstelle',
              description: 'Die Anwendung zeigt SQL-Fehlermeldungen an, was auf eine mögliche SQL-Injection-Schwachstelle hindeutet.',
              affected_url: url,
              recommendation: 'Verwenden Sie Prepared Statements oder Parameterized Queries. Validieren und sanitizen Sie alle Benutzereingaben.',
            });
            break;
          }
        } catch {
          // Test fehlgeschlagen, weiter
        }
      }

      // Teste auf XSS (nicht-destruktiv)
      try {
        const testUrl = new URL(url);
        testUrl.searchParams.set('test', '<script>alert("xss")</script>');
        
        const response = await axios.get(testUrl.toString(), {
          timeout: 2000,
          validateStatus: () => true,
        });

        const body = response.data.toString();
        if (body.includes('<script>alert("xss")</script>') && !body.includes('&lt;script&gt;')) {
          context.vulnerabilities.push({
            type: 'xss',
            severity: 'high',
            title: 'Mögliche XSS-Schwachstelle',
            description: 'Benutzereingaben werden ohne Escaping ausgegeben, was zu XSS-Angriffen führen kann.',
            affected_url: url,
            recommendation: 'Escapen Sie alle Benutzereingaben vor der Ausgabe. Verwenden Sie Content-Security-Policy.',
          });
        }
      } catch {
        // Test fehlgeschlagen
      }
    } catch {
      // URL konnte nicht getestet werden
    }
  }
}

async function checkSensitiveFiles(
  context: ScanContext,
  supabase: SupabaseClient,
  scanId: string
) {
  const sensitiveFiles = [
    '/.env',
    '/.git/config',
    '/.git/HEAD',
    '/wp-config.php',
    '/config.php',
    '/.htaccess',
    '/web.config',
    '/package.json',
    '/composer.json',
    '/.DS_Store',
    '/.svn/entries',
    '/.idea/workspace.xml',
  ];

  // Teste nur die wichtigsten Dateien für schnelle Scans
  const priorityFiles = sensitiveFiles.slice(0, 5);
  for (const file of priorityFiles) {
    try {
      const url = `${context.baseUrl}${file}`;
      const response = await axios.get(url, {
        timeout: 1500,
        validateStatus: (status) => status === 200,
      });

      context.vulnerabilities.push({
        type: 'sensitive_file_exposure',
        severity: 'high',
        title: `Sensible Datei öffentlich zugänglich: ${file}`,
        description: `Die Datei ${file} ist öffentlich über das Internet zugänglich.`,
        affected_url: url,
        recommendation: `Entfernen Sie ${file} aus dem öffentlichen Verzeichnis oder schützen Sie den Zugriff mit .htaccess oder Server-Konfiguration.`,
      });
    } catch {
      // Datei nicht gefunden oder nicht zugänglich - das ist gut
    }
  }
}
