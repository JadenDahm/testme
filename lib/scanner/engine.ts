import { createClient } from '@/lib/supabase/server'
import { DiscoveryEngine } from './discovery'
import { PassiveScanner } from './passive'
import { ActiveScanner } from './active'
import { ScanContext, ScanFinding, ScanProgress, ScanStatus } from './types'

/**
 * Main Scanning Engine
 * 
 * Orchestrates discovery, passive, and active scanning modules
 * Ensures all scans are safe and non-destructive
 */
export class ScanEngine {
  private context: ScanContext
  private findings: ScanFinding[] = []

  constructor(
    scanId: string,
    domain: string,
    userId: string,
    baseUrl: string,
    cookies?: string[],
    headers?: Record<string, string>
  ) {
    this.context = {
      scanId,
      domain,
      userId,
      baseUrl,
      discoveredUrls: new Set(),
      findings: [],
      cookies,
      headers,
    }
  }

  /**
   * Run complete security scan
   */
  async run(scanType: 'full' | 'passive' | 'active'): Promise<ScanFinding[]> {
    const supabase = await createClient()

    try {
      // Update scan status to running
      await supabase
        .from('scans')
        .update({
          status: 'running',
          started_at: new Date().toISOString(),
        } as any)
        .eq('id', this.context.scanId)

      // Log scan start
      await this.log('info', 'Scan started', { scanType })

      // Step 1: Discovery
      if (scanType === 'full' || scanType === 'active') {
        await this.updateProgress(10, 'Discovering URLs...')
        const discovery = new DiscoveryEngine(
          this.context,
          (progress) => this.updateProgress(10 + Math.round(progress.percentage * 0.3), progress.message)
        )
        await discovery.discover()
        await this.log('info', `Discovery complete: ${this.context.discoveredUrls.size} URLs found`)
      } else {
        // For passive-only scans, just add the base URL
        this.context.discoveredUrls.add(this.context.baseUrl)
      }

      // Step 2: Passive Scanning (always safe)
      await this.updateProgress(40, 'Running passive security analysis...')
      const passiveScanner = new PassiveScanner(
        this.context,
        (progress) => this.updateProgress(40 + Math.round(progress.percentage * 0.3), progress.message)
      )
      const passiveFindings = await passiveScanner.scan()
      this.findings.push(...passiveFindings)
      await this.log('info', `Passive scan complete: ${passiveFindings.length} findings`)

      // Step 3: Active Scanning (only if requested and domain is verified)
      if (scanType === 'full' || scanType === 'active') {
        // Get domain_id from scan record
        const { data: scanData } = await supabase
          .from('scans')
          .select('domain_id')
          .eq('id', this.context.scanId)
          .single()

        if (scanData) {
          // Verify domain is verified before active scanning
          const { data: domainData } = await supabase
            .from('domains')
            .select('is_verified')
            .eq('id', (scanData as any).domain_id)
            .single()

          if (!(domainData as any)?.is_verified) {
            await this.log('warning', 'Active scanning skipped: Domain not verified')
          } else {
            await this.updateProgress(70, 'Running active vulnerability tests (read-only)...')
            const activeScanner = new ActiveScanner(
              this.context,
              (progress) => this.updateProgress(70 + Math.round(progress.percentage * 0.3), progress.message)
            )
            const activeFindings = await activeScanner.scan()
            this.findings.push(...activeFindings)
            await this.log('info', `Active scan complete: ${activeFindings.length} findings`)
          }
        }
      }

      // Calculate security score
      const securityScore = this.calculateSecurityScore()

      // Count findings by severity
      const counts = this.countFindingsBySeverity()

      // Save findings to database
      await this.saveFindings()

      // Update scan status
      await supabase
        .from('scans')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          progress_percentage: 100,
          security_score: securityScore,
          total_findings: this.findings.length,
          critical_count: counts.critical,
          high_count: counts.high,
          medium_count: counts.medium,
          low_count: counts.low,
        } as any)
        .eq('id', this.context.scanId)

      await this.log('info', 'Scan completed successfully', {
        totalFindings: this.findings.length,
        securityScore,
      })

      return this.findings
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      await supabase
        .from('scans')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: errorMessage,
        } as any)
        .eq('id', this.context.scanId)

      await this.log('error', 'Scan failed', { error: errorMessage })
      throw error
    }
  }

  /**
   * Calculate security score (0-100)
   */
  private calculateSecurityScore(): number {
    if (this.findings.length === 0) return 100

    let score = 100
    for (const finding of this.findings) {
      switch (finding.severity) {
        case 'critical':
          score -= 20
          break
        case 'high':
          score -= 10
          break
        case 'medium':
          score -= 5
          break
        case 'low':
          score -= 2
          break
      }
    }

    return Math.max(0, score)
  }

  /**
   * Count findings by severity
   */
  private countFindingsBySeverity() {
    return {
      critical: this.findings.filter(f => f.severity === 'critical').length,
      high: this.findings.filter(f => f.severity === 'high').length,
      medium: this.findings.filter(f => f.severity === 'medium').length,
      low: this.findings.filter(f => f.severity === 'low').length,
    }
  }

  /**
   * Save findings to database
   */
  private async saveFindings(): Promise<void> {
    const supabase = await createClient()

    if (this.findings.length === 0) return

    const findingsToInsert = this.findings.map(finding => ({
      scan_id: this.context.scanId,
      ...finding,
    }))

    const { error } = await supabase
      .from('scan_findings')
      .insert(findingsToInsert as any)

    if (error) {
      throw new Error(`Failed to save findings: ${error.message}`)
    }
  }

  /**
   * Update scan progress
   */
  private async updateProgress(percentage: number, message: string): Promise<void> {
    const supabase = await createClient()
    await supabase
      .from('scans')
      .update({
        progress_percentage: Math.min(100, percentage),
      } as any)
      .eq('id', this.context.scanId)
  }

  /**
   * Log scan event
   */
  private async log(level: 'info' | 'warning' | 'error', message: string, metadata?: Record<string, any>): Promise<void> {
    const supabase = await createClient()
    await supabase
      .from('scan_logs')
      .insert({
        scan_id: this.context.scanId,
        log_level: level,
        message,
        metadata: metadata || null,
      } as any)
  }

  /**
   * Cancel running scan
   */
  async cancel(): Promise<void> {
    const supabase = await createClient()
    await supabase
      .from('scans')
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString(),
      } as any)
      .eq('id', this.context.scanId)
    
    await this.log('info', 'Scan cancelled by user')
  }
}
