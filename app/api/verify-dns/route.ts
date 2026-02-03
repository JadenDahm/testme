import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { domainId } = await request.json()
    
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ success: false, error: 'Nicht authentifiziert' }, { status: 401 })
    }

    // Hole Domain
    const { data: domain, error: domainError } = await supabase
      .from('domains')
      .select('*')
      .eq('id', domainId)
      .eq('user_id', user.id)
      .single()

    if (domainError || !domain) {
      return NextResponse.json({ success: false, error: 'Domain nicht gefunden' }, { status: 404 })
    }

    if (domain.verification_status === 'verified') {
      return NextResponse.json({ success: true, verified: true })
    }

    if (!domain.verification_token) {
      return NextResponse.json({ success: false, error: 'Kein Verifizierungs-Token vorhanden' }, { status: 400 })
    }

    // DNS TXT Record Check - Server-seitig
    try {
      const dns = await import('dns/promises')
      const txtRecords: string[][] = await dns.resolveTxt(domain.normalized_domain)
      
      const expectedValue = `security-scanner-verification=${domain.verification_token}`
      const found = txtRecords.some((record: string[]) =>
        record.some((txt: string) => txt === expectedValue)
      )

      if (found) {
        // Verifizierung erfolgreich
        const { error: updateError } = await supabase
          .from('domains')
          .update({
            verification_status: 'verified',
            verification_method: 'dns_txt',
            verified_at: new Date().toISOString(),
          })
          .eq('id', domainId)

        if (updateError) {
          return NextResponse.json({ success: false, error: 'Fehler beim Aktualisieren der Domain' }, { status: 500 })
        }

        // Log Verifizierung
        await supabase.from('domain_verifications').insert({
          domain_id: domainId,
          method: 'dns_txt',
          status: 'verified',
        })

        return NextResponse.json({ success: true, verified: true })
      } else {
        // Log fehlgeschlagene Verifizierung
        await supabase.from('domain_verifications').insert({
          domain_id: domainId,
          method: 'dns_txt',
          status: 'failed',
          details: { reason: 'TXT record not found' },
        })

        return NextResponse.json({ success: true, verified: false })
      }
    } catch (error) {
      console.error('DNS verification error:', error)
      return NextResponse.json({ success: false, error: 'DNS-Abfrage fehlgeschlagen' }, { status: 500 })
    }
  } catch (error) {
    console.error('Verify DNS error:', error)
    return NextResponse.json({ success: false, error: 'Interner Fehler' }, { status: 500 })
  }
}
