import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { runSecurityScan } from '@/lib/scanner';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    
    // Lade Scan
    const { data: scan, error: scanError } = await supabase
      .from('scans')
      .select('*, domains(*)')
      .eq('id', params.id)
      .single();

    if (scanError || !scan) {
      return NextResponse.json(
        { error: 'Scan nicht gefunden' },
        { status: 404 }
      );
    }

    // Prüfe ob Domain verifiziert ist
    if (!scan.domains?.verified) {
      await supabase
        .from('scans')
        .update({
          status: 'failed',
          error_message: 'Domain ist nicht verifiziert',
        })
        .eq('id', params.id);

      return NextResponse.json(
        { error: 'Domain ist nicht verifiziert' },
        { status: 400 }
      );
    }

    // Starte Scan asynchron
    runSecurityScan(scan.id, scan.domains.domain, supabase).catch((error) => {
      console.error('Scan error:', error);
    });

    // Aktualisiere Scan-Status
    await supabase
      .from('scans')
      .update({
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .eq('id', params.id);

    return NextResponse.json({ message: 'Scan gestartet' });
  } catch (error: any) {
    console.error('Start scan error:', error);
    return NextResponse.json(
      { error: error.message || 'Ein Fehler ist aufgetreten' },
      { status: 500 }
    );
  }
}
