-- =============================================
-- TestMe - Complete Database Setup
-- =============================================
-- This script creates all tables from scratch.
-- Use this if your database is empty or you want to start fresh.
-- 
-- WARNING: This will fail if tables already exist!
-- If tables exist, use migration.sql instead.
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- Domains Table
-- =============================================
CREATE TABLE IF NOT EXISTS public.domains (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  domain_name text NOT NULL,
  verification_method text, -- 'dns_txt' | 'html_file'
  verification_token text NOT NULL,
  is_verified boolean DEFAULT false,
  last_verified_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  
  UNIQUE(user_id, domain_name)
);

-- =============================================
-- Scans Table
-- =============================================
CREATE TABLE IF NOT EXISTS public.scans (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  domain_id uuid REFERENCES public.domains(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  consent_given boolean DEFAULT false NOT NULL,
  consent_given_at timestamptz,
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  current_step text,
  score integer CHECK (score >= 0 AND score <= 100),
  summary text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- =============================================
-- Scan Findings Table
-- =============================================
CREATE TABLE IF NOT EXISTS public.scan_findings (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  scan_id uuid REFERENCES public.scans(id) ON DELETE CASCADE NOT NULL,
  category text NOT NULL, -- 'headers' | 'secrets' | 'sensitive_files' | 'vulnerability' | 'ssl' | 'info'
  severity text NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
  title text NOT NULL,
  description text NOT NULL,
  affected_url text,
  recommendation text,
  details jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- =============================================
-- Scan Logs Table
-- =============================================
CREATE TABLE IF NOT EXISTS public.scan_logs (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  scan_id uuid REFERENCES public.scans(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action text NOT NULL,
  details text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- =============================================
-- Row Level Security Policies
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_logs ENABLE ROW LEVEL SECURITY;

-- Domains: Users can only access their own domains
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'domains' 
    AND policyname = 'Users can view own domains'
  ) THEN
    CREATE POLICY "Users can view own domains"
      ON public.domains FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'domains' 
    AND policyname = 'Users can insert own domains'
  ) THEN
    CREATE POLICY "Users can insert own domains"
      ON public.domains FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'domains' 
    AND policyname = 'Users can update own domains'
  ) THEN
    CREATE POLICY "Users can update own domains"
      ON public.domains FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'domains' 
    AND policyname = 'Users can delete own domains'
  ) THEN
    CREATE POLICY "Users can delete own domains"
      ON public.domains FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Scans: Users can only access their own scans
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'scans' 
    AND policyname = 'Users can view own scans'
  ) THEN
    CREATE POLICY "Users can view own scans"
      ON public.scans FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'scans' 
    AND policyname = 'Users can insert own scans'
  ) THEN
    CREATE POLICY "Users can insert own scans"
      ON public.scans FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'scans' 
    AND policyname = 'Users can update own scans'
  ) THEN
    CREATE POLICY "Users can update own scans"
      ON public.scans FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'scans' 
    AND policyname = 'Users can delete own scans'
  ) THEN
    CREATE POLICY "Users can delete own scans"
      ON public.scans FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Scan Findings: Users can view findings of their own scans
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'scan_findings' 
    AND policyname = 'Users can view own scan findings'
  ) THEN
    CREATE POLICY "Users can view own scan findings"
      ON public.scan_findings FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.scans
          WHERE scans.id = scan_findings.scan_id
          AND scans.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Scan Logs: Users can view logs of their own scans
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'scan_logs' 
    AND policyname = 'Users can view own scan logs'
  ) THEN
    CREATE POLICY "Users can view own scan logs"
      ON public.scan_logs FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- =============================================
-- Indexes
-- =============================================
CREATE INDEX IF NOT EXISTS idx_domains_user_id ON public.domains(user_id);
CREATE INDEX IF NOT EXISTS idx_domains_domain_name ON public.domains(domain_name);
CREATE INDEX IF NOT EXISTS idx_scans_user_id ON public.scans(user_id);
CREATE INDEX IF NOT EXISTS idx_scans_domain_id ON public.scans(domain_id);
CREATE INDEX IF NOT EXISTS idx_scans_status ON public.scans(status);
CREATE INDEX IF NOT EXISTS idx_scan_findings_scan_id ON public.scan_findings(scan_id);
CREATE INDEX IF NOT EXISTS idx_scan_findings_severity ON public.scan_findings(severity);
CREATE INDEX IF NOT EXISTS idx_scan_logs_scan_id ON public.scan_logs(scan_id);

-- =============================================
-- Updated At Trigger
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS handle_domains_updated_at ON public.domains;
CREATE TRIGGER handle_domains_updated_at
  BEFORE UPDATE ON public.domains
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_scans_updated_at ON public.scans;
CREATE TRIGGER handle_scans_updated_at
  BEFORE UPDATE ON public.scans
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
