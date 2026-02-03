import { createClient } from '@/lib/supabase/server'
import { verifyDNSTXTRecord } from './dns'
import { verifyHTMLFile } from './html'
import { randomBytes } from 'crypto'

export type VerificationMethod = 'dns_txt' | 'html_file'

/**
 * Generate a verification token for domain ownership
 */
export function generateVerificationToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Create a domain verification record
 */
export async function createVerification(
  domainId: string,
  method: VerificationMethod
): Promise<{ token: string; verificationId: string }> {
  const supabase = await createClient()
  const token = generateVerificationToken()
  
  // Expires in 7 days
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  const { data, error } = await supabase
    .from('domain_verifications')
    .insert({
      domain_id: domainId,
      verification_token: token,
      verification_method: method,
      expires_at: expiresAt.toISOString(),
    } as any)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create verification: ${error.message}`)
  }

  return { token, verificationId: data.id }
}

/**
 * Verify domain ownership
 */
export async function verifyDomain(
  domainId: string,
  verificationId: string
): Promise<{ verified: boolean; error?: string }> {
  const supabase = await createClient()

  // Get verification record
  const { data: verification, error: verificationError } = await supabase
    .from('domain_verifications')
    .select(`
      *,
      domains!inner(domain, user_id)
    `)
    .eq('id', verificationId)
    .eq('domain_id', domainId)
    .single()

  if (verificationError || !verification) {
    return { verified: false, error: 'Verification record not found' }
  }

  const verificationData = verification as any

  // Check if expired
  if (new Date(verificationData.expires_at) < new Date()) {
    return { verified: false, error: 'Verification token has expired' }
  }

  // Check if already verified
  if (verificationData.verified) {
    return { verified: true }
  }

  const domain = verificationData.domains.domain
  let result: { verified: boolean; error?: string }

  // Perform verification based on method
  if (verificationData.verification_method === 'dns_txt') {
    result = await verifyDNSTXTRecord(domain, verificationData.verification_token)
  } else if (verificationData.verification_method === 'html_file') {
    result = await verifyHTMLFile(domain, verificationData.verification_token)
  } else {
    return { verified: false, error: 'Invalid verification method' }
  }

  // Update verification status if successful
  if (result.verified) {
    await (supabase
      .from('domain_verifications') as any)
      .update({
        verified: true,
        verified_at: new Date().toISOString(),
      })
      .eq('id', verificationId)

    // Update domain verification status
    await (supabase
      .from('domains') as any)
      .update({
        is_verified: true,
        verification_method: verificationData.verification_method,
        verified_at: new Date().toISOString(),
      })
      .eq('id', domainId)
  }

  return result
}
