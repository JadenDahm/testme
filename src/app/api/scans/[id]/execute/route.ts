import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
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

  const serviceClient = await createServiceClient();

  // Get scan and verify ownership
  const { data: scan, error: scanError } = await serviceClient
    .from('scans')
    .select('*')
    .eq('id', scanId)
    .eq('user_id', user.id)
    .single();

  if (scanError || !scan) {
    console.error('[Execute] Scan not found:', { scanId, userId: user.id, error: scanError?.message });
    return NextResponse.json({ error: 'Scan nicht gefunden' }, { status: 404 });
  }

  // Check if scan is already completed
  if (scan.status === 'completed' || scan.status === 'failed' || scan.status === 'cancelled') {
    return NextResponse.json({
      data: { completed: true, step: scan.current_step, nextStep: null },
    });
  }

  // Get domain name separately
  const { data: domain } = await serviceClient
    .from('domains')
    .select('domain_name')
    .eq('id', scan.domain_id)
    .single();

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

    await serviceClient
      .from('scans')
      .update({ status: 'failed', completed_at: new Date().toISOString() })
      .eq('id', scanId);

    return NextResponse.json({ error: `Scan fehlgeschlagen: ${message}` }, { status: 500 });
  }
}
