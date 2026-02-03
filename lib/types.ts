export type ScanStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface Domain {
  id: string;
  user_id: string;
  domain: string;
  verified: boolean;
  verification_method?: 'dns_txt' | 'html_file';
  verification_token?: string;
  verified_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Scan {
  id: string;
  domain_id: string;
  user_id: string;
  status: ScanStatus;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface Vulnerability {
  id: string;
  scan_id: string;
  type: string;
  severity: Severity;
  title: string;
  description: string;
  affected_url?: string;
  recommendation: string;
  created_at: string;
}

export interface ScanResult {
  scan: Scan;
  vulnerabilities: Vulnerability[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
    security_score: number;
  };
}
