import type { ScanFinding } from '@/types';
import { fetchWithRetry } from './utils';

type FindingInput = Omit<ScanFinding, 'id' | 'scan_id' | 'created_at'>;

interface LibrarySignature {
  name: string;
  patterns: RegExp[];
  versionPattern?: RegExp;
  knownVulnerableVersions?: { version: RegExp; cve: string; severity: 'low' | 'medium' | 'high' | 'critical'; description: string }[];
}

const LIBRARY_SIGNATURES: LibrarySignature[] = [
  {
    name: 'jQuery',
    patterns: [/jquery[.\-/](\d+\.\d+\.\d+)/i, /jquery\.min\.js/i, /jquery\.js/i],
    versionPattern: /jquery[.\-/](\d+\.\d+\.\d+)/i,
    knownVulnerableVersions: [
      { version: /^1\./,      cve: 'CVE-2020-11022/11023', severity: 'medium',   description: 'XSS in jQuery.htmlPrefilter (< 3.5.0)' },
      { version: /^2\./,      cve: 'CVE-2020-11022/11023', severity: 'medium',   description: 'XSS in jQuery.htmlPrefilter (< 3.5.0)' },
      { version: /^3\.[0-4]/, cve: 'CVE-2020-11022',       severity: 'medium',   description: 'XSS via HTML in jQuery < 3.5.0' },
    ],
  },
  {
    name: 'Bootstrap',
    patterns: [/bootstrap[.\-/](\d+\.\d+\.\d+)/i, /bootstrap\.min\.js/i, /bootstrap\.min\.css/i],
    versionPattern: /bootstrap[.\-/](\d+\.\d+\.\d+)/i,
    knownVulnerableVersions: [
      { version: /^3\.[0-3]/, cve: 'CVE-2019-8331', severity: 'medium', description: 'XSS in Bootstrap tooltip/popover (< 3.4.1)' },
      { version: /^4\.[0-2]/, cve: 'CVE-2019-8331', severity: 'medium', description: 'XSS in Bootstrap tooltip/popover (< 4.3.1)' },
    ],
  },
  {
    name: 'AngularJS',
    patterns: [/angular[.\-/](\d+\.\d+\.\d+)/i, /angular\.min\.js/i, /angular\.js/i],
    versionPattern: /angular[.\-/](\d+\.\d+\.\d+)/i,
    knownVulnerableVersions: [
      { version: /^1\.[0-5]/, cve: 'Multiple CVEs', severity: 'high', description: 'AngularJS < 1.6 hat bekannte Sandbox-Bypass XSS-Schwachstellen' },
      { version: /^1\./, cve: 'EOL', severity: 'high', description: 'AngularJS (v1.x) ist End-of-Life seit Dezember 2021 und erhält keine Sicherheitsupdates mehr' },
    ],
  },
  {
    name: 'React',
    patterns: [/react[.\-/](\d+\.\d+\.\d+)/i, /react\.production\.min\.js/i, /react-dom\.production/i],
    versionPattern: /react[.\-/](\d+\.\d+\.\d+)/i,
    knownVulnerableVersions: [
      { version: /^0\.|^15\./, cve: 'EOL-Risk', severity: 'low', description: 'Veraltete React-Version ohne aktuelle Sicherheitsupdates' },
    ],
  },
  {
    name: 'Vue.js',
    patterns: [/vue[.\-/](\d+\.\d+\.\d+)/i, /vue\.min\.js/i, /vue\.global/i],
    versionPattern: /vue[.\-/](\d+\.\d+\.\d+)/i,
    knownVulnerableVersions: [
      { version: /^2\.[0-5]/, cve: 'CVE-2024-6783', severity: 'medium', description: 'XSS via Template Compilation in Vue.js < 2.7' },
    ],
  },
  {
    name: 'Lodash',
    patterns: [/lodash[.\-/](\d+\.\d+\.\d+)/i, /lodash\.min\.js/i, /lodash\.js/i],
    versionPattern: /lodash[.\-/](\d+\.\d+\.\d+)/i,
    knownVulnerableVersions: [
      { version: /^4\.[0-9]\.|^4\.1[0-6]\./, cve: 'CVE-2021-23337', severity: 'high', description: 'Prototype Pollution in Lodash < 4.17.21' },
    ],
  },
  {
    name: 'Moment.js',
    patterns: [/moment[.\-/](\d+\.\d+\.\d+)/i, /moment\.min\.js/i, /moment\.js/i],
    versionPattern: /moment[.\-/](\d+\.\d+\.\d+)/i,
    knownVulnerableVersions: [
      { version: /.*/, cve: 'EOL', severity: 'low', description: 'Moment.js ist in Maintenance Mode und wird nicht mehr aktiv weiterentwickelt. Nutze Alternativen wie date-fns oder Luxon.' },
    ],
  },
  {
    name: 'Handlebars',
    patterns: [/handlebars[.\-/](\d+\.\d+\.\d+)/i, /handlebars\.min\.js/i],
    versionPattern: /handlebars[.\-/](\d+\.\d+\.\d+)/i,
    knownVulnerableVersions: [
      { version: /^4\.[0-6]\./, cve: 'CVE-2021-23369', severity: 'critical', description: 'Remote Code Execution in Handlebars < 4.7.7' },
    ],
  },
  {
    name: 'Underscore.js',
    patterns: [/underscore[.\-/](\d+\.\d+\.\d+)/i, /underscore\.min\.js/i],
    versionPattern: /underscore[.\-/](\d+\.\d+\.\d+)/i,
    knownVulnerableVersions: [
      { version: /^1\.[0-9]\.|^1\.1[0-2]\./, cve: 'CVE-2021-23358', severity: 'high', description: 'Arbitrary Code Execution in Underscore.js < 1.13.1' },
    ],
  },
  {
    name: 'D3.js',
    patterns: [/d3[.\-/](\d+\.\d+\.\d+)/i, /d3\.min\.js/i],
    versionPattern: /d3[.\-/](\d+\.\d+\.\d+)/i,
  },
  {
    name: 'Prototype.js',
    patterns: [/prototype[.\-/](\d+\.\d+\.\d+)/i, /prototype\.js/i],
    versionPattern: /prototype[.\-/](\d+\.\d+\.\d+)/i,
    knownVulnerableVersions: [
      { version: /.*/, cve: 'EOL', severity: 'medium', description: 'Prototype.js ist komplett veraltet und wird nicht mehr maintained.' },
    ],
  },
  {
    name: 'Dojo',
    patterns: [/dojo[.\-/](\d+\.\d+\.\d+)/i, /dojo\.js/i],
    versionPattern: /dojo[.\-/](\d+\.\d+\.\d+)/i,
  },
  {
    name: 'YUI',
    patterns: [/yui[.\-/](\d+\.\d+\.\d+)/i, /yui\.js/i],
    versionPattern: /yui[.\-/](\d+\.\d+\.\d+)/i,
    knownVulnerableVersions: [
      { version: /.*/, cve: 'EOL', severity: 'high', description: 'YUI ist seit 2014 End-of-Life und erhält keine Sicherheitsupdates mehr.' },
    ],
  },
];

