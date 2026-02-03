export type ScanStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
export type ScanType = 'full' | 'passive' | 'active'
export type Severity = 'low' | 'medium' | 'high' | 'critical'
export type FindingType = 
  | 'sql_injection'
  | 'xss'
  | 'idor'
  | 'exposed_secret'
  | 'exposed_file'
  | 'security_header'
  | 'auth_bypass'
  | 'csrf'
  | 'rate_limit'
  | 'debug_flag'
  | 'framework_leak'

export interface ScanFinding {
  finding_type: FindingType
  severity: Severity
  title: string
  description: string
  affected_url: string
  affected_parameter?: string
  proof_of_concept?: string
  impact: string
  recommendation: string
  owasp_category?: string
  cwe_id?: string
}

export interface ScanContext {
  scanId: string
  domain: string
  userId: string
  baseUrl: string
  discoveredUrls: Set<string>
  findings: ScanFinding[]
  cookies?: string[]
  headers?: Record<string, string>
}

export interface ScanProgress {
  stage: string
  percentage: number
  message: string
}
