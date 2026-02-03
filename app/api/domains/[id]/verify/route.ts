import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveTxt } from 'dns/promises';
import axios from 'axios';

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

    // Lade Domain
    const { data: domain, error: domainError } = await supabase
      .from('domains')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (domainError || !domain) {
      return NextResponse.json(
        { error: 'Domain nicht gefunden' },
        { status: 404 }
      );
    }

    if (domain.verified) {
      return NextResponse.json({ verified: true, domain });
    }

    if (!domain.verification_token) {
      return NextResponse.json(
        { error: 'Kein Verifizierungs-Token vorhanden' },
        { status: 400 }
      );
    }

    let verified = false;

    // DNS-TXT Verifizierung
    if (domain.verification_method === 'dns_txt') {
      try {
        // Versuche DNS-Abfrage mit Node.js dns/promises
        const txtRecords = await resolveTxt(domain.domain);
        const expectedValue = `testmywebsite-verification=${domain.verification_token}`;
        
        // TXT-Einträge können als Array von Strings zurückkommen (wegen 255-Byte-Limit)
        const found = txtRecords.some((record) => {
          // Kombiniere Array-Elemente falls nötig
          const combined = Array.isArray(record) ? record.join('') : String(record);
          // Prüfe ob der erwartete Wert enthalten ist
          return combined.includes(expectedValue);
        });

        verified = found;
        
        if (!verified) {
          console.log(`DNS verification failed for ${domain.domain}. Expected: ${expectedValue}`);
          console.log(`Found TXT records:`, txtRecords);
        }
      } catch (error: any) {
        console.error('DNS verification error:', error);
        // Detaillierte Fehlermeldung für besseres Debugging
        if (error.code === 'ENOTFOUND' || error.code === 'ENODATA') {
          console.error(`Domain ${domain.domain} not found or has no TXT records`);
        }
        verified = false;
      }
    }

    // HTML-Datei Verifizierung
    if (domain.verification_method === 'html_file') {
      try {
        const url = `https://${domain.domain}/.well-known/testmywebsite-verification.html`;
        const response = await axios.get(url, {
          timeout: 10000,
          validateStatus: (status) => status === 200,
        });

        const expectedContent = domain.verification_token;
        verified = response.data?.trim() === expectedContent;
      } catch (error) {
        // Versuche auch HTTP
        try {
          const url = `http://${domain.domain}/.well-known/testmywebsite-verification.html`;
          const response = await axios.get(url, {
            timeout: 10000,
            validateStatus: (status) => status === 200,
          });

          const expectedContent = domain.verification_token;
          verified = response.data?.trim() === expectedContent;
        } catch (httpError) {
          console.error('HTML verification error:', httpError);
          verified = false;
        }
      }
    }

    if (verified) {
      const { error: updateError } = await supabase
        .from('domains')
        .update({
          verified: true,
          verified_at: new Date().toISOString(),
        })
        .eq('id', domain.id);

      if (updateError) {
        console.error('Update error:', updateError);
        return NextResponse.json(
          { error: 'Fehler beim Aktualisieren der Domain' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        verified: true,
        message: 'Domain erfolgreich verifiziert',
      });
    }

    return NextResponse.json({
      verified: false,
      message: 'Verifizierung fehlgeschlagen. Bitte überprüfen Sie Ihre Konfiguration.',
    });
  } catch (error: any) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { error: error.message || 'Ein Fehler ist aufgetreten' },
      { status: 500 }
    );
  }
}