// ── Extract JS URLs from HTML ───────────────────────────────────────────
function extractScriptUrls(html: string, baseUrl: string): string[] {
  const urls: string[] = [];
  const srcRegex = /<script[^>]+src=["']([^"']+)["']/gi;
  let match;

  while ((match = srcRegex.exec(html)) !== null) {
    let src = match[1];
    if (src.startsWith('//')) {
      src = 'https:' + src;
    } else if (src.startsWith('/')) {
      src = baseUrl + src;
    } else if (!src.startsWith('http')) {
      src = baseUrl + '/' + src;
    }
    urls.push(src);
  }

  return urls;
}

// ── Detect libraries from HTML content and script sources ───────────────
function detectLibrariesFromContent(content: string): { name: string; version?: string; vulnerable: boolean; vulnDetails?: { cve: string; severity: string; description: string }[] }[] {
  const detected: Map<string, { version?: string; vulnerable: boolean; vulnDetails: { cve: string; severity: string; description: string }[] }> = new Map();

  for (const lib of LIBRARY_SIGNATURES) {
    for (const pattern of lib.patterns) {
      if (pattern.test(content)) {
        // Extract version
        let version: string | undefined;
        if (lib.versionPattern) {
          const vMatch = content.match(lib.versionPattern);
          if (vMatch) {
            version = vMatch[1];
          }
        }

        // Check for known vulnerabilities
        const vulnDetails: { cve: string; severity: string; description: string }[] = [];
        if (version && lib.knownVulnerableVersions) {
          for (const vuln of lib.knownVulnerableVersions) {
            if (vuln.version.test(version)) {
              vulnDetails.push({
                cve: vuln.cve,
                severity: vuln.severity,
                description: vuln.description,
              });
            }
          }
        }

        const existing = detected.get(lib.name);
        if (!existing || (version && !existing.version)) {
          detected.set(lib.name, {
            version,
            vulnerable: vulnDetails.length > 0,
            vulnDetails,
          });
        }
        break;
      }
    }
  }

  return [...detected.entries()].map(([name, info]) => ({
    name,
    ...info,
  }));
}

