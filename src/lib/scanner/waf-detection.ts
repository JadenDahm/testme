import type { ScanFinding } from '@/types';
import { fetchWithRetry } from './utils';

type FindingInput = Omit<ScanFinding, 'id' | 'scan_id' | 'created_at'>;

interface WafSignature {
  name: string;
  headers?: { key: string; pattern: RegExp }[];
  bodyPatterns?: RegExp[];
  statusBehavior?: 'block-403' | 'block-406' | 'block-429';
  cookiePattern?: RegExp;
  serverPattern?: RegExp;
}

const WAF_SIGNATURES: WafSignature[] = [
  {
    name: 'Cloudflare',
    headers: [
      { key: 'cf-ray', pattern: /.+/ },
      { key: 'cf-cache-status', pattern: /.+/ },
    ],
    serverPattern: /cloudflare/i,
    cookiePattern: /__cfduid|__cf_bm|cf_clearance/i,
  },
  {
    name: 'AWS WAF / CloudFront',
    headers: [
      { key: 'x-amz-cf-id', pattern: /.+/ },
      { key: 'x-amz-cf-pop', pattern: /.+/ },
      { key: 'x-amzn-waf-action', pattern: /.+/ },
    ],
    serverPattern: /amazons3|cloudfront/i,
  },
  {
    name: 'Akamai',
    headers: [
      { key: 'x-akamai-transformed', pattern: /.+/ },
      { key: 'akamai-grn', pattern: /.+/ },
    ],
    serverPattern: /akamaighost|akamaighostdns/i,
  },
  {
    name: 'Imperva Incapsula',
    headers: [
      { key: 'x-iinfo', pattern: /.+/ },
      { key: 'x-cdn', pattern: /incapsula/i },
    ],
    cookiePattern: /incap_ses_|visid_incap_/i,
  },
  {
    name: 'Sucuri',
    headers: [
      { key: 'x-sucuri-id', pattern: /.+/ },
      { key: 'x-sucuri-cache', pattern: /.+/ },
    ],
    serverPattern: /sucuri/i,
  },
  {
    name: 'F5 BIG-IP ASM',
    headers: [
      { key: 'x-wa-info', pattern: /.+/ },
    ],
    serverPattern: /big-?ip/i,
    cookiePattern: /BIGipServer|TS[a-f0-9]+/i,
  },
  {
    name: 'ModSecurity',
    headers: [
      { key: 'x-modsecurity-error', pattern: /.+/ },
    ],
    serverPattern: /modsecurity/i,
  },
  {
    name: 'Barracuda',
    headers: [
      { key: 'barra_counter_session', pattern: /.+/ },
    ],
    cookiePattern: /barra_counter_session/i,
  },
  {
    name: 'Fastly',
    headers: [
      { key: 'x-fastly-request-id', pattern: /.+/ },
      { key: 'fastly-io-info', pattern: /.+/ },
    ],
    serverPattern: /fastly/i,
  },
  {
    name: 'Azure Front Door / Application Gateway',
    headers: [
      { key: 'x-azure-ref', pattern: /.+/ },
      { key: 'x-ms-ref', pattern: /.+/ },
    ],
  },
  {
    name: 'Google Cloud Armor',
    headers: [
      { key: 'x-goog-iap-generated-response', pattern: /.+/ },
    ],
    serverPattern: /google frontend|gws/i,
  },
  {
    name: 'Vercel',
    headers: [
      { key: 'x-vercel-id', pattern: /.+/ },
    ],
    serverPattern: /vercel/i,
  },
  {
    name: 'DDoS-Guard',
    headers: [
      { key: 'x-ddos-protection', pattern: /.+/ },
    ],
    serverPattern: /ddos-guard/i,
  },
  {
    name: 'StackPath / MaxCDN',
    headers: [
      { key: 'x-sp-waf', pattern: /.+/ },
    ],
    serverPattern: /stackpath|netdna/i,
  },
  {
    name: 'Fortinet FortiWeb',
    headers: [
      { key: 'fortiwafsid', pattern: /.+/ },
    ],
    cookiePattern: /FORTIWAFSID/i,
  },
  {
    name: 'Citrix NetScaler / ADC',
    headers: [
      { key: 'cneonction', pattern: /.+/ },
      { key: 'ns-cache-status', pattern: /.+/ },
    ],
    cookiePattern: /citrix_ns_id|NSC_/i,
  },
];

