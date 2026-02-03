import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { ScanEngine } from '@/lib/scanner/engine'

/**
 * Process a queued scan
 * 
 * This endpoint should be called by a background job processor
 * In production, use Vercel Cron, Inngest, or similar
 */
export async function POST(request: NextRequest) {
  try {
    // Use service role for background processing
    const supabase = await createServiceClient()

    // Get next pending scan from queue
    const { data: queueItem } = await supabase
      .from('scan_queue')
      .select(`
        *,
        scans!inner(
          id,
          domain_id,
          user_id,
          scan_type,
          domains!inner(domain)
        )
      `)
      .eq('status', 'pending')
      .order('scheduled_at', { ascending: true })
      .limit(1)
      .single()

    if (!queueItem) {
      return NextResponse.json({ message: 'No pending scans' })
    }

    const scan = (queueItem as any).scans
    const domain = (scan as any).domains.domain

    // Update queue status
    await supabase
      .from('scan_queue')
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
      })
      .eq('id', queueItem.id)

    // Run scan
    const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`
    const engine = new ScanEngine(scan.id, domain, scan.user_id, baseUrl)
    
    try {
      await engine.run(scan.scan_type)

      // Update queue status
      await supabase
        .from('scan_queue')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', queueItem.id)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      await supabase
        .from('scan_queue')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', queueItem.id)

      await supabase
        .from('scans')
        .update({
          status: 'failed',
          error_message: errorMessage,
          completed_at: new Date().toISOString(),
        })
        .eq('id', scan.id)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error processing scan:', error)
    return NextResponse.json(
      { error: 'Failed to process scan' },
      { status: 500 }
    )
  }
}
