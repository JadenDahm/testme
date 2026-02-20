import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

  const { data: scan, error } = await supabase
    .from('scans')
    .select('*, domains(domain)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !scan) {
    return NextResponse.json({ error: 'Scan nicht gefunden' }, { status: 404 });
  }

  // Get findings
  const { data: findings } = await supabase
    .from('scan_findings')
    .select('*')
    .eq('scan_id', id)
    .order('severity', { ascending: true });

  // Get logs
  const { data: logs } = await supabase
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
