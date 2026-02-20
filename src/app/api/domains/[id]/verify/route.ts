import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyDnsTxt } from '@/lib/verification/dns';
import { verifyHtmlFile } from '@/lib/verification/html';
import { z } from 'zod';
import type { VerificationMethod } from '@/types';

const verifySchema = z.object({
  method: z.enum(['dns_txt', 'html_file']),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = verifySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Ungültige Verifizierungsmethode' }, { status: 400 });
  }

  const method: VerificationMethod = parsed.data.method;

  // Get domain
  const { data: domain, error: domainError } = await supabase
    .from('domains')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (domainError || !domain) {
    return NextResponse.json({ error: 'Domain nicht gefunden' }, { status: 404 });
  }

  if (domain.is_verified) {
    return NextResponse.json({ data: { verified: true, message: 'Domain ist bereits verifiziert' } });
  }

  let verified = false;
  let errorMessage = '';

  switch (method) {
    case 'dns_txt':
      verified = await verifyDnsTxt(domain.domain_name, domain.verification_token);
      if (!verified) {
        errorMessage = 'DNS TXT-Eintrag nicht gefunden oder Token stimmt nicht überein. Bitte prüfe, ob der Eintrag korrekt gesetzt wurde und warte ggf. auf DNS-Propagierung (kann bis zu 24h dauern).';
      }
      break;
    case 'html_file': {
      const result = await verifyHtmlFile(domain.domain_name, domain.verification_token);
      verified = result.verified;
      if (!verified) {
        errorMessage = result.debug || 'Die HTML-Datei konnte nicht verifiziert werden.';
      }
      break;
    }
  }

  if (verified) {
    await supabase
      .from('domains')
      .update({
        is_verified: true,
        last_verified_at: new Date().toISOString(),
        verification_method: method,
      })
      .eq('id', id);

    return NextResponse.json({
      data: { verified: true, message: 'Domain erfolgreich verifiziert!' },
    });
  }

  return NextResponse.json({
    data: {
      verified: false,
      message: errorMessage || 'Verifizierung fehlgeschlagen. Bitte prüfe die Konfiguration und versuche es erneut.',
    },
  });
}
