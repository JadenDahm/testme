import * as cheerio from 'cheerio';
import type { ScanFinding } from '@/types';

type FindingInput = Omit<ScanFinding, 'id' | 'scan_id' | 'created_at'>;

interface SecretPattern {
  name: string;
  pattern: RegExp;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  recommendation: string;
}

const SECRET_PATTERNS: SecretPattern[] = [
  // ── Cloud Provider Keys ────────────────────────────────────────
  {
    name: 'AWS Access Key',
    pattern: /(?:AKIA|ABIA|ACCA|ASIA)[A-Z0-9]{16}/g,
    severity: 'critical',
    description: 'Ein AWS Access Key wurde im Code gefunden. Damit kann auf AWS-Ressourcen zugegriffen werden.',
    recommendation: 'Rotiere den AWS Key sofort in der AWS IAM-Konsole.',
  },
  {
    name: 'AWS Secret Key',
    pattern: /(?:aws)?_?(?:secret)?_?(?:access)?_?key['"=:\s]+[A-Za-z0-9/+=]{40}/gi,
    severity: 'critical',
    description: 'Ein AWS Secret Key wurde gefunden.',
    recommendation: 'Rotiere den Key sofort.',
  },
  {
    name: 'Google API Key',
    pattern: /AIza[0-9A-Za-z_-]{35}/g,
    severity: 'high',
    description: 'Ein Google API Key wurde im öffentlichen Code gefunden.',
    recommendation: 'Beschränke den Key auf bestimmte APIs/Domains oder rotiere ihn.',
  },
  {
    name: 'Google OAuth Client Secret',
    pattern: /GOCSPX-[a-zA-Z0-9_-]{28}/g,
    severity: 'critical',
    description: 'Ein Google OAuth Client Secret wurde gefunden.',
    recommendation: 'Rotiere das Secret in der Google Cloud Console.',
  },
  {
    name: 'Firebase API Key',
    pattern: /(?:firebase|FIREBASE).*(?:key|KEY)['"=:\s]+AIza[0-9A-Za-z_-]{35}/gi,
    severity: 'medium',
    description: 'Ein Firebase API Key wurde im Code gefunden. Firebase Keys sind zwar eingeschränkt, können aber missbraucht werden.',
    recommendation: 'Schränke den Key über Firebase App Check ein.',
  },
  {
    name: 'Azure Storage Key',
    pattern: /(?:DefaultEndpointsProtocol|AccountKey)\s*=\s*[A-Za-z0-9+/=]{86,}/g,
    severity: 'critical',
    description: 'Ein Azure Storage Connection String wurde gefunden.',
    recommendation: 'Rotiere den Storage Key in Azure.',
  },

  // ── API Keys & Tokens ─────────────────────────────────────────
  {
    name: 'GitHub Token',
    pattern: /(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,}/g,
    severity: 'critical',
    description: 'Ein GitHub Personal Access Token wurde gefunden.',
    recommendation: 'Revoziere den Token sofort unter github.com/settings/tokens.',
  },
  {
    name: 'GitHub OAuth App',
    pattern: /(?:github|GITHUB).*(?:secret|SECRET)['"=:\s]+[a-f0-9]{40}/gi,
    severity: 'critical',
    description: 'Ein GitHub OAuth Secret wurde gefunden.',
    recommendation: 'Rotiere das Secret in den GitHub OAuth App Einstellungen.',
  },
  {
    name: 'Stripe Secret Key',
    pattern: /sk_live_[a-zA-Z0-9]{20,}/g,
    severity: 'critical',
    description: 'Ein Stripe Live Secret Key wurde gefunden. Damit können Zahlungen ausgelöst werden.',
    recommendation: 'Rotiere den Key sofort im Stripe Dashboard.',
  },
  {
    name: 'Stripe Publishable Key (Live)',
    pattern: /pk_live_[a-zA-Z0-9]{20,}/g,
    severity: 'low',
    description: 'Ein Stripe Live Publishable Key wurde gefunden. Dieser ist zwar für den Client gedacht, bestätigt aber eine Live-Integration.',
    recommendation: 'Dies ist normal für Client-Code, aber stelle sicher, dass der Secret Key nicht exponiert ist.',
  },
  {
    name: 'SendGrid API Key',
    pattern: /SG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}/g,
    severity: 'high',
    description: 'Ein SendGrid API Key wurde gefunden.',
    recommendation: 'Rotiere den Key im SendGrid Dashboard.',
  },
  {
    name: 'Twilio Account/Auth',
    pattern: /(?:twilio|TWILIO).*(?:token|TOKEN|sid|SID|auth|AUTH)['"=:\s]+[a-f0-9]{32}/gi,
    severity: 'critical',
    description: 'Twilio-Zugangsdaten wurden gefunden.',
    recommendation: 'Rotiere die Twilio-Zugangsdaten.',
  },
  {
    name: 'Mailgun API Key',
    pattern: /key-[a-z0-9]{32}/gi,
    severity: 'high',
    description: 'Ein Mailgun API Key wurde gefunden.',
    recommendation: 'Rotiere den Key im Mailgun Dashboard.',
  },
  {
    name: 'OpenAI API Key',
    pattern: /sk-[a-zA-Z0-9]{20}T3BlbkFJ[a-zA-Z0-9]{20}/g,
    severity: 'critical',
    description: 'Ein OpenAI API Key wurde gefunden. Damit können auf deine Kosten API-Aufrufe gemacht werden.',
    recommendation: 'Rotiere den Key sofort auf platform.openai.com.',
  },
  {
    name: 'OpenAI Project Key',
    pattern: /sk-proj-[A-Za-z0-9_-]{80,}/g,
    severity: 'critical',
    description: 'Ein OpenAI Project API Key wurde gefunden.',
    recommendation: 'Rotiere den Key sofort.',
  },
  {
    name: 'Slack Webhook',
    pattern: /https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]{8,}\/B[A-Z0-9]{8,}\/[a-zA-Z0-9]{24}/g,
    severity: 'high',
    description: 'Eine Slack Webhook URL wurde gefunden. Angreifer können Nachrichten in euren Slack senden.',
    recommendation: 'Regeneriere den Webhook in der Slack-App-Konfiguration.',
  },
  {
    name: 'Slack Bot Token',
    pattern: /xoxb-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{24}/g,
    severity: 'critical',
    description: 'Ein Slack Bot Token wurde gefunden.',
    recommendation: 'Rotiere den Token sofort.',
  },
  {
    name: 'Discord Webhook',
    pattern: /https:\/\/discord(?:app)?\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+/g,
    severity: 'high',
    description: 'Eine Discord Webhook URL wurde gefunden.',
    recommendation: 'Lösche den Webhook und erstelle einen neuen.',
  },
  {
    name: 'Discord Bot Token',
    pattern: /[MN][A-Za-z\d]{23,}\.[\w-]{6}\.[\w-]{27}/g,
    severity: 'critical',
    description: 'Ein Discord Bot Token wurde gefunden.',
    recommendation: 'Regeneriere den Token sofort.',
  },
  {
    name: 'Telegram Bot Token',
    pattern: /\d{8,10}:[A-Za-z0-9_-]{35}/g,
    severity: 'high',
    description: 'Ein Telegram Bot Token wurde gefunden.',
    recommendation: 'Revoziere den Token über @BotFather.',
  },
  {
    name: 'Heroku API Key',
    pattern: /(?:heroku|HEROKU).*(?:key|KEY|token|TOKEN)['"=:\s]+[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    severity: 'critical',
    description: 'Ein Heroku API Key wurde gefunden.',
    recommendation: 'Rotiere den Key über heroku authorizations.',
  },
  {
    name: 'Cloudflare API Key',
    pattern: /(?:cloudflare|CF).*(?:key|KEY|token|TOKEN)['"=:\s]+[a-f0-9]{37}/gi,
    severity: 'critical',
    description: 'Ein Cloudflare API Key wurde gefunden.',
    recommendation: 'Rotiere den Key im Cloudflare Dashboard.',
  },
  {
    name: 'DigitalOcean Token',
    pattern: /dop_v1_[a-f0-9]{64}/g,
    severity: 'critical',
    description: 'Ein DigitalOcean Personal Access Token wurde gefunden.',
    recommendation: 'Rotiere den Token sofort.',
  },
  {
    name: 'NPM Token',
    pattern: /npm_[A-Za-z0-9]{36}/g,
    severity: 'critical',
    description: 'Ein NPM Auth Token wurde gefunden. Damit können Packages veröffentlicht werden.',
    recommendation: 'Revoziere den Token auf npmjs.com.',
  },
  {
    name: 'Supabase Service Role Key',
    pattern: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
    severity: 'high',
    description: 'Ein JWT (möglicherweise ein Supabase Service Role Key) wurde im Code gefunden.',
    recommendation: 'Prüfe, ob es sich um einen Service Role Key handelt, und rotiere ihn bei Bedarf.',
  },

  // ── Crypto & Auth ──────────────────────────────────────────────
  {
    name: 'RSA Private Key',
    pattern: /-----BEGIN (?:RSA )?PRIVATE KEY-----/g,
    severity: 'critical',
    description: 'Ein Private Key wurde im öffentlichen Code gefunden.',
    recommendation: 'Entferne den Key sofort, revoziere ihn und generiere einen neuen.',
  },
  {
    name: 'SSH Private Key',
    pattern: /-----BEGIN OPENSSH PRIVATE KEY-----/g,
    severity: 'critical',
    description: 'Ein SSH Private Key wurde gefunden.',
    recommendation: 'Entferne den Key und generiere einen neuen.',
  },
  {
    name: 'PGP Private Key',
    pattern: /-----BEGIN PGP PRIVATE KEY BLOCK-----/g,
    severity: 'critical',
    description: 'Ein PGP Private Key wurde gefunden.',
    recommendation: 'Entferne den Key und revoziere ihn.',
  },
  {
    name: 'Bearer Token',
    pattern: /(?:bearer|Bearer|BEARER)\s+[A-Za-z0-9_.-]{20,}/g,
    severity: 'high',
    description: 'Ein Bearer Token wurde im Code gefunden.',
    recommendation: 'Entferne den Token und invalidiere ihn.',
  },
  {
    name: 'Basic Auth Credentials',
    pattern: /(?:basic|Basic|BASIC)\s+[A-Za-z0-9+/=]{15,}/g,
    severity: 'high',
    description: 'Base64-kodierte Basic Auth Credentials wurden gefunden.',
    recommendation: 'Entferne die Credentials und ändere das Passwort.',
  },

  // ── Database URLs ──────────────────────────────────────────────
  {
    name: 'Database Connection String',
    pattern: /(?:mongodb|postgres|mysql|redis|amqp|mssql):\/\/[^\s'"<>]{10,}/gi,
    severity: 'critical',
    description: 'Ein Datenbank-Connection-String wurde im öffentlichen Code gefunden.',
    recommendation: 'Rotiere die Datenbank-Zugangsdaten sofort.',
  },

  // ── Hardcoded Passwords ────────────────────────────────────────
  {
    name: 'Hardcoded Password',
    pattern: /(?:password|passwd|pwd|pass)\s*[:=]\s*['"][^'"]{8,}['"]/gi,
    severity: 'high',
    description: 'Ein hardkodiertes Passwort wurde im Code gefunden.',
    recommendation: 'Verwende Umgebungsvariablen statt hardkodierter Passwörter.',
  },
  {
    name: 'Hardcoded Secret',
    pattern: /(?:secret|SECRET|api_key|API_KEY|apiKey|apikey|auth_token|AUTH_TOKEN)\s*[:=]\s*['"][A-Za-z0-9+/=_-]{16,}['"]/g,
    severity: 'high',
    description: 'Ein hardkodiertes Secret wurde im Code gefunden.',
    recommendation: 'Verwende Umgebungsvariablen für Secrets.',
  },
];

function scanText(
  text: string,
  sourceUrl: string,
  findings: FindingInput[],
  context: string
) {
  for (const secret of SECRET_PATTERNS) {
    // Reset regex state
    const regex = new RegExp(secret.pattern.source, secret.pattern.flags);
    const matches = text.match(regex);

    if (matches) {
      // Deduplicate matches
      const uniqueMatches = [...new Set(matches)];

      for (const match of uniqueMatches.slice(0, 3)) { // Max 3 per pattern per source
        // Mask the actual value for security
        const masked = maskSecret(match);

        // Check for false positives
        if (isFalsePositive(match, secret.name)) continue;

        findings.push({
          category: 'secrets',
          severity: secret.severity,
          title: `${secret.name} im ${context} gefunden`,
          description: `${secret.description} Gefundener Wert: ${masked}`,
          affected_url: sourceUrl,
          recommendation: secret.recommendation,
          details: {
            pattern: secret.name,
            context,
            maskedValue: masked,
          },
        });
      }
    }
  }
}

function maskSecret(value: string): string {
  if (value.length <= 8) return '****';
  if (value.length <= 20) return value.substring(0, 4) + '****' + value.substring(value.length - 4);
  return value.substring(0, 6) + '...[MASKED]...' + value.substring(value.length - 4);
}

function isFalsePositive(match: string, patternName: string): boolean {
  // Common false positives
  const lowerMatch = match.toLowerCase();

  // Skip placeholder values
  if (
    lowerMatch.includes('example') ||
    lowerMatch.includes('placeholder') ||
    lowerMatch.includes('your_') ||
    lowerMatch.includes('xxx') ||
    lowerMatch.includes('todo') ||
    lowerMatch.includes('changeme') ||
    lowerMatch.includes('replace_me') ||
    lowerMatch.includes('aaaa') ||
    lowerMatch === 'password: "password"' ||
    lowerMatch === "password: 'password'"
  ) {
    return true;
  }

  // Skip if it's clearly a CSS class or HTML attribute
  if (patternName === 'Hardcoded Password' || patternName === 'Hardcoded Secret') {
    if (match.includes('type=') || match.includes('class=') || match.includes('name=')) {
      return true;
    }
  }

  return false;
}

export async function scanForSecrets(
  url: string,
  html: string
): Promise<FindingInput[]> {
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

  // Fetch and scan external scripts (max 15, with rate limiting)
  const scriptsToScan = scriptUrls.slice(0, 15);
  for (const scriptUrl of scriptsToScan) {
    try {
      const response = await fetch(scriptUrl, {
        signal: AbortSignal.timeout(8000),
        headers: { 'User-Agent': 'TestMe-Security-Scanner/1.0' },
      });
      if (response.ok) {
        const scriptContent = await response.text();
        if (scriptContent.length < 2_000_000) {
          // Skip files > 2MB
          scanText(scriptContent, scriptUrl, findings, 'Externes Script');
        }
      }
    } catch {
      // Ignore failures for individual scripts
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  // ── Also scan CSS for imported URLs with tokens ────────────────
  $('link[rel="stylesheet"][href]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) {
      try {
        const absoluteUrl = new URL(href, url).href;
        // Check if URL itself contains tokens
        scanText(absoluteUrl, url, findings, 'Stylesheet-URL');
      } catch {
        // Invalid URL
      }
    }
  });

  // ── Check meta tags for secrets ────────────────────────────────
  $('meta').each((_, el) => {
    const content = $(el).attr('content');
    if (content && content.length > 10) {
      scanText(content, url, findings, 'Meta-Tag');
    }
  });

  // ── Check data attributes ──────────────────────────────────────
  $('[data-api-key], [data-token], [data-secret], [data-key]').each((_, el) => {
    const attrs = (el as unknown as { attribs?: Record<string, string> }).attribs || {};
    for (const [key, value] of Object.entries(attrs)) {
      if (key.startsWith('data-') && value && value.length > 10) {
        scanText(value, url, findings, `Data-Attribut (${key})`);
      }
    }
  });

  // Deduplicate findings by title and URL
  const seen = new Set<string>();
  return findings.filter((f) => {
    const key = `${f.title}::${f.affected_url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
