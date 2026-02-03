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
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          created_at: string
          updated_at: string
          scan_limit_per_hour: number
          is_active: boolean
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          created_at?: string
          updated_at?: string
          scan_limit_per_hour?: number
          is_active?: boolean
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          created_at?: string
          updated_at?: string
          scan_limit_per_hour?: number
          is_active?: boolean
        }
      }
      domains: {
        Row: {
          id: string
          user_id: string
          domain: string
          is_verified: boolean
          verification_method: string | null
          verified_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          domain: string
          is_verified?: boolean
          verification_method?: string | null
          verified_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          domain?: string
          is_verified?: boolean
          verification_method?: string | null
          verified_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      domain_verifications: {
        Row: {
          id: string
          domain_id: string
          verification_token: string
          verification_method: string
          verified: boolean
          verified_at: string | null
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          domain_id: string
          verification_token: string
          verification_method: string
          verified?: boolean
          verified_at?: string | null
          expires_at: string
          created_at?: string
        }
        Update: {
          id?: string
          domain_id?: string
          verification_token?: string
          verification_method?: string
          verified?: boolean
          verified_at?: string | null
          expires_at?: string
          created_at?: string
        }
      }
      scans: {
        Row: {
          id: string
          domain_id: string
          user_id: string
          status: string
          scan_type: string
          started_at: string | null
          completed_at: string | null
          progress_percentage: number
          security_score: number | null
          total_findings: number
          critical_count: number
          high_count: number
          medium_count: number
          low_count: number
          error_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          domain_id: string
          user_id: string
          status?: string
          scan_type?: string
          started_at?: string | null
          completed_at?: string | null
          progress_percentage?: number
          security_score?: number | null
          total_findings?: number
          critical_count?: number
          high_count?: number
          medium_count?: number
          low_count?: number
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          domain_id?: string
          user_id?: string
          status?: string
          scan_type?: string
          started_at?: string | null
          completed_at?: string | null
          progress_percentage?: number
          security_score?: number | null
          total_findings?: number
          critical_count?: number
          high_count?: number
          medium_count?: number
          low_count?: number
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      scan_findings: {
        Row: {
          id: string
          scan_id: string
          finding_type: string
          severity: string
          title: string
          description: string
          affected_url: string
          affected_parameter: string | null
          proof_of_concept: string | null
          impact: string
          recommendation: string
          owasp_category: string | null
          cwe_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          scan_id: string
          finding_type: string
          severity: string
          title: string
          description: string
          affected_url: string
          affected_parameter?: string | null
          proof_of_concept?: string | null
          impact: string
          recommendation: string
          owasp_category?: string | null
          cwe_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          scan_id?: string
          finding_type?: string
          severity?: string
          title?: string
          description?: string
          affected_url?: string
          affected_parameter?: string | null
          proof_of_concept?: string | null
          impact?: string
          recommendation?: string
          owasp_category?: string | null
          cwe_id?: string | null
          created_at?: string
        }
      }
      scan_logs: {
        Row: {
          id: string
          scan_id: string
          log_level: string
          message: string
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          scan_id: string
          log_level: string
          message: string
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          scan_id?: string
          log_level?: string
          message?: string
          metadata?: Json | null
          created_at?: string
        }
      }
      scan_queue: {
        Row: {
          id: string
          scan_id: string
          priority: number
          scheduled_at: string
          started_at: string | null
          completed_at: string | null
          retry_count: number
          max_retries: number
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          scan_id: string
          priority?: number
          scheduled_at?: string
          started_at?: string | null
          completed_at?: string | null
          retry_count?: number
          max_retries?: number
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          scan_id?: string
          priority?: number
          scheduled_at?: string
          started_at?: string | null
          completed_at?: string | null
          retry_count?: number
          max_retries?: number
          status?: string
          created_at?: string
        }
      }
      rate_limits: {
        Row: {
          id: string
          user_id: string
          resource_type: string
          count: number
          window_start: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          resource_type: string
          count?: number
          window_start: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          resource_type?: string
          count?: number
          window_start?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
