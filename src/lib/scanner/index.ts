import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { checkSsl } from './ssl';
import { analyzeHeaders } from './headers';
import { checkSensitiveFiles } from './sensitive-files';
import { scanForSecrets } from './secrets';
import { checkVulnerabilities } from './vulnerability';
import { checkSqlInjection } from './sqli';
import { crawlDomain, type CrawledPage } from './crawler';
import { calculateScore, generateSummary } from './scoring';
import { checkCors } from './cors';
import { checkEmailSecurity } from './email-security';
import { detectTechnology } from './technology';
import { enumerateSubdomains } from './subdomain';
import { checkDnsSecurity } from './dns-security';
import { detectWaf } from './waf-detection';
import { checkJsLibraries } from './js-libraries';
import { checkHostHeaderInjection } from './host-header-injection';
import { checkRateLimiting } from './rate-limiting';
import { checkServerInfoLeak } from './server-info-leak';
import { generateComplianceReport } from './compliance';
import type { ScanFinding } from '@/types';

type FindingInput = Omit<ScanFinding, 'id' | 'scan_id' | 'created_at'>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAdmin = SupabaseClient<any, any, any>;

// ── Scan Steps ───────────────────────────────────────────────────────────
export const SCAN_STEPS = [
  { id: 'recon', name: 'Reconnaissance', displayName: 'SSL, Header, CORS, WAF & Technologie-Analyse', progress: 15 },
  { id: 'email', name: 'E-Mail-Sicherheit', displayName: 'SPF, DKIM, DMARC, DNSSEC & BIMI Prüfung', progress: 25 },
  { id: 'discovery', name: 'Discovery', displayName: 'Subdomain-Enumeration, DNS-Sicherheit & Crawling', progress: 45 },
  { id: 'analysis', name: 'Analyse', displayName: 'Schwachstellen, JS-Libraries, Secrets & Injection', progress: 65 },
  { id: 'infrastructure', name: 'Infrastruktur', displayName: 'Rate Limiting, Host Header, Server Info Leak', progress: 85 },
  { id: 'scoring', name: 'Bewertung', displayName: 'OWASP Top 10 Compliance & Score-Berechnung', progress: 100 },
] as const;

export type ScanStepId = (typeof SCAN_STEPS)[number]['id'];

