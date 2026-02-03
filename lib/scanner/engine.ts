/**
 * Scanner Engine
 * Orchestriert alle Scanner-Module
 */

import { ScanContext, ScanFinding, ScanProgress, ScannerModule } from './types'
import { DiscoveryScanner } from './discovery'
import { PassiveScanner } from './passive'
import { ActiveScanner } from './active'
import { createServiceClient } from '@/lib/supabase/server'

export class ScannerEngine {
  private modules: ScannerModule[] = []
  private discoveryScanner: DiscoveryScanner

  constructor() {
    this.discoveryScanner = new DiscoveryScanner()
    this.modules = [
      this.discoveryScanner,
      new PassiveScanner(),
      new ActiveScanner(),
    ]
  }

  async runScan(
    context: ScanContext,
    onProgress?: (progress: ScanProgress) => Promise<void>
  ): Promise<ScanFinding[]> {
    const allFindings: ScanFinding[] = []

    // 1. Discovery Phase
    await onProgress?.({
      stage: 'discovery',
      progress: 0,
      message: 'Starte Discovery...',
    })

    await this.discoveryScanner.run(context, onProgress)
    const foundUrls = this.discoveryScanner.getFoundUrls()
    const foundEndpoints = this.discoveryScanner.getFoundEndpoints()

    await onProgress?.({
      stage: 'discovery',
      progress: 100,
      message: `Discovery abgeschlossen: ${foundUrls.length} URLs, ${foundEndpoints.length} Endpunkte`,
    })

    // 2. Passive Scans (immer ausführen)
    if (context.scanType === 'passive' || context.scanType === 'full') {
      const passiveScanner = new PassiveScanner()
      const passiveFindings = await passiveScanner.run(context, onProgress)
      allFindings.push(...passiveFindings)
    }

    // 3. Active Scans (nur für verifizierte Domains)
    // Note: Domain verification is checked before scan starts in scan.ts
    if (context.scanType === 'active' || context.scanType === 'full') {
      const activeScanner = new ActiveScanner()
      const activeFindings = await activeScanner.run(context, onProgress)
      allFindings.push(...activeFindings)
    }

    return allFindings
  }

  private async logScanEvent(
    scanId: string,
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    metadata?: Record<string, unknown>
  ) {
    try {
      const supabase = await createServiceClient()
      await supabase.from('scan_logs').insert({
        scan_id: scanId,
        log_level: level,
        message,
        metadata: metadata || {},
      })
    } catch (error) {
      console.error('Scan log error:', error)
    }
  }
}
