-- =============================================
-- TestMe - Database Schema
-- =============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =============================================
-- Domains Table
-- =============================================
create table public.domains (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  domain_name text not null,
  verification_method text, -- 'dns_txt' | 'html_file'
  verification_token text not null,
  is_verified boolean default false,
  last_verified_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  
  unique(user_id, domain_name)
);

-- =============================================
-- Scans Table
-- =============================================
create table public.scans (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  domain_id uuid references public.domains(id) on delete cascade not null,
  status text default 'pending' not null check (status in ('pending', 'running', 'completed', 'failed', 'cancelled')),
  consent_given boolean default false not null,
  consent_given_at timestamptz,
  progress integer default 0 check (progress >= 0 and progress <= 100),
  current_step text,
  score integer check (score >= 0 and score <= 100),
  summary text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- =============================================
-- Scan Findings Table
-- =============================================
create table public.scan_findings (
  id uuid default uuid_generate_v4() primary key,
  scan_id uuid references public.scans(id) on delete cascade not null,
  category text not null, -- 'headers' | 'secrets' | 'sensitive_files' | 'vulnerability' | 'ssl' | 'info'
  severity text not null check (severity in ('critical', 'high', 'medium', 'low', 'info')),
  title text not null,
  description text not null,
  affected_url text,
  recommendation text,
  details jsonb,
  created_at timestamptz default now() not null
);

-- =============================================
-- Scan Logs Table
-- =============================================
create table public.scan_logs (
  id uuid default uuid_generate_v4() primary key,
  scan_id uuid references public.scans(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  action text not null,
  details text,
  created_at timestamptz default now() not null
);

-- =============================================
-- Row Level Security Policies
-- =============================================

-- Enable RLS on all tables
alter table public.domains enable row level security;
alter table public.scans enable row level security;
alter table public.scan_findings enable row level security;
alter table public.scan_logs enable row level security;

-- Domains: Users can only access their own domains
create policy "Users can view own domains"
  on public.domains for select
  using (auth.uid() = user_id);

create policy "Users can insert own domains"
  on public.domains for insert
  with check (auth.uid() = user_id);

create policy "Users can update own domains"
  on public.domains for update
  using (auth.uid() = user_id);

create policy "Users can delete own domains"
  on public.domains for delete
  using (auth.uid() = user_id);

-- Scans: Users can only access their own scans
create policy "Users can view own scans"
  on public.scans for select
  using (auth.uid() = user_id);

create policy "Users can insert own scans"
  on public.scans for insert
  with check (auth.uid() = user_id);

create policy "Users can update own scans"
  on public.scans for update
  using (auth.uid() = user_id);

-- Scan Findings: Users can view findings of their own scans
create policy "Users can view own scan findings"
  on public.scan_findings for select
  using (
    exists (
      select 1 from public.scans
      where scans.id = scan_findings.scan_id
      and scans.user_id = auth.uid()
    )
  );

-- Scan Logs: Users can view logs of their own scans
create policy "Users can view own scan logs"
  on public.scan_logs for select
  using (auth.uid() = user_id);

-- =============================================
-- Indexes
-- =============================================
create index idx_domains_user_id on public.domains(user_id);
create index idx_domains_domain_name on public.domains(domain_name);
create index idx_scans_user_id on public.scans(user_id);
create index idx_scans_domain_id on public.scans(domain_id);
create index idx_scans_status on public.scans(status);
create index idx_scan_findings_scan_id on public.scan_findings(scan_id);
create index idx_scan_findings_severity on public.scan_findings(severity);
create index idx_scan_logs_scan_id on public.scan_logs(scan_id);

-- =============================================
-- Updated At Trigger
-- =============================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger handle_domains_updated_at
  before update on public.domains
  for each row execute function public.handle_updated_at();

create trigger handle_scans_updated_at
  before update on public.scans
  for each row execute function public.handle_updated_at();
