// =============================================
// Database Types
// =============================================

export interface Domain {
  id: string;
  user_id: string;
  domain_name: string;
  is_verified: boolean;
  verification_method: VerificationMethod | null;
  verification_token: string;
  last_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export type VerificationMethod = 'dns_txt' | 'html_file';

export interface Scan {
  id: string;
  user_id: string;
  domain_id: string;
  status: ScanStatus;
  consent_given: boolean;
  consent_given_at: string | null;
  progress: number;
  current_step: string | null;
  score: number | null;
  summary: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  domains?: { domain_name: string };
}

export type ScanStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface ScanFinding {
  id: string;
  scan_id: string;
  category: FindingCategory;
  severity: Severity;
  title: string;
  description: string;
  affected_url: string | null;
  recommendation: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export type FindingCategory = 'headers' | 'secrets' | 'sensitive_files' | 'vulnerability' | 'ssl' | 'info' | 'cors' | 'email';

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface ScanLog {
  id: string;
  scan_id: string;
  user_id: string;
  action: string;
  details: string | null;
  created_at: string;
}

// =============================================
// Scanner Types
// =============================================

export interface ScannerResult {
  findings: Omit<ScanFinding, 'id' | 'scan_id' | 'created_at'>[];
  score: number;
  summary: string;
}

export interface CrawlResult {
  url: string;
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  contentType: string;
}

export interface HeaderCheckResult {
  header: string;
  present: boolean;
  value: string | null;
  severity: Severity;
  recommendation: string;
}

// =============================================
// API Types
// =============================================

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
}

export interface DomainFormData {
  domain: string;
}

export interface ScanConsentData {
  domain_id: string;
  consent: boolean;
}
