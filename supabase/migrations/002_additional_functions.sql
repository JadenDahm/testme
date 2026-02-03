-- Additional helper functions for Security Scanner SaaS

-- Function to increment scans_used (alternative to RPC if needed)
-- Note: This is handled in application code, but kept here for reference

-- Function to get user scan statistics
CREATE OR REPLACE FUNCTION public.get_user_scan_stats(user_uuid UUID)
RETURNS TABLE (
  total_scans INTEGER,
  completed_scans INTEGER,
  failed_scans INTEGER,
  average_security_score NUMERIC,
  total_findings INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as total_scans,
    COUNT(*) FILTER (WHERE status = 'completed')::INTEGER as completed_scans,
    COUNT(*) FILTER (WHERE status = 'failed')::INTEGER as failed_scans,
    AVG(security_score)::NUMERIC as average_security_score,
    SUM(total_findings)::INTEGER as total_findings
  FROM public.scans
  WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
