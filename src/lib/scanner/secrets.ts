import type { ScanFinding } from '@/types';
import * as cheerio from 'cheerio';

type FindingInput = Omit<ScanFinding, 'id' | 'scan_id' | 'created_at'>;

interface SecretPattern {
  name: string;
  pattern: RegExp;
  severity: 'critical' | 'high' | 'medium';
  description: string;
  recommendation: string;
}

const SECRET_PATTERNS: SecretPattern[] = [
  {
    name: 'AWS Access Key',
    pattern: /AKIA[0-9A-Z]{16}/g,
    severity: 'critical',
    description: 'Ein AWS Access Key wurde im Quellcode gefunden. Damit können Angreifer auf AWS-Dienste zugreifen.',
    recommendation: 'Rotiere den AWS-Schlüssel sofort und verwende Umgebungsvariablen statt fest eingebetteter Keys.',
  },
  {
    name: 'AWS Secret Key',
    pattern: /(?:aws.{0,20})?(?:secret|key).{0,10}['"][A-Za-z0-9/+=]{40}['"]/gi,
    severity: 'critical',
    description: 'Ein möglicher AWS Secret Key wurde gefunden.',
    recommendation: 'Rotiere den Schlüssel sofort und speichere Secrets in Umgebungsvariablen.',
  },
  {
    name: 'Google API Key',
    pattern: /AIza[0-9A-Za-z_-]{35}/g,
    severity: 'high',
    description: 'Ein Google API Key wurde im Quellcode gefunden.',
    recommendation: 'Beschränke den API-Key auf bestimmte Domains/IPs und rotiere ihn.',
  },
  {
    name: 'GitHub Token',
    pattern: /gh[pousr]_[A-Za-z0-9_]{36,255}/g,
    severity: 'critical',
    description: 'Ein GitHub Token wurde im Quellcode gefunden. Damit können Angreifer auf Repositories zugreifen.',
    recommendation: 'Widerrufe den Token sofort auf GitHub und erstelle einen neuen mit minimalen Berechtigungen.',
  },
  {
    name: 'Stripe API Key',
    pattern: /sk_live_[0-9a-zA-Z]{24,99}/g,
    severity: 'critical',
    description: 'Ein Stripe Live API Key wurde gefunden. Damit können Zahlungen durchgeführt werden.',
    recommendation: 'Rotiere den Stripe-Key sofort im Stripe Dashboard.',
  },
  {
    name: 'Stripe Publishable Key (Live)',
    pattern: /pk_live_[0-9a-zA-Z]{24,99}/g,
    severity: 'medium',
    description: 'Ein Stripe Publishable Key (Live) wurde gefunden. Obwohl er weniger kritisch ist, sollte er geschützt werden.',
    recommendation: 'Prüfe, ob der Key korrekt konfiguriert und auf deine Domain beschränkt ist.',
  },
  {
    name: 'Private Key',
    pattern: /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----/g,
    severity: 'critical',
    description: 'Ein privater Schlüssel wurde im Quellcode gefunden.',
    recommendation: 'Entferne den privaten Schlüssel sofort aus dem öffentlichen Code und generiere neue Schlüssel.',
  },
  {
    name: 'Bearer Token',
    pattern: /['"]Bearer\s+[A-Za-z0-9\-._~+/]+=*['"]/g,
    severity: 'high',
    description: 'Ein fest eingebetteter Bearer Token wurde gefunden.',
    recommendation: 'Entferne den Token und verwende sichere Authentifizierungsmethoden.',
  },
  {
    name: 'Datenbank-URL',
    pattern: /(?:mysql|postgres|mongodb|redis):\/\/[^\s'"<>]+/gi,
    severity: 'critical',
    description: 'Eine Datenbank-Verbindungs-URL wurde im Quellcode gefunden.',
    recommendation: 'Entferne die Datenbank-URL aus dem öffentlichen Code und verwende Umgebungsvariablen.',
  },
  {
    name: 'Hardcoded Password',
    pattern: /(?:password|passwd|pwd|pass)\s*[:=]\s*['"][^'"]{8,}['"]/gi,
    severity: 'high',
    description: 'Ein möglicherweise fest eingebettetes Passwort wurde gefunden.',
    recommendation: 'Entferne Passwörter aus dem Quellcode und verwende Umgebungsvariablen oder einen Secret Manager.',
  },
  {
    name: 'JWT Token',
    pattern: /eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_.+/=]*/g,
    severity: 'high',
    description: 'Ein JWT Token wurde im Quellcode gefunden.',
    recommendation: 'Entferne fest eingebettete JWT Tokens und implementiere dynamische Token-Generierung.',
  },
  {
    name: 'Slack Webhook',
    pattern: /https:\/\/hooks\.slack\.com\/services\/T[A-Za-z0-9]+\/B[A-Za-z0-9]+\/[A-Za-z0-9]+/g,
    severity: 'high',
    description: 'Eine Slack Webhook-URL wurde gefunden. Damit können Nachrichten in deinen Slack-Workspace gesendet werden.',
    recommendation: 'Rotiere den Webhook und speichere ihn in Umgebungsvariablen.',
  },
  {
    name: 'SendGrid API Key',
    pattern: /SG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}/g,
    severity: 'high',
    description: 'Ein SendGrid API Key wurde gefunden.',
    recommendation: 'Rotiere den API-Key im SendGrid Dashboard.',
  },
];

export async function scanForSecrets(url: string, html: string): Promise<FindingInput[]> {
  const findings: FindingInput[] = [];

  // Scan the HTML source
  scanText(html, url, findings, 'HTML-Quellcode');

  // Extract and scan inline scripts
  const $ = cheerio.load(html);
  $('script').each((_, el) => {
    const scriptContent = $(el).html();
    if (scriptContent && scriptContent.length > 0) {
      scanText(scriptContent, url, findings, 'Inline-Script');
    }
  });

  // Extract external JS URLs and scan them
  const scriptUrls: string[] = [];
  $('script[src]').each((_, el) => {
    const src = $(el).attr('src');
    if (src) {
      try {
        const absoluteUrl = new URL(src, url).href;
        // Only scan same-origin scripts
        const base = new URL(url);
        const script = new URL(absoluteUrl);
        if (script.hostname === base.hostname) {
          scriptUrls.push(absoluteUrl);
        }
      } catch {
        // Invalid URL
      }
    }
  });

  // Fetch and scan external scripts (max 10, with rate limiting)
  const scriptsToScan = scriptUrls.slice(0, 10);
  for (const scriptUrl of scriptsToScan) {
    try {
      const response = await fetch(scriptUrl, {
        signal: AbortSignal.timeout(8000),
        headers: { 'User-Agent': 'TestMe-Security-Scanner/1.0' },
      });
      if (response.ok) {
        const scriptContent = await response.text();
        scanText(scriptContent, scriptUrl, findings, 'Externes Script');
      }
    } catch {
      // Ignore failures for individual scripts
    }
    // Rate limit
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  return findings;
}

function scanText(
  text: string,
  url: string,
  findings: FindingInput[],
  source: string
) {
  for (const pattern of SECRET_PATTERNS) {
    // Reset regex lastIndex
    pattern.pattern.lastIndex = 0;
    const matches = text.match(pattern.pattern);

    if (matches && matches.length > 0) {
      // Deduplicate
      const uniqueMatches = [...new Set(matches)];
      for (const match of uniqueMatches.slice(0, 3)) {
        // Mask the secret for safety
        const masked = match.length > 12
          ? match.substring(0, 6) + '***' + match.substring(match.length - 4)
          : '***';

        findings.push({
          category: 'secrets',
          severity: pattern.severity,
          title: `${pattern.name} im ${source} gefunden`,
          description: pattern.description,
          affected_url: url,
          recommendation: pattern.recommendation,
          details: {
            pattern: pattern.name,
            source,
            maskedMatch: masked,
          },
        });
      }
    }
  }
}
