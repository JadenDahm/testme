import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { ScanReport } from '@/components/scan/scan-report';
import { ScanProgress } from '@/components/scan/scan-progress';
import { DeleteScanButton } from '@/components/scan/delete-scan-button';
import type { Scan, ScanFinding } from '@/types';

export default async function ScanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const { data: scan } = await supabase
    .from('scans')
    .select('*, domains(domain_name)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!scan) notFound();

  const { data: findings } = await supabase
    .from('scan_findings')
    .select('*')
    .eq('scan_id', id)
    .order('severity', { ascending: true });

  const typedScan = scan as Scan;
  const typedFindings = (findings || []) as ScanFinding[];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/scans"
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zu Scans
        </Link>
        {(typedScan.status === 'completed' || typedScan.status === 'failed' || typedScan.status === 'cancelled') && (
          <DeleteScanButton scanId={typedScan.id} />
        )}
      </div>

      {(typedScan.status === 'running' || typedScan.status === 'pending') ? (
        <ScanProgress scan={typedScan} />
      ) : (
        <ScanReport scan={typedScan} findings={typedFindings} />
      )}
    </div>
  );
}
