import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { runSecurityScan } from '@/lib/scanner';

// Vercel: Erhöhe Timeout für Scan-Route
export const maxDuration = 60; // 60 Sekunden (benötigt Pro Plan, sonst 10s)

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

    // Aktualisiere Scan-Status auf running
    await supabase
      .from('scans')
      .update({
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .eq('id', params.id);

    // Starte Scan SYNCHRON (wichtig für Vercel!)
    await runSecurityScan(scan.id, scan.domains.domain, supabase);

    return NextResponse.json({ message: 'Scan abgeschlossen' });
  } catch (error: any) {
    console.error('Start scan error:', error);
    return NextResponse.json(
      { error: error.message || 'Ein Fehler ist aufgetreten' },
      { status: 500 }
    );
  }
}
