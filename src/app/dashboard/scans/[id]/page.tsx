export const dynamic = 'force-dynamic';

import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
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

  // Use service client to bypass potential RLS/session issues
  // We've already verified the user above, so we manually filter by user_id
  const serviceClient = await createServiceClient();

  const { data: scan, error: scanError } = await serviceClient
    .from('scans')
    .select('*, domains(domain_name)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (scanError) {
    console.error('[ScanDetail] Error fetching scan:', scanError.message, { scanId: id, userId: user.id });
  }

  if (!scan) {
    console.error('[ScanDetail] Scan not found:', { scanId: id, userId: user.id, error: scanError?.message });
    notFound();
  }

  const { data: findings } = await serviceClient
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
          className="text-sm text-text-muted hover:text-text-secondary flex items-center gap-1 transition-colors"
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
