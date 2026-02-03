import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'

/**
 * Get the latest verification for a domain
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { domainId: string } }
) {
  try {
    const { user, supabase } = await requireAuth()
    const { domainId } = params

    // Verify ownership
    const { data: domain } = await supabase
      .from('domains')
      .select('id')
      .eq('id', domainId)
      .eq('user_id', user.id)
      .single()

    if (!domain) {
      return NextResponse.json(
        { error: 'Domain not found or unauthorized' },
        { status: 403 }
      )
    }

    // Get latest verification
    const { data: verification } = await supabase
      .from('domain_verifications')
      .select('id')
      .eq('domain_id', domainId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    return NextResponse.json({
      verificationId: verification?.id || null,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get verification' },
      { status: 500 }
    )
  }
}
