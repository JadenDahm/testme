import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const body = await request.json();
    const { domain_id } = body;

    if (!domain_id) {
      return NextResponse.json(
        { error: 'Domain-ID ist erforderlich' },
        { status: 400 }
      );
    }

    // Prüfe ob Domain existiert und verifiziert ist
    const { data: domain, error: domainError } = await supabase
      .from('domains')
      .select('*')
      .eq('id', domain_id)
      .eq('user_id', user.id)
      .single();

    if (domainError || !domain) {
      return NextResponse.json(
        { error: 'Domain nicht gefunden' },
        { status: 404 }
      );
    }

    if (!domain.verified) {
      return NextResponse.json(
        { error: 'Domain muss zuerst verifiziert werden' },
        { status: 400 }
      );
    }

    // Erstelle neuen Scan
    const { data: scan, error: scanError } = await supabase
      .from('scans')
      .insert({
        domain_id: domain.id,
        user_id: user.id,
        status: 'pending',
      })
      .select()
      .single();

    if (scanError) {
      console.error('Scan creation error:', scanError);
      return NextResponse.json(
        { error: 'Fehler beim Erstellen des Scans' },
        { status: 500 }
      );
    }

    // Starte Scan asynchron (wird in separater Route verarbeitet)
    // Hier könnten wir auch einen Queue-Service verwenden
    fetch(`${request.nextUrl.origin}/api/scans/${scan.id}/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }).catch((err) => {
      console.error('Failed to trigger scan:', err);
    });

    return NextResponse.json({ scan });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error.message || 'Ein Fehler ist aufgetreten' },
      { status: 500 }
    );
  }
}
