-- =============================================
-- Migration: Rename columns to match new schema
-- =============================================
-- This migration renames the old column names to the new ones:
-- - domain -> domain_name
-- - verified -> is_verified
-- - verified_at -> last_verified_at
--
-- IMPORTANT: If you get "relation does not exist" error, you need to run
-- schema.sql first to create the tables!
--
-- Run this in your Supabase SQL Editor
-- Safe to run multiple times (idempotent)
-- =============================================

-- Check if domains table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'domains'
  ) THEN
    RAISE EXCEPTION 'Table "public.domains" does not exist. Please run schema.sql first to create the tables!';
  END IF;
END $$;

-- Rename domain to domain_name
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'domains' 
    AND column_name = 'domain'
    AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'domains' 
      AND column_name = 'domain_name'
    )
  ) THEN
    ALTER TABLE public.domains RENAME COLUMN domain TO domain_name;
    RAISE NOTICE '✓ Renamed column: domain -> domain_name';
  ELSE
    RAISE NOTICE '→ Column domain_name already exists or domain does not exist';
  END IF;
END $$;

-- Rename verified to is_verified
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'domains' 
    AND column_name = 'verified'
    AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'domains' 
      AND column_name = 'is_verified'
    )
  ) THEN
    ALTER TABLE public.domains RENAME COLUMN verified TO is_verified;
    RAISE NOTICE '✓ Renamed column: verified -> is_verified';
  ELSE
    RAISE NOTICE '→ Column is_verified already exists or verified does not exist';
  END IF;
END $$;

-- Rename verified_at to last_verified_at
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'domains' 
    AND column_name = 'verified_at'
    AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'domains' 
      AND column_name = 'last_verified_at'
    )
  ) THEN
    ALTER TABLE public.domains RENAME COLUMN verified_at TO last_verified_at;
    RAISE NOTICE '✓ Renamed column: verified_at -> last_verified_at';
  ELSE
    RAISE NOTICE '→ Column last_verified_at already exists or verified_at does not exist';
  END IF;
END $$;

-- Update unique constraint
DO $$
BEGIN
  -- Drop old constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'domains_user_id_domain_key'
  ) THEN
    ALTER TABLE public.domains DROP CONSTRAINT domains_user_id_domain_key;
    RAISE NOTICE '✓ Dropped old unique constraint: domains_user_id_domain_key';
  END IF;
END $$;

-- Create new unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'domains_user_id_domain_name_key'
  ) THEN
    ALTER TABLE public.domains ADD CONSTRAINT domains_user_id_domain_name_key UNIQUE (user_id, domain_name);
    RAISE NOTICE '✓ Created new unique constraint: domains_user_id_domain_name_key';
  ELSE
    RAISE NOTICE '→ Unique constraint domains_user_id_domain_name_key already exists';
  END IF;
END $$;

-- Update indexes
DO $$
BEGIN
  -- Drop old index if exists
  IF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'domains' 
    AND indexname = 'idx_domains_domain'
  ) THEN
    DROP INDEX IF EXISTS public.idx_domains_domain;
    RAISE NOTICE '✓ Dropped old index: idx_domains_domain';
  END IF;
END $$;

-- Create new index if not exists
CREATE INDEX IF NOT EXISTS idx_domains_domain_name ON public.domains(domain_name);

-- Verify the migration
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'domains' 
    AND column_name = 'domain_name'
  ) THEN
    RAISE NOTICE '✅ Migration successful: domain_name column exists';
  ELSE
    RAISE WARNING '⚠ Migration may have failed: domain_name column not found';
  END IF;
END $$;
