'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { createVerification, verifyDomain } from '@/lib/verification'
import { checkRateLimit } from '@/lib/rate-limit'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const domainSchema = z.string()
  .min(1, 'Domain is required')
  .regex(/^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i, 'Invalid domain format')

/**
 * Add a new domain for scanning
 */
export async function addDomain(formData: FormData) {
  try {
    const { user, supabase } = await requireAuth()
    const domain = formData.get('domain') as string

    // Validate domain
    const validation = domainSchema.safeParse(domain)
    if (!validation.success) {
      return { error: validation.error.errors[0].message }
    }

    const normalizedDomain = domain.toLowerCase().trim()

    // Check if domain already exists
    const { data: existing } = await supabase
      .from('domains')
      .select('id')
      .eq('user_id', user.id)
      .eq('domain', normalizedDomain)
      .single()

    if (existing) {
      return { error: 'Domain already exists' }
    }

    // Insert domain
    const { data, error } = await supabase
      .from('domains')
      .insert({
        user_id: user.id,
        domain: normalizedDomain,
        is_verified: false,
      } as any)
      .select()
      .single()

    if (error) {
      return { error: `Failed to add domain: ${error.message}` }
    }

    revalidatePath('/dashboard/domains')
    return { success: true, domain: data }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to add domain' }
  }
}

/**
 * Create domain verification
 */
export async function createDomainVerification(domainId: string, method: 'dns_txt' | 'html_file') {
  try {
    const { user, supabase } = await requireAuth()

    // Verify ownership
    const { data: domain } = await supabase
      .from('domains')
      .select('*')
      .eq('id', domainId)
      .eq('user_id', user.id)
      .single()

    if (!domain) {
      return { error: 'Domain not found or unauthorized' }
    }

    // Check rate limit
    const rateLimit = await checkRateLimit(user.id, 'verification')
    if (!rateLimit.allowed) {
      return { 
        error: `Rate limit exceeded. Please try again after ${rateLimit.resetAt.toLocaleTimeString()}` 
      }
    }

    // Create verification
    const { token, verificationId } = await createVerification(domainId, method)

    revalidatePath('/dashboard/domains')
    return { 
      success: true, 
      token, 
      verificationId: verificationId,
      instructions: method === 'dns_txt' 
        ? `Add a TXT record to your DNS: security-scanner-verification=${token}`
        : `Create a file at /.well-known/security-scanner-verification.txt with content: ${token}`
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to create verification' }
  }
}

/**
 * Verify domain ownership
 */
export async function verifyDomainOwnership(domainId: string, verificationId: string) {
  try {
    const { user, supabase } = await requireAuth()

    // Verify ownership
    const { data: domain } = await supabase
      .from('domains')
      .select('*')
      .eq('id', domainId)
      .eq('user_id', user.id)
      .single()

    if (!domain) {
      return { error: 'Domain not found or unauthorized' }
    }

    // Perform verification
    const result = await verifyDomain(domainId, verificationId)

    revalidatePath('/dashboard/domains')
    return result
  } catch (error) {
    return { 
      verified: false, 
      error: error instanceof Error ? error.message : 'Verification failed' 
    }
  }
}

/**
 * Delete domain
 */
export async function deleteDomain(domainId: string) {
  try {
    const { user, supabase } = await requireAuth()

    const { error } = await supabase
      .from('domains')
      .delete()
      .eq('id', domainId)
      .eq('user_id', user.id)

    if (error) {
      return { error: `Failed to delete domain: ${error.message}` }
    }

    revalidatePath('/dashboard/domains')
    return { success: true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to delete domain' }
  }
}
