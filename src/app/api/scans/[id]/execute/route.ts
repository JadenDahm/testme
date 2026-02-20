import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { executeScanStep, SCAN_STEPS } from '@/lib/scanner';

// Max duration for Vercel serverless function (60s for Hobby, 300s for Pro)
export const maxDuration = 60;

// POST: Execute the next step of a scan
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: scanId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  // Get scan and verify ownership
  const { data: scan, error: scanError } = await supabase
    .from('scans')
    .select('*, domains(domain_name)')
    .eq('id', scanId)
    .eq('user_id', user.id)
    .single();

  if (scanError || !scan) {
    return NextResponse.json({ error: 'Scan nicht gefunden' }, { status: 404 });
  }

  // Check if scan is already completed
  if (scan.status === 'completed' || scan.status === 'failed' || scan.status === 'cancelled') {
    return NextResponse.json({
      data: { completed: true, step: scan.current_step, nextStep: null },
    });
  }

  // Check if domain is still verified
  const domain = scan.domains as { domain_name: string } | null;
  if (!domain?.domain_name) {
    return NextResponse.json({ error: 'Domain nicht gefunden' }, { status: 404 });
  }

  try {
    const result = await executeScanStep(scanId, user.id, domain.domain_name);

    return NextResponse.json({
      data: {
        ...result,
        steps: SCAN_STEPS,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';

    // Mark scan as failed
    await supabase
      .from('scans')
      .update({ status: 'failed', completed_at: new Date().toISOString() })
      .eq('id', scanId);

    return NextResponse.json({ error: `Scan fehlgeschlagen: ${message}` }, { status: 500 });
  }
}
