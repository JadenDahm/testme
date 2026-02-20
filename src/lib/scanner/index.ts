import { createClient } from '@supabase/supabase-js';
import { analyzeHeaders } from './headers';
import { checkSensitiveFiles } from './sensitive-files';
import { scanForSecrets } from './secrets';
import { checkVulnerabilities } from './vulnerability';
import { checkSsl } from './ssl';
import { crawlDomain } from './crawler';
import { calculateScore, generateSummary } from './scoring';
import type { ScanFinding } from '@/types';

type FindingInput = Omit<ScanFinding, 'id' | 'scan_id' | 'created_at'>;

interface ScanOptions {
  scanId: string;
  domain: string;
  userId: string;
  supabaseUrl: string;
  supabaseServiceKey: string;
}

export async function runScan(options: ScanOptions): Promise<void> {
  const { scanId, domain, userId, supabaseUrl, supabaseServiceKey } = options;

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const allFindings: FindingInput[] = [];

  const updateProgress = async (progress: number, step: string) => {
    await supabase
      .from('scans')
      .update({ progress, current_step: step })
      .eq('id', scanId);
  };

  const logAction = async (action: string, details?: string) => {
    await supabase.from('scan_logs').insert({
      scan_id: scanId,
      user_id: userId,
      action,
      details,
    });
  };

  try {
    // Start scan
    await supabase
      .from('scans')
      .update({ status: 'running', started_at: new Date().toISOString() })
      .eq('id', scanId);

    await logAction('scan_started', `Scan für ${domain} gestartet`);

    // Check if scan was cancelled
    const checkCancelled = async (): Promise<boolean> => {
      const { data } = await supabase
        .from('scans')
        .select('status')
        .eq('id', scanId)
        .single();
      return data?.status === 'cancelled';
    };

    // Step 1: SSL Check (5%)
    await updateProgress(5, 'SSL/TLS-Prüfung');
    await logAction('step_started', 'SSL/TLS-Prüfung');
    const sslFindings = await checkSsl(domain);
    allFindings.push(...sslFindings);

    if (await checkCancelled()) {
      await logAction('scan_cancelled', 'Scan wurde vom Nutzer abgebrochen');
      return;
    }

    // Step 2: HTTP Header Analysis (15%)
    await updateProgress(15, 'HTTP-Header-Analyse');
    await logAction('step_started', 'HTTP-Header-Analyse');
    const headerFindings = await analyzeHeaders(`https://${domain}`);
    allFindings.push(...headerFindings);

    if (await checkCancelled()) {
      await logAction('scan_cancelled', 'Scan wurde vom Nutzer abgebrochen');
      return;
    }

    // Step 3: Sensitive Files Check (30%)
    await updateProgress(30, 'Prüfung auf sensible Dateien');
    await logAction('step_started', 'Prüfung auf sensible Dateien');
    const sensitiveFileFindings = await checkSensitiveFiles(domain);
    allFindings.push(...sensitiveFileFindings);

    if (await checkCancelled()) {
      await logAction('scan_cancelled', 'Scan wurde vom Nutzer abgebrochen');
      return;
    }

    // Step 4: Crawl Pages (50%)
    await updateProgress(40, 'Seiten-Crawling');
    await logAction('step_started', 'Seiten-Crawling');
    const pages = await crawlDomain(domain, 15, async (current, total) => {
      const progress = 40 + Math.round((current / total) * 15);
      await updateProgress(progress, `Crawling: ${current}/${total} Seiten`);
    });
    await logAction('step_completed', `${pages.length} Seiten gecrawlt`);

    if (await checkCancelled()) {
      await logAction('scan_cancelled', 'Scan wurde vom Nutzer abgebrochen');
      return;
    }

    // Step 5: Secret Scanning (70%)
    await updateProgress(60, 'Suche nach exponierten Secrets');
    await logAction('step_started', 'Secret-Scanning');
    for (const page of pages) {
      const secretFindings = await scanForSecrets(page.url, page.html);
      allFindings.push(...secretFindings);
    }

    if (await checkCancelled()) {
      await logAction('scan_cancelled', 'Scan wurde vom Nutzer abgebrochen');
      return;
    }

    // Step 6: Vulnerability Checks (85%)
    await updateProgress(75, 'Schwachstellen-Tests');
    await logAction('step_started', 'Schwachstellen-Tests');
    for (const page of pages.slice(0, 5)) {
      const vulnFindings = await checkVulnerabilities(domain, page.html, page.url);
      allFindings.push(...vulnFindings);
    }

    if (await checkCancelled()) {
      await logAction('scan_cancelled', 'Scan wurde vom Nutzer abgebrochen');
      return;
    }

    // Step 7: Calculate Score & Generate Report (95%)
    await updateProgress(95, 'Bericht wird erstellt');
    await logAction('step_started', 'Report-Erstellung');

    // Deduplicate findings by title + affected_url
    const deduped = deduplicateFindings(allFindings);

    const score = calculateScore(deduped);
    const summary = generateSummary(deduped, score);

    // Save findings
    if (deduped.length > 0) {
      const findingsToInsert = deduped.map((f) => ({
        scan_id: scanId,
        ...f,
      }));

      // Insert in batches
      for (let i = 0; i < findingsToInsert.length; i += 50) {
        const batch = findingsToInsert.slice(i, i + 50);
        await supabase.from('scan_findings').insert(batch);
      }
    }

    // Complete scan
    await supabase
      .from('scans')
      .update({
        status: 'completed',
        progress: 100,
        current_step: 'Abgeschlossen',
        score,
        summary,
        completed_at: new Date().toISOString(),
      })
      .eq('id', scanId);

    await logAction('scan_completed', `Scan abgeschlossen. Score: ${score}/100, ${deduped.length} Findings`);

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';

    await supabase
      .from('scans')
      .update({
        status: 'failed',
        current_step: `Fehler: ${message}`,
        completed_at: new Date().toISOString(),
      })
      .eq('id', scanId);

    await logAction('scan_failed', message);
  }
}

function deduplicateFindings(findings: FindingInput[]): FindingInput[] {
  const seen = new Set<string>();
  return findings.filter((f) => {
    const key = `${f.title}|${f.affected_url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
