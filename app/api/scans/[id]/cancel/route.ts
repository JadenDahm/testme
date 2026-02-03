import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    // Lade Scan und prüfe Berechtigung
    const { data: scan, error: scanError } = await supabase
      .from('scans')
      .select('*, domains(user_id)')
      .eq('id', params.id)
      .single();

    if (scanError || !scan) {
      return NextResponse.json(
        { error: 'Scan nicht gefunden' },
        { status: 404 }
      );
    }

    if (scan.domains?.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Keine Berechtigung' },
        { status: 403 }
      );
    }

    // Prüfe ob Scan läuft
    if (scan.status !== 'running' && scan.status !== 'pending') {
      return NextResponse.json(
        { error: 'Scan läuft nicht' },
        { status: 400 }
      );
    }

    // Markiere Scan als abgebrochen
    const { error: updateError } = await supabase
      .from('scans')
      .update({
        status: 'failed',
        error_message: 'Scan vom Benutzer abgebrochen',
        completed_at: new Date().toISOString(),
      })
      .eq('id', params.id);

    if (updateError) {
      console.error('Cancel error:', updateError);
      return NextResponse.json(
        { error: 'Fehler beim Abbrechen des Scans' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Scan abgebrochen' });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error.message || 'Ein Fehler ist aufgetreten' },
      { status: 500 }
    );
  }
}
