'use server'

/**
 * Domain Management Server Actions
 * Sicherheitskritisch: Domain-Verifizierung vor Scans
 */

import { createClient } from '@/lib/supabase/server'
import { normalizeDomain, validateDomain, generateVerificationToken } from '@/lib/utils/domain'
import { checkRateLimit } from '@/lib/utils/rate-limit'
import { logAuditEvent } from '@/lib/utils/audit'
import { revalidatePath } from 'next/cache'

export async function addDomain(domain: string) {
  const supabase = await createClient()
  
  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()
  
  if (!user) {
    return { success: false, error: 'Nicht authentifiziert' }
  }

  // Validierung
  const validation = validateDomain(domain)
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }

  const normalized = normalizeDomain(domain)

  // Rate limiting
  const rateLimit = await checkRateLimit(user.id, 'verification')
  if (!rateLimit.allowed) {
    return {
      success: false,
      error: `Rate Limit erreicht. Bitte versuche es später erneut.`,
    }
  }

  // Prüfe ob Domain bereits existiert
  const { data: existing } = await supabase
    .from('domains')
    .select('id')
    .eq('user_id', user.id)
    .eq('normalized_domain', normalized)
    .single()

  if (existing) {
    return { success: false, error: 'Domain existiert bereits' }
  }

  // Erstelle Domain mit Verifizierungs-Token
  const verificationToken = generateVerificationToken()
  
  const { data, error } = await supabase
    .from('domains')
    .insert({
      user_id: user.id,
      domain: domain,
      normalized_domain: normalized,
      verification_status: 'pending' as const,
      verification_token: verificationToken,
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: 'Fehler beim Hinzufügen der Domain' }
  }

  await logAuditEvent(user.id, 'domain_added', 'domain', data.id, {
    domain: normalized,
  })

  revalidatePath('/dashboard')

  return {
    success: true,
    data: {
      ...data,
      verificationToken, // Für DNS TXT Verifizierung
    },
  }
}

export async function verifyDomainDNS(domainId: string) {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()
  
  if (!user) {
    return { success: false, error: 'Nicht authentifiziert' }
  }

  // Hole Domain
  const { data: domain, error: domainError } = await supabase
    .from('domains')
    .select('*')
    .eq('id', domainId)
    .eq('user_id', user.id)
    .single()

  if (domainError || !domain) {
    return { success: false, error: 'Domain nicht gefunden' }
  }

  if (domain.verification_status === 'verified') {
    return { success: true, verified: true }
  }

  if (!domain.verification_token) {
    return { success: false, error: 'Kein Verifizierungs-Token vorhanden' }
  }

  // DNS TXT Record Check
  // WICHTIG: In Production sollte dies über einen externen DNS-Resolver erfolgen
  // Hier vereinfachte Version - für Production: dns.promises.resolveTxt() oder externe API
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
        return { success: false, error: 'Fehler beim Aktualisieren der Domain' }
      }

      // Log Verifizierung
      await supabase.from('domain_verifications').insert({
        domain_id: domainId,
        method: 'dns_txt',
        status: 'verified',
      })

      await logAuditEvent(user.id, 'domain_verified', 'domain', domainId)

      revalidatePath('/dashboard')
      return { success: true, verified: true }
    } else {
      // Log fehlgeschlagene Verifizierung
      await supabase.from('domain_verifications').insert({
        domain_id: domainId,
        method: 'dns_txt',
        status: 'failed',
        details: { reason: 'TXT record not found' },
      })

      return { success: true, verified: false }
    }
  } catch (error) {
    console.error('DNS verification error:', error)
    return { success: false, error: 'DNS-Abfrage fehlgeschlagen' }
  }
}

export async function verifyDomainHTML(domainId: string) {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()
  
  if (!user) {
    return { success: false, error: 'Nicht authentifiziert' }
  }

  // Hole Domain
  const { data: domain, error: domainError } = await supabase
    .from('domains')
    .select('*')
    .eq('id', domainId)
    .eq('user_id', user.id)
    .single()

  if (domainError || !domain) {
    return { success: false, error: 'Domain nicht gefunden' }
  }

  if (domain.verification_status === 'verified') {
    return { success: true, verified: true }
  }

  if (!domain.verification_token) {
    return { success: false, error: 'Kein Verifizierungs-Token vorhanden' }
  }

  // HTML File Check
  const verificationUrl = `https://${domain.normalized_domain}/.well-known/security-scanner-${domain.verification_token}.html`
  
  try {
    const response = await fetch(verificationUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'SecurityScanner/1.0',
      },
      // Timeout nach 10 Sekunden
      signal: AbortSignal.timeout(10000),
    })

    if (response.ok) {
      const content = await response.text()
      const expectedContent = domain.verification_token

      if (content.trim() === expectedContent) {
        // Verifizierung erfolgreich
        const { error: updateError } = await supabase
          .from('domains')
          .update({
            verification_status: 'verified',
            verification_method: 'html_file',
            verified_at: new Date().toISOString(),
          })
          .eq('id', domainId)

        if (updateError) {
          return { success: false, error: 'Fehler beim Aktualisieren der Domain' }
        }

        await supabase.from('domain_verifications').insert({
          domain_id: domainId,
          method: 'html_file',
          status: 'verified',
        })

        await logAuditEvent(user.id, 'domain_verified', 'domain', domainId)

        revalidatePath('/dashboard')
        return { success: true, verified: true }
      }
    }

    // Verifizierung fehlgeschlagen
    await supabase.from('domain_verifications').insert({
      domain_id: domainId,
      method: 'html_file',
      status: 'failed',
      details: { reason: 'File not found or content mismatch', status: response.status },
    })

    return { success: true, verified: false }
  } catch (error) {
    console.error('HTML verification error:', error)
    
    await supabase.from('domain_verifications').insert({
      domain_id: domainId,
      method: 'html_file',
      status: 'failed',
      details: { reason: 'Network error', error: String(error) },
    })

    return { success: false, error: 'Verifizierung fehlgeschlagen' }
  }
}

export async function getDomains() {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()
  
  if (!user) {
    return { success: false, error: 'Nicht authentifiziert', data: [] }
  }

  const { data, error } = await supabase
    .from('domains')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return { success: false, error: 'Fehler beim Laden der Domains', data: [] }
  }

  return { success: true, data: data || [] }
}
