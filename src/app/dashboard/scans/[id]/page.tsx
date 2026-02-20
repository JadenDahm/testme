import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { ScanReport } from '@/components/scan/scan-report';
import { ScanProgress } from '@/components/scan/scan-progress';

export default async function ScanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: scan } = await supabase
    .from('scans')
    .select('*, domains(domain_name)')
    .eq('id', id)
    .eq('user_id', user!.id)
    .single();

  if (!scan) notFound();

  const { data: findings } = await supabase
    .from('scan_findings')
    .select('*')
    .eq('scan_id', id)
    .order('severity', { ascending: true });

  return (
    <div className="space-y-6 animate-fade-in">
      <Link
        href="/dashboard/scans"
        className="text-sm text-text-muted hover:text-text-secondary flex items-center gap-1 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zu Scans
      </Link>

      {(scan.status === 'running' || scan.status === 'pending') ? (
        <ScanProgress scan={scan} />
      ) : (
        <ScanReport scan={scan} findings={findings || []} />
      )}
    </div>
  );
}
