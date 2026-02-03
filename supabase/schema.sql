-- Security Scanner SaaS - Database Schema
-- Execute this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
-- We'll use Supabase auth for authentication, this table stores additional profile data
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  scan_limit_per_hour INTEGER DEFAULT 10 NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL
);

-- Domains table
CREATE TABLE IF NOT EXISTS public.domains (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  domain TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT false NOT NULL,
  verification_method TEXT, -- 'dns_txt' or 'html_file'
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, domain)
);

-- Domain verifications table (stores verification attempts and tokens)
CREATE TABLE IF NOT EXISTS public.domain_verifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  domain_id UUID REFERENCES public.domains(id) ON DELETE CASCADE NOT NULL,
  verification_token TEXT NOT NULL,
  verification_method TEXT NOT NULL, -- 'dns_txt' or 'html_file'
  verified BOOLEAN DEFAULT false NOT NULL,
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Scans table
CREATE TABLE IF NOT EXISTS public.scans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  domain_id UUID REFERENCES public.domains(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued', -- 'queued', 'running', 'completed', 'failed', 'cancelled'
  scan_type TEXT NOT NULL DEFAULT 'full', -- 'full', 'passive', 'active'
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  progress_percentage INTEGER DEFAULT 0 NOT NULL,
  security_score INTEGER, -- 0-100
  total_findings INTEGER DEFAULT 0 NOT NULL,
  critical_count INTEGER DEFAULT 0 NOT NULL,
  high_count INTEGER DEFAULT 0 NOT NULL,
  medium_count INTEGER DEFAULT 0 NOT NULL,
  low_count INTEGER DEFAULT 0 NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Scan findings table
CREATE TABLE IF NOT EXISTS public.scan_findings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  scan_id UUID REFERENCES public.scans(id) ON DELETE CASCADE NOT NULL,
  finding_type TEXT NOT NULL, -- 'sql_injection', 'xss', 'idor', 'exposed_secret', etc.
  severity TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  affected_url TEXT NOT NULL,
  affected_parameter TEXT,
  proof_of_concept TEXT,
  impact TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  owasp_category TEXT, -- OWASP Top 10 mapping
  cwe_id TEXT, -- Common Weakness Enumeration ID
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Scan logs table (audit trail)
CREATE TABLE IF NOT EXISTS public.scan_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  scan_id UUID REFERENCES public.scans(id) ON DELETE CASCADE NOT NULL,
  log_level TEXT NOT NULL, -- 'info', 'warning', 'error'
  message TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Scan queue table (for background job processing)
CREATE TABLE IF NOT EXISTS public.scan_queue (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  scan_id UUID REFERENCES public.scans(id) ON DELETE CASCADE NOT NULL,
  priority INTEGER DEFAULT 0 NOT NULL,
  scheduled_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  retry_count INTEGER DEFAULT 0 NOT NULL,
  max_retries INTEGER DEFAULT 3 NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Rate limiting table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  resource_type TEXT NOT NULL, -- 'scan', 'verification', etc.
  count INTEGER DEFAULT 1 NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, resource_type, window_start)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_domains_user_id ON public.domains(user_id);
CREATE INDEX IF NOT EXISTS idx_domains_domain ON public.domains(domain);
CREATE INDEX IF NOT EXISTS idx_scans_domain_id ON public.scans(domain_id);
CREATE INDEX IF NOT EXISTS idx_scans_user_id ON public.scans(user_id);
CREATE INDEX IF NOT EXISTS idx_scans_status ON public.scans(status);
CREATE INDEX IF NOT EXISTS idx_scan_findings_scan_id ON public.scan_findings(scan_id);
CREATE INDEX IF NOT EXISTS idx_scan_findings_severity ON public.scan_findings(severity);
CREATE INDEX IF NOT EXISTS idx_scan_logs_scan_id ON public.scan_logs(scan_id);
CREATE INDEX IF NOT EXISTS idx_scan_queue_status ON public.scan_queue(status);
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_id ON public.rate_limits(user_id);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domain_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Domains policies
CREATE POLICY "Users can view own domains"
  ON public.domains FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own domains"
  ON public.domains FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own domains"
  ON public.domains FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own domains"
  ON public.domains FOR DELETE
  USING (auth.uid() = user_id);

-- Domain verifications policies
CREATE POLICY "Users can view own domain verifications"
  ON public.domain_verifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.domains
      WHERE domains.id = domain_verifications.domain_id
      AND domains.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own domain verifications"
  ON public.domain_verifications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.domains
      WHERE domains.id = domain_verifications.domain_id
      AND domains.user_id = auth.uid()
    )
  );

-- Scans policies
CREATE POLICY "Users can view own scans"
  ON public.scans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scans"
  ON public.scans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scans"
  ON public.scans FOR UPDATE
  USING (auth.uid() = user_id);

-- Scan findings policies
CREATE POLICY "Users can view own scan findings"
  ON public.scan_findings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.scans
      WHERE scans.id = scan_findings.scan_id
      AND scans.user_id = auth.uid()
    )
  );

-- Scan logs policies
CREATE POLICY "Users can view own scan logs"
  ON public.scan_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.scans
      WHERE scans.id = scan_logs.scan_id
      AND scans.user_id = auth.uid()
    )
  );

-- Scan queue policies (service role only, but users can view their own)
CREATE POLICY "Users can view own scan queue"
  ON public.scan_queue FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.scans
      WHERE scans.id = scan_queue.scan_id
      AND scans.user_id = auth.uid()
    )
  );

-- Rate limits policies
CREATE POLICY "Users can view own rate limits"
  ON public.rate_limits FOR SELECT
  USING (auth.uid() = user_id);

-- Functions

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_domains_updated_at BEFORE UPDATE ON public.domains
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scans_updated_at BEFORE UPDATE ON public.scans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
