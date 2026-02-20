import { Resolver } from 'dns/promises';
import type { ScanFinding } from '@/types';

type FindingInput = Omit<ScanFinding, 'id' | 'scan_id' | 'created_at'>;

interface SubdomainResult {
  subdomain: string;
  ip?: string;
  alive: boolean;
  https: boolean;
  statusCode?: number;
  server?: string;
  redirectsTo?: string;
}

// ── Passive Subdomain Enumeration via Certificate Transparency ──────────
async function fetchCrtShSubdomains(domain: string): Promise<string[]> {
  try {
    const response = await fetch(
      `https://crt.sh/?q=%25.${encodeURIComponent(domain)}&output=json`,
      { signal: AbortSignal.timeout(15000) }
    );
    if (!response.ok) return [];

    const data = (await response.json()) as Array<{ name_value: string }>;
    const subdomains = new Set<string>();

    for (const entry of data) {
      const names = entry.name_value.split('\n');
      for (const name of names) {
        const clean = name.trim().toLowerCase();
        // Only include direct subdomains, skip wildcards
        if (
          clean.endsWith(`.${domain}`) &&
          !clean.startsWith('*.') &&
          clean !== domain &&
          clean.split('.').length <= domain.split('.').length + 2
        ) {
          subdomains.add(clean);
        }
      }
    }

    return [...subdomains];
  } catch {
    return [];
  }
}

// ── Common subdomain wordlist ───────────────────────────────────────────
const COMMON_SUBDOMAINS = [
  'www', 'mail', 'ftp', 'localhost', 'webmail', 'smtp', 'pop', 'ns1', 'ns2',
  'dns', 'dns1', 'dns2', 'mx', 'mx1', 'mx2', 'imap', 'blog', 'api',
  'dev', 'staging', 'stage', 'test', 'testing', 'beta', 'alpha', 'demo',
  'admin', 'panel', 'portal', 'dashboard', 'app', 'apps', 'mobile',
  'cdn', 'media', 'static', 'assets', 'img', 'images', 'files',
  'vpn', 'remote', 'gateway', 'gw', 'proxy', 'lb', 'loadbalancer',
  'db', 'database', 'mysql', 'postgres', 'redis', 'mongo', 'elastic',
  'jenkins', 'ci', 'cd', 'gitlab', 'git', 'svn', 'repo',
  'grafana', 'kibana', 'prometheus', 'monitor', 'monitoring', 'status',
  'docs', 'doc', 'wiki', 'help', 'support', 'kb',
  'shop', 'store', 'checkout', 'pay', 'payment', 'billing',
  'auth', 'login', 'sso', 'oauth', 'id', 'identity', 'accounts',
  'search', 'elasticsearch', 'solr',
  'ws', 'wss', 'socket', 'realtime', 'push', 'notify',
  'backup', 'bak', 'old', 'legacy', 'archive',
  'internal', 'intranet', 'corp', 'private',
  'api-v1', 'api-v2', 'api2', 'v1', 'v2',
  'm', 'mobile-api', 'rest', 'graphql',
  'sandbox', 'qa', 'uat', 'preprod', 'pre-prod', 'production', 'prod',
  'crm', 'erp', 'hr', 'jira', 'confluence',
  'mail2', 'webmail2', 'exchange', 'owa', 'autodiscover',
  's3', 'storage', 'bucket', 'cloud',
  'k8s', 'kubernetes', 'docker', 'swarm', 'rancher',
];

// ── DNS-based subdomain brute force ─────────────────────────────────────
async function bruteForceSubdomains(domain: string): Promise<string[]> {
  const resolver = new Resolver();
  resolver.setServers(['8.8.8.8', '1.1.1.1']);
  const found: string[] = [];

  // Process in batches of 15
  for (let i = 0; i < COMMON_SUBDOMAINS.length; i += 15) {
    const batch = COMMON_SUBDOMAINS.slice(i, i + 15);
    const results = await Promise.allSettled(
      batch.map(async (sub) => {
        const fqdn = `${sub}.${domain}`;
        try {
          await resolver.resolve4(fqdn);
          return fqdn;
        } catch {
          return null;
        }
      })
    );

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        found.push(result.value);
      }
    }
  }

  return found;
}

// ── Check subdomain status ──────────────────────────────────────────────
async function checkSubdomain(subdomain: string): Promise<SubdomainResult> {
  const result: SubdomainResult = {
    subdomain,
    alive: false,
    https: false,
  };

  // Resolve IP
  try {
    const resolver = new Resolver();
    resolver.setServers(['8.8.8.8']);
    const addresses = await resolver.resolve4(subdomain);
    result.ip = addresses[0];
  } catch {
    // No IP resolution
  }

  // Check HTTPS
  try {
    const response = await fetch(`https://${subdomain}`, {
      method: 'HEAD',
      signal: AbortSignal.timeout(6000),
      redirect: 'manual',
      headers: { 'User-Agent': 'TestMe-Security-Scanner/1.0' },
    });
    result.alive = true;
    result.https = true;
    result.statusCode = response.status;
    result.server = response.headers.get('server') || undefined;
    const location = response.headers.get('location');
    if (location && response.status >= 300 && response.status < 400) {
      result.redirectsTo = location;
    }
  } catch {
    // Try HTTP
    try {
      const response = await fetch(`http://${subdomain}`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(6000),
        redirect: 'manual',
        headers: { 'User-Agent': 'TestMe-Security-Scanner/1.0' },
      });
      result.alive = true;
      result.statusCode = response.status;
      result.server = response.headers.get('server') || undefined;
    } catch {
      // Not accessible
    }
  }

  return result;
}

