export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          subscription_tier: 'free' | 'pro' | 'enterprise'
          scan_quota: number
          scans_used: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          subscription_tier?: 'free' | 'pro' | 'enterprise'
          scan_quota?: number
          scans_used?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          subscription_tier?: 'free' | 'pro' | 'enterprise'
          scan_quota?: number
          scans_used?: number
          created_at?: string
          updated_at?: string
        }
      }
      domains: {
        Row: {
          id: string
          user_id: string
          domain: string
          normalized_domain: string
          verification_status: 'pending' | 'verified' | 'failed' | 'expired'
          verification_method: 'dns_txt' | 'html_file' | null
          verification_token: string | null
          verified_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          domain: string
          normalized_domain: string
          verification_status?: 'pending' | 'verified' | 'failed' | 'expired'
          verification_method?: 'dns_txt' | 'html_file' | null
          verification_token?: string | null
          verified_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          domain?: string
          normalized_domain?: string
          verification_status?: 'pending' | 'verified' | 'failed' | 'expired'
          verification_method?: 'dns_txt' | 'html_file' | null
          verification_token?: string | null
          verified_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      scans: {
        Row: {
          id: string
          user_id: string
          domain_id: string
          status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
          scan_type: 'passive' | 'active' | 'full'
          progress: number
          started_at: string | null
          completed_at: string | null
          error_message: string | null
          security_score: number | null
          total_findings: number
          critical_count: number
          high_count: number
          medium_count: number
          low_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          domain_id: string
          status?: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
          scan_type?: 'passive' | 'active' | 'full'
          progress?: number
          started_at?: string | null
          completed_at?: string | null
          error_message?: string | null
          security_score?: number | null
          total_findings?: number
          critical_count?: number
          high_count?: number
          medium_count?: number
          low_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          domain_id?: string
          status?: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
          scan_type?: 'passive' | 'active' | 'full'
          progress?: number
          started_at?: string | null
          completed_at?: string | null
          error_message?: string | null
          security_score?: number | null
          total_findings?: number
          critical_count?: number
          high_count?: number
          medium_count?: number
          low_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      scan_findings: {
        Row: {
          id: string
          scan_id: string
          finding_type: string
          severity: 'low' | 'medium' | 'high' | 'critical'
          title: string
          description: string
          affected_url: string | null
          affected_parameter: string | null
          proof_of_concept: string | null
          impact: string
          remediation: string
          owasp_category: string | null
          cwe_id: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          scan_id: string
          finding_type: string
          severity: 'low' | 'medium' | 'high' | 'critical'
          title: string
          description: string
          affected_url?: string | null
          affected_parameter?: string | null
          proof_of_concept?: string | null
          impact: string
          remediation: string
          owasp_category?: string | null
          cwe_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          scan_id?: string
          finding_type?: string
          severity?: 'low' | 'medium' | 'high' | 'critical'
          title?: string
          description?: string
          affected_url?: string | null
          affected_parameter?: string | null
          proof_of_concept?: string | null
          impact?: string
          remediation?: string
          owasp_category?: string | null
          cwe_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
      }
    }
  }
}