// ── Main JS Library Check ───────────────────────────────────────────────
export async function checkJsLibraries(domain: string): Promise<FindingInput[]> {
  const findings: FindingInput[] = [];
  const baseUrl = `https://${domain}`;

  try {
    // Fetch main page
    const response = await fetchWithRetry(baseUrl, {
      headers: { 'User-Agent': 'TestMe-Security-Scanner/1.0' },
      signal: AbortSignal.timeout(12000),
      redirect: 'follow',
    });

    const html = await response.text();
    let allContent = html;

    // Extract and fetch external script sources (up to 15)
    const scriptUrls = extractScriptUrls(html, baseUrl).slice(0, 15);
    const scriptFetches = scriptUrls.map(async (url) => {
      try {
        const resp = await fetchWithRetry(url, {
          headers: { 'User-Agent': 'TestMe-Security-Scanner/1.0' },
          signal: AbortSignal.timeout(8000),
        });
        if (resp.ok) {
          // Only read first 50KB to avoid memory issues
          const text = await resp.text();
          return text.substring(0, 50000);
        }
      } catch {
        // Ignore failures for individual scripts
      }
      return '';
    });

    const scripts = await Promise.all(scriptFetches);
    allContent += '\n' + scripts.join('\n');

    // Also check inline script content
    const inlineScripts = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];
    for (const script of inlineScripts) {
      allContent += '\n' + script;
    }

    // Detect libraries
    const libraries = detectLibrariesFromContent(allContent);

    if (libraries.length === 0) {
      findings.push({
        category: 'info',
        severity: 'info',
        title: 'Keine bekannten JavaScript-Bibliotheken erkannt',
        description: 'Auf der Hauptseite wurden keine bekannten JavaScript-Bibliotheken erkannt. Dies kann bedeuten, dass gebündelte/obfuskierte Libraries verwendet werden.',
        affected_url: baseUrl,
        recommendation: null,
        details: { scriptsChecked: scriptUrls.length },
      });
      return findings;
    }

    // Report detected libraries
    const vulnerableLibs = libraries.filter((l) => l.vulnerable);
    const safeLibs = libraries.filter((l) => !l.vulnerable);

    // Report vulnerabilities
    for (const lib of vulnerableLibs) {
      for (const vuln of lib.vulnDetails || []) {
        findings.push({
          category: 'vulnerability',
          severity: vuln.severity as 'low' | 'medium' | 'high' | 'critical',
          title: `Verwundbare JavaScript-Bibliothek: ${lib.name} ${lib.version || '(Version unbekannt)'}`,
          description: `${vuln.description}. ${vuln.cve !== 'EOL' && vuln.cve !== 'EOL-Risk' ? `CVE: ${vuln.cve}` : ''}`,
          affected_url: baseUrl,
          recommendation: `Aktualisiere ${lib.name} auf die neueste Version. ${vuln.cve === 'EOL' ? 'Diese Bibliothek ist End-of-Life – migriere zu einer aktiv gewarteten Alternative.' : ''}`,
          details: {
            library: lib.name,
            version: lib.version,
            cve: vuln.cve,
            vulnSeverity: vuln.severity,
          },
        });
      }
    }

    // Report all detected libraries as info
    findings.push({
      category: 'info',
      severity: 'info',
      title: `${libraries.length} JavaScript-Bibliothek(en) erkannt`,
      description: `Erkannt: ${libraries.map((l) => `${l.name}${l.version ? ' ' + l.version : ''}`).join(', ')}. Davon ${vulnerableLibs.length} mit bekannten Schwachstellen.`,
      affected_url: baseUrl,
      recommendation: vulnerableLibs.length > 0
        ? 'Aktualisiere alle verwundbaren Bibliotheken auf die neuesten Versionen.'
        : 'Halte alle Bibliotheken aktuell und überprüfe regelmäßig auf neue CVEs.',
      details: {
        libraries: libraries.map((l) => ({
          name: l.name,
          version: l.version,
          vulnerable: l.vulnerable,
        })),
        safeCount: safeLibs.length,
        vulnerableCount: vulnerableLibs.length,
      },
    });

  } catch {
    findings.push({
      category: 'info',
      severity: 'info',
      title: 'JavaScript-Bibliotheken konnten nicht geprüft werden',
      description: 'Die Hauptseite konnte nicht geladen werden, um JavaScript-Bibliotheken zu analysieren.',
      affected_url: baseUrl,
      recommendation: null,
      details: null,
    });
  }

  return findings;
}
