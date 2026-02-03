'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { ScanEngine } from '@/lib/scanner/engine'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const scanTypeSchema = z.enum(['full', 'passive', 'active'])

/**
 * Start a new security scan
 * 
 * SECURITY: Only allows scanning of verified domains
 */
export async function startScan(domainId: string, scanType: 'full' | 'passive' | 'active' = 'full') {
  try {
    const { user, supabase } = await requireAuth()

    // Validate scan type
    const validation = scanTypeSchema.safeParse(scanType)
    if (!validation.success) {
      return { error: 'Invalid scan type' }
    }

    // Get domain and verify ownership
    const { data: domain, error: domainError } = await supabase
      .from('domains')
      .select('*')
      .eq('id', domainId)
      .eq('user_id', user.id)
      .single()

    if (domainError || !domain) {
      return { error: 'Domain not found or unauthorized' }
    }

    // CRITICAL: Only allow scanning of verified domains
    if (!(domain as any).is_verified) {
      return { 
        error: 'Domain must be verified before scanning. Please verify domain ownership first.' 
      }
    }

    // Check rate limit
    const rateLimit = await checkRateLimit(user.id, 'scan')
    if (!rateLimit.allowed) {
      return { 
        error: `Rate limit exceeded. You can start ${rateLimit.remaining} more scan(s) this hour. Try again after ${rateLimit.resetAt.toLocaleTimeString()}` 
      }
    }

    // Create scan record
    const { data: scan, error: scanError } = await supabase
      .from('scans')
      .insert({
        domain_id: domainId,
        user_id: user.id,
        status: 'queued',
        scan_type: scanType,
      } as any)
      .select()
      .single()

    if (scanError || !scan) {
      return { error: `Failed to create scan: ${scanError?.message}` }
    }

    // Add to queue
    await supabase
      .from('scan_queue')
      .insert({
        scan_id: (scan as any).id,
        status: 'pending',
      } as any)

    // Start scan asynchronously (in production, use a proper job queue)
    // For now, we'll process it immediately
    processScan((scan as any).id, (domain as any).domain, user.id, scanType).catch(error => {
      console.error('Scan processing error:', error)
    })

    revalidatePath('/dashboard/scans')
    return { success: true, scan }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to start scan' }
  }
}

/**
 * Process scan (should be moved to background job in production)
 * 
 * NOTE: In production, this should be moved to a proper job queue system
 * like Vercel Queue, Inngest, or similar
 */
async function processScan(
  scanId: string,
  domain: string,
  userId: string,
  scanType: 'full' | 'passive' | 'active'
) {
  const supabase = await createClient()
  const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`

  try {
    // Update queue status
    await (supabase
      .from('scan_queue') as any)
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
      })
      .eq('scan_id', scanId)

    // Run scan
    const engine = new ScanEngine(scanId, domain, userId, baseUrl)
    await engine.run(scanType)

    // Update queue status
    await (supabase
      .from('scan_queue') as any)
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('scan_id', scanId)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    await (supabase
      .from('scan_queue') as any)
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
      })
      .eq('scan_id', scanId)
    
    await (supabase
      .from('scans') as any)
      .update({
        status: 'failed',
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      })
      .eq('id', scanId)
  }
}

/**
 * Cancel a running scan
 */
export async function cancelScan(scanId: string) {
  try {
    const { user, supabase } = await requireAuth()

    // Verify ownership
    const { data: scan } = await supabase
      .from('scans')
      .select('status')
      .eq('id', scanId)
      .eq('user_id', user.id)
      .single()

    if (!scan) {
      return { error: 'Scan not found or unauthorized' }
    }

    if ((scan as any).status !== 'running' && (scan as any).status !== 'queued') {
      return { error: 'Scan cannot be cancelled' }
    }

    await (supabase
      .from('scans') as any)
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString(),
      })
      .eq('id', scanId)

    revalidatePath('/dashboard/scans')
    return { success: true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to cancel scan' }
  }
}
