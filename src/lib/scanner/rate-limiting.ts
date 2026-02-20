import type { ScanFinding } from '@/types';

type FindingInput = Omit<ScanFinding, 'id' | 'scan_id' | 'created_at'>;

interface RateLimitResult {
  hasRateLimit: boolean;
  rateLimitHeader?: string;
  remaining?: string;
  resetTime?: string;
  retryAfter?: string;
  triggeredAt?: number;
}

// ── Check Rate Limiting Headers ─────────────────────────────────────────
async function checkRateLimitHeaders(url: string): Promise<RateLimitResult> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'User-Agent': 'TestMe-Security-Scanner/1.0' },
      signal: AbortSignal.timeout(8000),
      redirect: 'follow',
    });

    const headers = response.headers;

    // Common rate limit headers
    const rateLimitHeader =
      headers.get('x-ratelimit-limit') ||
      headers.get('x-rate-limit-limit') ||
      headers.get('ratelimit-limit') ||
      headers.get('x-ratelimit-remaining') ||
      headers.get('ratelimit') ||
      null;

    const remaining =
      headers.get('x-ratelimit-remaining') ||
      headers.get('x-rate-limit-remaining') ||
      headers.get('ratelimit-remaining') ||
      null;

    const resetTime =
      headers.get('x-ratelimit-reset') ||
      headers.get('x-rate-limit-reset') ||
      headers.get('ratelimit-reset') ||
      null;

    const retryAfter = headers.get('retry-after') || null;

    return {
      hasRateLimit: !!(rateLimitHeader || retryAfter),
      rateLimitHeader: rateLimitHeader || undefined,
      remaining: remaining || undefined,
      resetTime: resetTime || undefined,
      retryAfter: retryAfter || undefined,
    };
  } catch {
    return { hasRateLimit: false };
  }
}

// ── Rapid Request Test ──────────────────────────────────────────────────
async function testRapidRequests(url: string): Promise<RateLimitResult> {
  const results: number[] = [];

  // Send 20 rapid requests
  for (let i = 0; i < 20; i++) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'TestMe-Security-Scanner/1.0',
          'X-Request-Id': `testme-ratelimit-${i}`,
        },
        signal: AbortSignal.timeout(5000),
        redirect: 'follow',
      });

      results.push(response.status);

      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after') || undefined;
        return {
          hasRateLimit: true,
          triggeredAt: i + 1,
          retryAfter,
        };
      }

      // Very short delay
      await new Promise((r) => setTimeout(r, 50));
    } catch {
      // Network error might indicate blocking
      if (i > 5) {
        return {
          hasRateLimit: true,
          triggeredAt: i + 1,
        };
      }
    }
  }

  return {
    hasRateLimit: false,
    triggeredAt: undefined,
  };
}

