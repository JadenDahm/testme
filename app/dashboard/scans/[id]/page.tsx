import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ScanReport from '@/components/dashboard/ScanReport';

async function getScanResult(scanId: string, supabase: any) {
  const { data: scan, error: scanError } = await supabase
    .from('scans')
    .select('*')
    .eq('id', scanId)
    .single();

  if (scanError || !scan) {
    return null;
  }

  // Lade Vulnerabilities
  const { data: vulnerabilities } = await supabase
    .from('vulnerabilities')
    .select('*')
    .eq('scan_id', scan.id)
    .order('created_at', { ascending: false });

  // Berechne Summary
  const summary = {
    total: vulnerabilities?.length || 0,
    critical: vulnerabilities?.filter((v: any) => v.severity === 'critical').length || 0,
    high: vulnerabilities?.filter((v: any) => v.severity === 'high').length || 0,
    medium: vulnerabilities?.filter((v: any) => v.severity === 'medium').length || 0,
    low: vulnerabilities?.filter((v: any) => v.severity === 'low').length || 0,
    info: vulnerabilities?.filter((v: any) => v.severity === 'info').length || 0,
    security_score: 0,
  };

  // Berechne Security Score (0-100, höher ist besser)
  const maxScore = 100;
  const criticalPenalty = summary.critical * 20;
  const highPenalty = summary.high * 10;
  const mediumPenalty = summary.medium * 5;
  const lowPenalty = summary.low * 2;
  summary.security_score = Math.max(
    0,
    maxScore - criticalPenalty - highPenalty - mediumPenalty - lowPenalty
  );

  return {
    scan,
    vulnerabilities: vulnerabilities || [],
    summary,
  };
}

export default async function ScanPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const scanResult = await getScanResult(params.id, supabase);

  if (!scanResult) {
    redirect('/dashboard');
  }

  return <ScanReport scanResult={scanResult} />;
}
