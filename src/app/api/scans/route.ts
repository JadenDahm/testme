import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { runScan } from '@/lib/scanner';

const startScanSchema = z.object({
  domain_id: z.string().uuid(),
  consent: z.literal(true),
});

// GET: List all scans for the current user
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('scans')
    .select('*, domains(domain)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// POST: Start a new scan
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = startScanSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Ungültige Eingabe. Zustimmung ist erforderlich.' }, { status: 400 });
  }

  const { domain_id, consent } = parsed.data;

  // Verify domain ownership and verification status
  const { data: domain, error: domainError } = await supabase
    .from('domains')
    .select('*')
    .eq('id', domain_id)
    .eq('user_id', user.id)
    .single();

  if (domainError || !domain) {
    return NextResponse.json({ error: 'Domain nicht gefunden' }, { status: 404 });
  }

  if (!domain.verified) {
    return NextResponse.json(
      { error: 'Domain muss zuerst verifiziert werden, bevor ein Scan gestartet werden kann.' },
      { status: 403 }
    );
  }

  // Check for running scans on same domain
  const { data: runningScans } = await supabase
    .from('scans')
    .select('id')
    .eq('domain_id', domain_id)
    .in('status', ['pending', 'running']);

  if (runningScans && runningScans.length > 0) {
    return NextResponse.json(
      { error: 'Es läuft bereits ein Scan für diese Domain.' },
      { status: 409 }
    );
  }

  // Create scan record
  const { data: scan, error: scanError } = await supabase
    .from('scans')
    .insert({
      user_id: user.id,
      domain_id,
      consent_given: consent,
      consent_given_at: new Date().toISOString(),
      status: 'pending',
      progress: 0,
      current_step: 'Scan wird vorbereitet...',
    })
    .select()
    .single();

  if (scanError || !scan) {
    return NextResponse.json({ error: 'Scan konnte nicht erstellt werden' }, { status: 500 });
  }

  // Log the scan start
  await supabase.from('scan_logs').insert({
    scan_id: scan.id,
    user_id: user.id,
    action: 'scan_created',
    details: `Scan für ${domain.domain} erstellt. Zustimmung gegeben: ${consent}`,
  });

  // Start scan in background (fire and forget)
  runScan({
    scanId: scan.id,
    domain: domain.domain,
    userId: user.id,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  }).catch(console.error);

  return NextResponse.json({ data: scan }, { status: 201 });
}