function getNextStep(currentStep: string | null): typeof SCAN_STEPS[number] | null {
  if (!currentStep || currentStep === 'init') {
    return SCAN_STEPS[0];
  }

  const currentIndex = SCAN_STEPS.findIndex((s) => s.id === currentStep);
  if (currentIndex === -1) return SCAN_STEPS[0];
  if (currentIndex >= SCAN_STEPS.length - 1) return null; // All done

  return SCAN_STEPS[currentIndex + 1];
}

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ── Execute a single scan step ───────────────────────────────────────────
export async function executeScanStep(
  scanId: string,
  userId: string,
  domain: string
): Promise<{ completed: boolean; step: string; nextStep: string | null }> {
  const supabase = getSupabaseAdmin();

  // Get current scan state
  const { data: scan, error: scanError } = await supabase
    .from('scans')
    .select('status, current_step, progress')
    .eq('id', scanId)
    .single();

  if (scanError || !scan) {
    throw new Error('Scan nicht gefunden');
  }

  if (scan.status === 'completed' || scan.status === 'failed' || scan.status === 'cancelled') {
    return { completed: true, step: scan.current_step || 'done', nextStep: null };
  }

  const nextStep = getNextStep(scan.current_step);
  if (!nextStep) {
    // All steps completed
    await supabase
      .from('scans')
      .update({ status: 'completed', progress: 100, completed_at: new Date().toISOString() })
      .eq('id', scanId);
    return { completed: true, step: 'done', nextStep: null };
  }

  // Update status to running
  if (scan.status !== 'running') {
    await supabase
      .from('scans')
      .update({
        status: 'running',
        started_at: scan.status === 'pending' ? new Date().toISOString() : undefined,
      })
      .eq('id', scanId);
  }

  // Update current step
  await supabase
    .from('scans')
    .update({ current_step: nextStep.id })
    .eq('id', scanId);

  // Log step start
  await supabase.from('scan_logs').insert({
    scan_id: scanId,
    user_id: userId,
    action: `step_start:${nextStep.id}`,
    details: nextStep.displayName,
  });

  try {
    let findings: FindingInput[] = [];

    // Execute the step
    switch (nextStep.id) {
      case 'recon':
        findings = await executeReconStep(domain);
        break;
      case 'email':
        findings = await executeEmailStep(domain);
        break;
      case 'discovery':
        findings = await executeDiscoveryStep(domain, scanId, userId, supabase);
        break;
      case 'analysis':
        findings = await executeAnalysisStep(domain, scanId, userId, supabase);
        break;
      case 'infrastructure':
        findings = await executeInfrastructureStep(domain);
        break;
      case 'scoring':
        await executeScoringStep(scanId, supabase);
        // Scoring has no new findings, it calculates the score from all existing ones
        break;
    }

    // Save findings
    if (findings.length > 0) {
      const findingsToInsert = findings.map((f) => ({
        ...f,
        scan_id: scanId,
      }));

      // Insert in batches of 50
      for (let i = 0; i < findingsToInsert.length; i += 50) {
        await supabase
          .from('scan_findings')
          .insert(findingsToInsert.slice(i, i + 50));
      }
    }

    // Update progress
    await supabase
      .from('scans')
      .update({ progress: nextStep.progress, current_step: nextStep.id })
      .eq('id', scanId);

    // Log step completion
    await supabase.from('scan_logs').insert({
      scan_id: scanId,
      user_id: userId,
      action: `step_complete:${nextStep.id}`,
      details: `${findings.length} Findings`,
    });

    // Check if this was the last step
    const nextNextStep = getNextStep(nextStep.id);
    if (!nextNextStep) {
      return { completed: true, step: nextStep.id, nextStep: null };
    }

    return { completed: false, step: nextStep.id, nextStep: nextNextStep.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';

    // Log error but don't fail the entire scan
    await supabase.from('scan_logs').insert({
      scan_id: scanId,
      user_id: userId,
      action: `step_error:${nextStep.id}`,
      details: message,
    });

    // Move to next step despite error
    const nextNextStep = getNextStep(nextStep.id);

    await supabase
      .from('scans')
      .update({ progress: nextStep.progress, current_step: nextStep.id })
      .eq('id', scanId);

    if (!nextNextStep) {
      return { completed: true, step: nextStep.id, nextStep: null };
    }

    return { completed: false, step: nextStep.id, nextStep: nextNextStep.id };
  }
}

// ── Step Implementations ─────────────────────────────────────────────────

async function executeReconStep(domain: string): Promise<FindingInput[]> {
  const url = `https://${domain}`;

  // Run these in parallel as they're independent
  const [sslFindings, headerFindings, corsFindings, techFindings, wafFindings] = await Promise.all([
    checkSsl(domain).catch(() => [] as FindingInput[]),
    analyzeHeaders(url).catch(() => [] as FindingInput[]),
    checkCors(domain).catch(() => [] as FindingInput[]),
    detectTechnology(domain).catch(() => [] as FindingInput[]),
    detectWaf(domain).catch(() => [] as FindingInput[]),
  ]);

  return [...sslFindings, ...headerFindings, ...corsFindings, ...techFindings, ...wafFindings];
}

async function executeEmailStep(domain: string): Promise<FindingInput[]> {
  return checkEmailSecurity(domain).catch(() => [] as FindingInput[]);
}

async function executeDiscoveryStep(
  domain: string,
  scanId: string,
  userId: string,
  supabase: SupabaseAdmin
): Promise<FindingInput[]> {
  // Run subdomain enumeration, DNS security, crawl, and sensitive files in parallel
  const [subdomainFindings, dnsFindings, pages, sensitiveFindings] = await Promise.all([
    enumerateSubdomains(domain).catch(() => [] as FindingInput[]),
    checkDnsSecurity(domain).catch(() => [] as FindingInput[]),
    crawlDomain(domain, 25).catch(() => [] as CrawledPage[]),
    checkSensitiveFiles(domain).catch(() => [] as FindingInput[]),
  ]);

  // Store crawled URLs for use in the analysis step
  const crawledUrls = pages.map((p) => p.url);
  await supabase.from('scan_logs').insert({
    scan_id: scanId,
    user_id: userId,
    action: 'crawl_data',
    details: JSON.stringify(crawledUrls),
  });

  // Add info about crawled pages
  const crawlFindings: FindingInput[] = [];
  if (pages.length > 0) {
    crawlFindings.push({
      category: 'info',
      severity: 'info',
      title: `${pages.length} Seiten gecrawlt`,
      description: `Es wurden ${pages.length} HTML-Seiten auf der Domain gefunden und analysiert.`,
      affected_url: `https://${domain}`,
      recommendation: null,
      details: { urls: crawledUrls.slice(0, 25) },
    });
  }

  return [...subdomainFindings, ...dnsFindings, ...crawlFindings, ...sensitiveFindings];
}

async function executeAnalysisStep(
  domain: string,
  scanId: string,
  userId: string,
  supabase: SupabaseAdmin
): Promise<FindingInput[]> {
  // Retrieve crawled URLs from the crawl step
  const { data: crawlLog } = await supabase
    .from('scan_logs')
    .select('details')
    .eq('scan_id', scanId)
    .eq('action', 'crawl_data')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  let crawledUrls: string[] = [];
  try {
    crawledUrls = JSON.parse(crawlLog?.details || '[]');
  } catch {
    crawledUrls = [];
  }

  // Re-fetch the main page for analysis
  const mainUrl = `https://${domain}`;
  let mainHtml = '';
  try {
    const response = await fetch(mainUrl, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'TestMe-Security-Scanner/1.0' },
      redirect: 'follow',
    });
    mainHtml = await response.text();
  } catch {
    // Continue with empty HTML
  }

  // Run SQL injection, vulnerability, and JS library checks in parallel
  const [vulnFindings, sqliFindings, jsLibFindings] = await Promise.all([
    checkVulnerabilities(domain, mainHtml, mainUrl, crawledUrls).catch(() => [] as FindingInput[]),
    checkSqlInjection(domain, crawledUrls).catch(() => [] as FindingInput[]),
    checkJsLibraries(domain).catch(() => [] as FindingInput[]),
  ]);

  // Run secret scanning on crawled pages (sequential to respect rate limits)
  let secretFindings: FindingInput[] = [];

  // Scan main page
  if (mainHtml) {
    const mainSecrets = await scanForSecrets(mainUrl, mainHtml).catch(() => [] as FindingInput[]);
    secretFindings.push(...mainSecrets);
  }

  // Scan up to 10 additional crawled pages
  const additionalUrls = crawledUrls.filter((u) => u !== mainUrl).slice(0, 10);
  for (const pageUrl of additionalUrls) {
    try {
      const response = await fetch(pageUrl, {
        signal: AbortSignal.timeout(8000),
        headers: { 'User-Agent': 'TestMe-Security-Scanner/1.0' },
        redirect: 'follow',
      });
      if (response.ok) {
        const html = await response.text();
        if (html.length < 2_000_000) {
          const pageSecrets = await scanForSecrets(pageUrl, html).catch(() => [] as FindingInput[]);
          secretFindings.push(...pageSecrets);
        }
      }
    } catch {
      // Skip
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  // Deduplicate secrets
  const seenSecrets = new Set<string>();
  secretFindings = secretFindings.filter((f) => {
    const key = `${f.title}::${(f.details as Record<string, unknown>)?.maskedValue || f.affected_url}`;
    if (seenSecrets.has(key)) return false;
    seenSecrets.add(key);
    return true;
  });

  // Log analysis step
  await supabase.from('scan_logs').insert({
    scan_id: scanId,
    user_id: userId,
    action: 'analysis_complete',
    details: `Vulnerabilities: ${vulnFindings.length}, SQLi: ${sqliFindings.length}, Secrets: ${secretFindings.length}`,
  });

  return [...vulnFindings, ...sqliFindings, ...jsLibFindings, ...secretFindings];
}

async function executeInfrastructureStep(domain: string): Promise<FindingInput[]> {
  // Run infrastructure checks in parallel
  const [rateLimitFindings, hostHeaderFindings, serverInfoFindings] = await Promise.all([
    checkRateLimiting(domain).catch(() => [] as FindingInput[]),
    checkHostHeaderInjection(domain).catch(() => [] as FindingInput[]),
    checkServerInfoLeak(domain).catch(() => [] as FindingInput[]),
  ]);

  return [...rateLimitFindings, ...hostHeaderFindings, ...serverInfoFindings];
}

async function executeScoringStep(
  scanId: string,
  supabase: SupabaseAdmin
): Promise<void> {
  // Get all findings for this scan
  const { data: findings } = await supabase
    .from('scan_findings')
    .select('category, severity, title, description, affected_url, recommendation, details')
    .eq('scan_id', scanId);

  const allFindings = (findings || []) as FindingInput[];

  // Generate compliance report findings
  const complianceFindings = generateComplianceReport(allFindings);

  // Save compliance findings
  if (complianceFindings.length > 0) {
    await supabase
      .from('scan_findings')
      .insert(complianceFindings.map((f) => ({ ...f, scan_id: scanId })));
  }

  // Calculate score including compliance findings
  const finalFindings = [...allFindings, ...complianceFindings];
  const score = calculateScore(finalFindings);
  const summary = generateSummary(finalFindings, score);

  // Update scan with final score and summary
  await supabase
    .from('scans')
    .update({
      status: 'completed',
      progress: 100,
      score,
      summary,
      completed_at: new Date().toISOString(),
    })
    .eq('id', scanId);
}