// ── Check Login/Auth Endpoint Rate Limiting ─────────────────────────────
async function checkAuthRateLimit(domain: string): Promise<{
  loginEndpointFound: boolean;
  hasRateLimit: boolean;
  endpoint?: string;
}> {
  const commonAuthPaths = [
    '/login', '/api/login', '/auth/login', '/api/auth/login',
    '/signin', '/api/signin', '/auth/signin',
    '/api/auth/token', '/oauth/token', '/api/v1/auth/login',
    '/wp-login.php', '/user/login', '/admin/login',
  ];

  for (const path of commonAuthPaths) {
    const url = `https://${domain}${path}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'TestMe-Security-Scanner/1.0',
        },
        body: JSON.stringify({ username: 'test', password: 'test' }),
        signal: AbortSignal.timeout(5000),
        redirect: 'follow',
      });

      if (response.status !== 404 && response.status !== 405) {
        // Found a potential auth endpoint, try rapid requests
        let blocked = false;
        for (let i = 0; i < 10; i++) {
          try {
            const resp = await fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'TestMe-Security-Scanner/1.0',
              },
              body: JSON.stringify({ username: `test${i}`, password: `wrong${i}` }),
              signal: AbortSignal.timeout(5000),
            });
            if (resp.status === 429) {
              blocked = true;
              break;
            }
            await new Promise((r) => setTimeout(r, 100));
          } catch {
            blocked = true;
            break;
          }
        }

        return {
          loginEndpointFound: true,
          hasRateLimit: blocked,
          endpoint: path,
        };
      }
    } catch {
      continue;
    }
  }

  return { loginEndpointFound: false, hasRateLimit: false };
}

// ── Main Rate Limiting Check ────────────────────────────────────────────
export async function checkRateLimiting(domain: string): Promise<FindingInput[]> {
  const findings: FindingInput[] = [];
  const baseUrl = `https://${domain}`;

  // Check rate limit headers
  const headerCheck = await checkRateLimitHeaders(baseUrl);

  if (headerCheck.hasRateLimit) {
    findings.push({
      category: 'headers',
      severity: 'info',
      title: 'Rate-Limiting-Header vorhanden',
      description: `Der Server sendet Rate-Limiting-Header. ${headerCheck.rateLimitHeader ? `Limit: ${headerCheck.rateLimitHeader}` : ''} ${headerCheck.remaining ? `Verbleibend: ${headerCheck.remaining}` : ''} ${headerCheck.retryAfter ? `Retry-After: ${headerCheck.retryAfter}` : ''}`.trim(),
      affected_url: baseUrl,
      recommendation: 'Rate Limiting ist aktiv. Stelle sicher, dass es auch für API-Endpunkte und Login-Seiten konfiguriert ist.',
      details: {
        limit: headerCheck.rateLimitHeader,
        remaining: headerCheck.remaining,
        reset: headerCheck.resetTime,
        retryAfter: headerCheck.retryAfter,
      },
    });
  }

  // Rapid request test
  const rapidTest = await testRapidRequests(baseUrl);

  if (rapidTest.hasRateLimit && rapidTest.triggeredAt) {
    findings.push({
      category: 'headers',
      severity: 'info',
      title: `Rate Limiting aktiv (ausgelöst nach ${rapidTest.triggeredAt} Anfragen)`,
      description: `Der Server blockiert Anfragen nach ${rapidTest.triggeredAt} schnellen aufeinanderfolgenden Requests. Dies schützt vor Brute-Force- und DDoS-Angriffen.`,
      affected_url: baseUrl,
      recommendation: 'Rate Limiting ist korrekt konfiguriert. Prüfe, ob die Limits auch für API-Endpunkte gelten.',
      details: { triggeredAfter: rapidTest.triggeredAt, retryAfter: rapidTest.retryAfter },
    });
  } else if (!headerCheck.hasRateLimit) {
    findings.push({
      category: 'vulnerability',
      severity: 'medium',
      title: 'Kein Rate Limiting erkannt',
      description: 'Weder Rate-Limiting-Header noch tatsächliche Anfrage-Begrenzung wurden erkannt. Der Server akzeptierte 20 schnelle aufeinanderfolgende Anfragen ohne Einschränkung. Dies macht den Server anfällig für Brute-Force-Angriffe, DDoS und API-Missbrauch.',
      affected_url: baseUrl,
      recommendation: 'Implementiere Rate Limiting auf Server- oder WAF-Ebene. Empfohlene Header: RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset (IETF Draft). Nutze Tools wie nginx rate_limiting, express-rate-limit, oder WAF-basiertes Rate Limiting.',
      details: null,
    });
  }

  // Auth endpoint rate limiting check
  const authCheck = await checkAuthRateLimit(domain);

  if (authCheck.loginEndpointFound) {
    if (!authCheck.hasRateLimit) {
      findings.push({
        category: 'vulnerability',
        severity: 'high',
        title: `Kein Rate Limiting auf Authentifizierungs-Endpunkt (${authCheck.endpoint})`,
        description: `Der Login-Endpunkt ${authCheck.endpoint} hat kein Rate Limiting. Ein Angreifer kann unbegrenzt Login-Versuche durchführen (Brute-Force-Angriff auf Benutzerkonten).`,
        affected_url: `${baseUrl}${authCheck.endpoint}`,
        recommendation: 'Implementiere Rate Limiting für alle Authentifizierungs-Endpunkte. Empfehlung: Max 5 fehlgeschlagene Versuche pro Minute pro IP, danach temporäre Sperrung. Zusätzlich Account Lockout nach mehreren Fehlversuchen.',
        details: { endpoint: authCheck.endpoint },
      });
    } else {
      findings.push({
        category: 'headers',
        severity: 'info',
        title: `Rate Limiting auf Login-Endpunkt aktiv (${authCheck.endpoint})`,
        description: `Der Authentifizierungs-Endpunkt ${authCheck.endpoint} hat Rate Limiting implementiert und blockiert wiederholte Login-Versuche.`,
        affected_url: `${baseUrl}${authCheck.endpoint}`,
        recommendation: null,
        details: { endpoint: authCheck.endpoint },
      });
    }
  }

  return findings;
}