// ── WAF Probing ─────────────────────────────────────────────────────────
async function probeWaf(url: string): Promise<{ detected: boolean; wafName?: string; confidence: number; evidence: string[] }> {
  const evidence: string[] = [];
  const wafScores = new Map<string, number>();

  try {
    // Normal request to gather headers
    const normalResponse = await fetchWithRetry(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'TestMe-Security-Scanner/1.0',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(10000),
      redirect: 'follow',
    });

    const headers = normalResponse.headers;
    const serverHeader = headers.get('server') || '';
    const cookies = headers.get('set-cookie') || '';

    // Check each WAF signature
    for (const sig of WAF_SIGNATURES) {
      let score = 0;

      // Check specific headers
      if (sig.headers) {
        for (const { key, pattern } of sig.headers) {
          const val = headers.get(key);
          if (val && pattern.test(val)) {
            score += 40;
            evidence.push(`Header "${key}: ${val.substring(0, 50)}" → ${sig.name}`);
          }
        }
      }

      // Check Server header
      if (sig.serverPattern && sig.serverPattern.test(serverHeader)) {
        score += 60;
        evidence.push(`Server: "${serverHeader}" → ${sig.name}`);
      }

      // Check cookies
      if (sig.cookiePattern && sig.cookiePattern.test(cookies)) {
        score += 30;
        evidence.push(`Cookie pattern → ${sig.name}`);
      }

      if (score > 0) {
        wafScores.set(sig.name, (wafScores.get(sig.name) || 0) + score);
      }
    }

    // Malicious payload probe (detect blocking behavior)
    const probeUrls = [
      `${url}/?test=<script>alert(1)</script>`,
      `${url}/?id=1'+OR+1=1--`,
      `${url}/../../etc/passwd`,
    ];

    let blockedCount = 0;
    for (const probeUrl of probeUrls) {
      try {
        const probeResponse = await fetch(probeUrl, {
          method: 'GET',
          signal: AbortSignal.timeout(6000),
          redirect: 'follow',
          headers: { 'User-Agent': 'TestMe-Security-Scanner/1.0' },
        });
        if ([403, 406, 429, 444, 503].includes(probeResponse.status)) {
          blockedCount++;
        }
        const probeBody = await probeResponse.text();
        if (probeBody.includes('Access Denied') || probeBody.includes('blocked') ||
            probeBody.includes('Forbidden') || probeBody.includes('Request blocked') ||
            probeBody.includes('security policy') || probeBody.includes('WAF')) {
          blockedCount++;
        }
      } catch {
        // Connection refused or timeout could indicate blocking
        blockedCount++;
      }
    }

    if (blockedCount >= 2) {
      evidence.push(`${blockedCount} von ${probeUrls.length} bösartigen Anfragen blockiert`);
      // Boost all existing WAF scores or add generic detection
      if (wafScores.size === 0) {
        wafScores.set('Unbekannter WAF/IDS', 50);
      } else {
        for (const [name, score] of wafScores) {
          wafScores.set(name, score + 20);
        }
      }
    }

  } catch {
    // Failed to probe
    return { detected: false, confidence: 0, evidence: [] };
  }

  // Determine best match
  let bestWaf = '';
  let bestScore = 0;
  for (const [name, score] of wafScores) {
    if (score > bestScore) {
      bestWaf = name;
      bestScore = score;
    }
  }

  const confidence = Math.min(bestScore, 100);
  return {
    detected: bestScore >= 30,
    wafName: bestWaf || undefined,
    confidence,
    evidence,
  };
}

// ── Main WAF Detection ──────────────────────────────────────────────────
export async function detectWaf(domain: string): Promise<FindingInput[]> {
  const findings: FindingInput[] = [];

  const result = await probeWaf(`https://${domain}`);

  if (result.detected && result.wafName) {
    findings.push({
      category: 'info',
      severity: 'info',
      title: `WAF/CDN erkannt: ${result.wafName}`,
      description: `Ein Web Application Firewall oder CDN-Schutzmechanismus wurde erkannt: ${result.wafName} (Konfidenz: ${result.confidence}%). Evidenz: ${result.evidence.join('; ')}`,
      affected_url: `https://${domain}`,
      recommendation: 'WAF-Einsatz ist eine Best Practice. Stelle sicher, dass die WAF-Regeln aktuell sind und kritische Schwachstellen (OWASP Top 10) abdecken.',
      details: {
        waf: result.wafName,
        confidence: result.confidence,
        evidence: result.evidence,
      },
    });
  } else {
    findings.push({
      category: 'vulnerability',
      severity: 'medium',
      title: 'Kein WAF/CDN-Schutz erkannt',
      description: 'Es wurde kein Web Application Firewall (WAF) oder CDN-basierter Schutz erkannt. Ohne WAF ist die Anwendung direkt Angriffen wie SQL Injection, XSS und DDoS ausgesetzt.',
      affected_url: `https://${domain}`,
      recommendation: 'Implementiere einen WAF (z.B. Cloudflare, AWS WAF, Akamai, Imperva). Ein WAF bietet eine zusätzliche Schutzebene gegen OWASP Top 10 Angriffe.',
      details: {
        checked: WAF_SIGNATURES.map((s) => s.name),
        evidence: result.evidence,
      },
    });
  }

  return findings;
}
