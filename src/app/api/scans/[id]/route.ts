import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// GET: Get scan details with findings
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  // Use service client to bypass potential RLS/session issues
  const serviceClient = await createServiceClient();

  const { data: scan, error } = await serviceClient
    .from('scans')
    .select('*, domains(domain_name)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !scan) {
    console.error('[API/Scans/GET] Scan not found:', { scanId: id, userId: user.id, error: error?.message });
    return NextResponse.json({ error: 'Scan nicht gefunden' }, { status: 404 });
  }

  // Get findings
  const { data: findings } = await serviceClient
    .from('scan_findings')
    .select('*')
    .eq('scan_id', id)
    .order('severity', { ascending: true });

  // Get logs
  const { data: logs } = await serviceClient
    .from('scan_logs')
    .select('*')
    .eq('scan_id', id)
    .order('created_at', { ascending: true });

  return NextResponse.json({
    data: {
      ...scan,
      findings: findings || [],
      logs: logs || [],
    },
  });
}

// DELETE: Remove a scan
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  // Use service client
  const serviceClient = await createServiceClient();

  // Verify ownership
  const { data: scan } = await serviceClient
    .from('scans')
    .select('id, status')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!scan) {
    return NextResponse.json({ error: 'Scan nicht gefunden' }, { status: 404 });
  }

  // Prevent deletion of running scans (they should be cancelled first)
  if (scan.status === 'running' || scan.status === 'pending') {
    return NextResponse.json(
      { error: 'Laufende oder ausstehende Scans können nicht gelöscht werden. Bitte breche den Scan zuerst ab.' },
      { status: 400 }
    );
  }

  const { error } = await serviceClient
    .from('scans')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: { success: true } });
}
