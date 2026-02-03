import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(
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

    const { id } = params;

    // Prüfe ob Domain dem User gehört
    const { data: domain, error: domainError } = await supabase
      .from('domains')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (domainError || !domain) {
      return NextResponse.json(
        { error: 'Domain nicht gefunden' },
        { status: 404 }
      );
    }

    // Lösche alle Scans und Vulnerabilities (CASCADE sollte dies automatisch tun)
    // Aber zur Sicherheit manuell löschen
    const { data: scans } = await supabase
      .from('scans')
      .select('id')
      .eq('domain_id', id);

    if (scans && scans.length > 0) {
      const scanIds = scans.map(s => s.id);
      
      // Lösche Vulnerabilities
      await supabase
        .from('vulnerabilities')
        .delete()
        .in('scan_id', scanIds);

      // Lösche Scans
      await supabase
        .from('scans')
        .delete()
        .eq('domain_id', id);
    }

    // Lösche Domain
    const { error: deleteError } = await supabase
      .from('domains')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return NextResponse.json(
        { error: 'Fehler beim Löschen der Domain' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error.message || 'Ein Fehler ist aufgetreten' },
      { status: 500 }
    );
  }
}
