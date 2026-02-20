import { Resolver } from 'dns/promises';
import type { ScanFinding } from '@/types';

type FindingInput = Omit<ScanFinding, 'id' | 'scan_id' | 'created_at'>;

// ── DNS Zone Transfer Check (AXFR) ─────────────────────────────────────
// We cannot do a true AXFR from a browser/serverless, but we can check
// the nameservers and test for common misconfigurations.
async function checkZoneTransfer(domain: string, resolver: Resolver, findings: FindingInput[]) {
  try {
    const nsRecords = await resolver.resolveNs(domain);

    if (nsRecords.length === 0) {
      findings.push({
        category: 'vulnerability',
        severity: 'medium',
        title: 'Keine NS-Records gefunden',
        description: 'Für diese Domain konnten keine Nameserver-Records aufgelöst werden.',
        affected_url: domain,
        recommendation: 'Stelle sicher, dass die DNS-Konfiguration korrekt ist.',
        details: null,
      });
      return;
    }

    findings.push({
      category: 'info',
      severity: 'info',
      title: `${nsRecords.length} Nameserver konfiguriert`,
      description: `Nameserver: ${nsRecords.join(', ')}`,
      affected_url: domain,
      recommendation: nsRecords.length < 2
        ? 'Konfiguriere mindestens 2 Nameserver für Redundanz.'
        : null,
      details: { nameservers: nsRecords },
    });

    // Check if NS records are consistent
    if (nsRecords.length === 1) {
      findings.push({
        category: 'vulnerability',
        severity: 'medium',
        title: 'Nur ein Nameserver konfiguriert',
        description: 'Es ist nur ein Nameserver konfiguriert. Fällt dieser aus, ist die Domain nicht mehr erreichbar.',
        affected_url: domain,
        recommendation: 'Konfiguriere mindestens 2 Nameserver bei verschiedenen Providern für Ausfallsicherheit.',
        details: { nameservers: nsRecords },
      });
    }
  } catch {
    // Cannot resolve NS records
  }
}

// ── DNS Record Types Audit ──────────────────────────────────────────────
async function auditDnsRecords(domain: string, resolver: Resolver, findings: FindingInput[]) {
  // Check for wildcard DNS
  try {
    const randomSub = `testme-nonexistent-${Date.now()}.${domain}`;
    const wildcardResult = await resolver.resolve4(randomSub).catch(() => null);

    if (wildcardResult && wildcardResult.length > 0) {
      findings.push({
        category: 'vulnerability',
        severity: 'medium',
        title: 'Wildcard DNS-Record erkannt',
        description: `Ein Wildcard DNS-Record (*.${domain}) zeigt auf ${wildcardResult[0]}. Alle Subdomains, auch nicht existierende, werden zu dieser IP aufgelöst. Dies kann Subdomain-Takeover-Erkennung erschweren und ist generell ein Sicherheitsrisiko.`,
        affected_url: domain,
        recommendation: 'Entferne den Wildcard-DNS-Record und konfiguriere nur explizite Subdomains.',
        details: { wildcardIp: wildcardResult[0] },
      });
    }
  } catch {
    // No wildcard - good
  }

  // Check for open DNS resolvers on domain nameservers
  // Check TXT records for interesting information
  try {
    const txtRecords = await resolver.resolveTxt(domain);
    const allTxt = txtRecords.flat();

    // Check for exposed verification tokens
    const verificationTokens = allTxt.filter((r) =>
      r.includes('google-site-verification') ||
      r.includes('facebook-domain-verification') ||
      r.includes('ms=') ||
      r.includes('_github-challenge') ||
      r.includes('atlassian-domain-verification') ||
      r.includes('docusign')
    );

    if (verificationTokens.length > 0) {
      findings.push({
        category: 'info',
        severity: 'info',
        title: `${verificationTokens.length} Domain-Verifikation(en) in TXT-Records`,
        description: `TXT-Records enthalten Verifikationstoken für externe Dienste: ${verificationTokens.map((t) => t.substring(0, 40) + '...').join(', ')}`,
        affected_url: domain,
        recommendation: 'Entferne Verifikationstoken, die nicht mehr benötigt werden, um die Angriffsfläche zu reduzieren.',
        details: { tokens: verificationTokens.map((t) => t.substring(0, 60)) },
      });
    }

    // Check for exposed internal information
    const sensitivePatterns = [
      { pattern: /internal/i, label: 'interne Informationen' },
      { pattern: /password/i, label: 'Passwort-Referenz' },
      { pattern: /api[_-]?key/i, label: 'API-Key-Referenz' },
      { pattern: /secret/i, label: 'Secret-Referenz' },
    ];

    for (const txt of allTxt) {
      for (const { pattern, label } of sensitivePatterns) {
        if (pattern.test(txt) && !txt.startsWith('v=spf1') && !txt.startsWith('v=DMARC1')) {
          findings.push({
            category: 'secrets',
            severity: 'medium',
            title: `Möglicherweise sensible Information in TXT-Record: ${label}`,
            description: `Ein DNS TXT-Record enthält möglicherweise sensible Informationen: "${txt.substring(0, 80)}..."`,
            affected_url: domain,
            recommendation: 'Prüfe, ob dieser TXT-Record sensible Daten enthält, und entferne ihn ggf.',
            details: { record: txt.substring(0, 150) },
          });
          break;
        }
      }
    }
  } catch {
    // No TXT records
  }
}

