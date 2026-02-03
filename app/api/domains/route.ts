import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { normalizeDomain } from '@/lib/utils';
import crypto from 'crypto';

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
    const { domain, verification_method } = body;

    if (!domain || !verification_method) {
      return NextResponse.json(
        { error: 'Domain und Verifizierungsmethode sind erforderlich' },
        { status: 400 }
      );
    }

    const normalizedDomain = normalizeDomain(domain);
    if (!normalizedDomain) {
      return NextResponse.json({ error: 'Ungültige Domain' }, { status: 400 });
    }

    // Prüfe ob Domain bereits existiert
    const { data: existing } = await supabase
      .from('domains')
      .select('id')
      .eq('user_id', user.id)
      .eq('domain', normalizedDomain)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Diese Domain wurde bereits hinzugefügt' },
        { status: 400 }
      );
    }

    // Generiere Verifizierungs-Token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const { data, error } = await supabase
      .from('domains')
      .insert({
        user_id: user.id,
        domain: normalizedDomain,
        verification_method: verification_method,
        verification_token: verificationToken,
        verified: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Fehler beim Speichern der Domain' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      domain: data,
      verification_token: verificationToken,
    });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error.message || 'Ein Fehler ist aufgetreten' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('domains')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Fehler beim Laden der Domains' },
        { status: 500 }
      );
    }

    return NextResponse.json({ domains: data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Ein Fehler ist aufgetreten' },
      { status: 500 }
    );
  }
}