// ── Main Subdomain Enumeration ──────────────────────────────────────────
export async function enumerateSubdomains(domain: string): Promise<FindingInput[]> {
  const findings: FindingInput[] = [];

  // Run both methods in parallel
  const [crtSubdomains, bruteSubdomains] = await Promise.all([
    fetchCrtShSubdomains(domain).catch(() => [] as string[]),
    bruteForceSubdomains(domain).catch(() => [] as string[]),
  ]);

  // Merge and deduplicate
  const allSubdomains = [...new Set([...crtSubdomains, ...bruteSubdomains])];

  if (allSubdomains.length === 0) {
    findings.push({
      category: 'info',
      severity: 'info',
      title: 'Keine zusätzlichen Subdomains gefunden',
      description: 'Es wurden keine weiteren Subdomains über Certificate Transparency Logs oder DNS-Brute-Force erkannt.',
      affected_url: domain,
      recommendation: null,
      details: null,
    });
    return findings;
  }

  // Check status of up to 30 subdomains
  const subdomainsToCheck = allSubdomains.slice(0, 30);
  const results: SubdomainResult[] = [];

  // Check in batches of 5
  for (let i = 0; i < subdomainsToCheck.length; i += 5) {
    const batch = subdomainsToCheck.slice(i, i + 5);
    const batchResults = await Promise.all(
      batch.map((sub) => checkSubdomain(sub).catch(() => ({
        subdomain: sub, alive: false, https: false,
      } as SubdomainResult)))
    );
    results.push(...batchResults);
  }

  const aliveSubdomains = results.filter((r) => r.alive);
  const noHttpsSubdomains = aliveSubdomains.filter((r) => !r.https);

  // Report total subdomains found
  findings.push({
    category: 'info',
    severity: 'info',
    title: `${allSubdomains.length} Subdomains entdeckt (${aliveSubdomains.length} erreichbar)`,
    description: `Über Certificate Transparency Logs (${crtSubdomains.length}) und DNS-Enumeration (${bruteSubdomains.length}) wurden insgesamt ${allSubdomains.length} eindeutige Subdomains gefunden, davon sind ${aliveSubdomains.length} aktiv erreichbar.`,
    affected_url: domain,
    recommendation: 'Prüfe, ob alle aktiven Subdomains beabsichtigt und sicher konfiguriert sind. Deaktiviere ungenutzte Subdomains.',
    details: {
      total: allSubdomains.length,
      alive: aliveSubdomains.length,
      subdomains: aliveSubdomains.map((r) => ({
        name: r.subdomain,
        ip: r.ip,
        https: r.https,
        status: r.statusCode,
        server: r.server,
      })),
    },
  });

  // Flag subdomains without HTTPS
  if (noHttpsSubdomains.length > 0) {
    findings.push({
      category: 'ssl',
      severity: 'medium',
      title: `${noHttpsSubdomains.length} Subdomain(s) ohne HTTPS`,
      description: `Folgende Subdomains sind nur über HTTP erreichbar: ${noHttpsSubdomains.map((r) => r.subdomain).join(', ')}. Daten werden unverschlüsselt übertragen.`,
      affected_url: domain,
      recommendation: 'Aktiviere HTTPS für alle Subdomains. Nutze Wildcard-Zertifikate oder Let\'s Encrypt.',
      details: { subdomains: noHttpsSubdomains.map((r) => r.subdomain) },
    });
  }

  // Flag potentially dangerous subdomains (dev, staging, test, etc.)
  const dangerousPatterns = ['dev', 'staging', 'stage', 'test', 'beta', 'alpha', 'demo', 'sandbox', 'qa', 'uat', 'preprod', 'debug', 'internal', 'admin', 'backup', 'old', 'legacy'];
  const dangerousSubdomains = aliveSubdomains.filter((r) =>
    dangerousPatterns.some((p) => r.subdomain.split('.')[0] === p || r.subdomain.startsWith(`${p}.`))
  );

  if (dangerousSubdomains.length > 0) {
    findings.push({
      category: 'vulnerability',
      severity: 'high',
      title: `${dangerousSubdomains.length} potenziell sensible Subdomain(s) öffentlich erreichbar`,
      description: `Subdomains wie ${dangerousSubdomains.map((r) => r.subdomain).join(', ')} sind öffentlich erreichbar. Entwicklungs-, Test- und Admin-Umgebungen sollten nicht öffentlich zugänglich sein, da sie oft weniger abgesichert sind.`,
      affected_url: domain,
      recommendation: 'Schütze Entwicklungs- und Staging-Umgebungen per VPN, IP-Whitelist oder HTTP Basic Auth. Entferne ungenutzte Subdomains.',
      details: { dangerousSubdomains: dangerousSubdomains.map((r) => r.subdomain) },
    });
  }

  // Flag subdomains potentially vulnerable to takeover (NXDOMAIN on DNS but CNAME exists)
  const potentialTakeover = results.filter((r) => !r.alive && r.ip);
  if (potentialTakeover.length > 0) {
    findings.push({
      category: 'vulnerability',
      severity: 'high',
      title: `${potentialTakeover.length} Subdomain(s) möglicherweise anfällig für Subdomain Takeover`,
      description: `Subdomains ${potentialTakeover.map((r) => r.subdomain).join(', ')} haben DNS-Records, sind aber nicht erreichbar. Dies kann auf ein Subdomain-Takeover-Risiko hinweisen (z.B. gelöschte Cloud-Ressourcen mit vorhandenem CNAME).`,
      affected_url: domain,
      recommendation: 'Prüfe die DNS-Records dieser Subdomains. Entferne CNAME-Einträge, die auf nicht mehr existierende Ressourcen zeigen.',
      details: { subdomains: potentialTakeover.map((r) => ({ name: r.subdomain, ip: r.ip })) },
    });
  }

  return findings;
}
