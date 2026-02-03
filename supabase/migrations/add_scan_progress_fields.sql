-- Migration: Add progress tracking fields to scans table
-- Description: Adds fields to track scan progress in real-time

-- Add new columns to scans table if they don't exist
ALTER TABLE scans
ADD COLUMN IF NOT EXISTS progress_message TEXT,
ADD COLUMN IF NOT EXISTS progress_details TEXT,
ADD COLUMN IF NOT EXISTS last_progress_at TIMESTAMPTZ;

-- Create index on last_progress_at for sorting/filtering
CREATE INDEX IF NOT EXISTS idx_scans_last_progress_at ON scans(last_progress_at DESC);