// ── IP Reputation Check ─────────────────────────────────────────────────
async function checkIpReputation(domain: string, resolver: Resolver, findings: FindingInput[]) {
  try {
    const addresses = await resolver.resolve4(domain);
    if (addresses.length === 0) return;

    const ip = addresses[0];

    // Check common DNS blacklists (DNSBL)
    const blacklists = [
      { name: 'Spamhaus ZEN', zone: 'zen.spamhaus.org' },
      { name: 'Barracuda', zone: 'b.barracudacentral.org' },
      { name: 'SpamCop', zone: 'bl.spamcop.net' },
      { name: 'SORBS', zone: 'dnsbl.sorbs.net' },
      { name: 'CBL', zone: 'cbl.abuseat.org' },
    ];

    const reversedIp = ip.split('.').reverse().join('.');
    const blacklisted: string[] = [];

    const checks = blacklists.map(async (bl) => {
      try {
        const lookup = `${reversedIp}.${bl.zone}`;
        await resolver.resolve4(lookup);
        // If resolve succeeds, IP is blacklisted
        blacklisted.push(bl.name);
      } catch {
        // Not blacklisted - good
      }
    });

    await Promise.all(checks);

    if (blacklisted.length > 0) {
      findings.push({
        category: 'vulnerability',
        severity: 'high',
        title: `Server-IP auf ${blacklisted.length} Blacklist(s)`,
        description: `Die IP-Adresse ${ip} des Servers ist auf folgenden DNS-Blacklists gelistet: ${blacklisted.join(', ')}. Dies kann E-Mail-Zustellung beeinträchtigen und auf Sicherheitsprobleme hinweisen.`,
        affected_url: domain,
        recommendation: 'Untersuche die Ursache der Blacklistung (Spam, Malware, kompromittierter Server). Beantrage ein Delisting bei den jeweiligen Providern.',
        details: { ip, blacklists: blacklisted },
      });
    } else {
      findings.push({
        category: 'info',
        severity: 'info',
        title: 'Server-IP nicht auf gängigen Blacklists',
        description: `Die IP-Adresse ${ip} wurde gegen ${blacklists.length} DNS-Blacklists geprüft und ist auf keiner gelistet.`,
        affected_url: domain,
        recommendation: null,
        details: { ip, checkedBlacklists: blacklists.map((b) => b.name) },
      });
    }
  } catch {
    // Can't resolve IP
  }
}

// ── Dangling CNAME Check (Subdomain Takeover) ───────────────────────────
async function checkDanglingCname(domain: string, resolver: Resolver, findings: FindingInput[]) {
  const takoverableServices = [
    { cname: '.s3.amazonaws.com', service: 'AWS S3' },
    { cname: '.s3-website', service: 'AWS S3 Website' },
    { cname: '.herokuapp.com', service: 'Heroku' },
    { cname: '.ghost.io', service: 'Ghost' },
    { cname: '.pantheonsite.io', service: 'Pantheon' },
    { cname: '.wordpress.com', service: 'WordPress.com' },
    { cname: '.myshopify.com', service: 'Shopify' },
    { cname: '.surge.sh', service: 'Surge' },
    { cname: '.bitbucket.io', service: 'Bitbucket' },
    { cname: '.github.io', service: 'GitHub Pages' },
    { cname: '.gitlab.io', service: 'GitLab Pages' },
    { cname: '.azurewebsites.net', service: 'Azure' },
    { cname: '.cloudfront.net', service: 'CloudFront' },
    { cname: '.trafficmanager.net', service: 'Azure Traffic Manager' },
    { cname: '.firebaseapp.com', service: 'Firebase' },
    { cname: '.web.app', service: 'Firebase' },
    { cname: '.netlify.app', service: 'Netlify' },
    { cname: '.vercel.app', service: 'Vercel' },
    { cname: '.fly.dev', service: 'Fly.io' },
    { cname: '.render.com', service: 'Render' },
  ];

  try {
    const cnameRecords = await resolver.resolveCname(domain);

    for (const cname of cnameRecords) {
      for (const { cname: pattern, service } of takoverableServices) {
        if (cname.toLowerCase().includes(pattern)) {
          // Try to access the domain
          try {
            const response = await fetch(`https://${domain}`, {
              signal: AbortSignal.timeout(8000),
              redirect: 'follow',
            });
            const body = await response.text();

            // Check for common "not found" indicators from cloud services
            const notFoundIndicators = [
              'NoSuchBucket', 'There isn\'t a GitHub Pages site', 'No such app',
              'Repository not found', 'no-such-app', 'Site Not Found',
              'This site can\'t be reached', 'Domain is not configured',
              'project not found', 'The specified bucket does not exist',
            ];

            if (notFoundIndicators.some((ind) => body.includes(ind)) || response.status === 404) {
              findings.push({
                category: 'vulnerability',
                severity: 'critical',
                title: `Subdomain Takeover möglich (${service})`,
                description: `Die Domain ${domain} hat einen CNAME-Eintrag zu ${cname} (${service}), aber die zugehörige Ressource existiert nicht mehr. Ein Angreifer kann diese Ressource bei ${service} beanspruchen und die Domain übernehmen.`,
                affected_url: `https://${domain}`,
                recommendation: `Entferne den CNAME-Eintrag für ${domain} oder erstelle die zugehörige ${service}-Ressource erneut.`,
                details: { cname, service },
              });
            }
          } catch {
            // Could not verify
          }
        }
      }
    }
  } catch {
    // No CNAME records - fine
  }
}

// ── Main DNS Security Check ─────────────────────────────────────────────
export async function checkDnsSecurity(domain: string): Promise<FindingInput[]> {
  const findings: FindingInput[] = [];
  const resolver = new Resolver();
  resolver.setServers(['8.8.8.8', '1.1.1.1']);

  await Promise.all([
    checkZoneTransfer(domain, resolver, findings),
    auditDnsRecords(domain, resolver, findings),
    checkIpReputation(domain, resolver, findings),
    checkDanglingCname(domain, resolver, findings),
  ]);

  return findings;
}
