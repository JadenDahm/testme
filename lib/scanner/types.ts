/**
 * Scanner Type Definitions
 * Zentrale Typen für das modulare Scanning-System
 */

export type ScanStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
export type ScanType = 'passive' | 'active' | 'full'
export type Severity = 'low' | 'medium' | 'high' | 'critical'

export interface ScanFinding {
  finding_type: string
  severity: Severity
  title: string
  description: string
  affected_url?: string
  affected_parameter?: string
  proof_of_concept?: string
  impact: string
  remediation: string
  owasp_category?: string
  cwe_id?: string
  metadata?: Record<string, unknown>
}

export interface ScanContext {
  scanId: string
  domain: string
  userId: string
  scanType: ScanType
  authenticated?: {
    cookies?: string[]
    headers?: Record<string, string>
  }
}

export interface ScanProgress {
  stage: string
  progress: number
  message?: string
}

export interface ScannerModule {
  name: string
  description: string
  run(context: ScanContext, onProgress?: (progress: ScanProgress) => Promise<void>): Promise<ScanFinding[]>
}
