import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  // Verify ownership
  const { data: scan } = await supabase
    .from('scans')
    .select('status')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!scan) {
    return NextResponse.json({ error: 'Scan nicht gefunden' }, { status: 404 });
  }

  if (scan.status !== 'running' && scan.status !== 'pending') {
    return NextResponse.json({ error: 'Scan kann nicht abgebrochen werden' }, { status: 400 });
  }

  const { error } = await supabase
    .from('scans')
    .update({
      status: 'cancelled',
      current_step: 'Vom Nutzer abgebrochen',
      completed_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log cancellation
  await supabase.from('scan_logs').insert({
    scan_id: id,
    user_id: user.id,
    action: 'scan_cancelled',
    details: 'Scan wurde vom Nutzer abgebrochen',
  });

  return NextResponse.json({ data: { success: true } });
}
