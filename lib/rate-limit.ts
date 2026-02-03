import { createClient } from '@/lib/supabase/server'

export type ResourceType = 'scan' | 'verification'

/**
 * Check if user has exceeded rate limit for a resource type
 * Returns true if allowed, false if rate limited
 */
export async function checkRateLimit(
  userId: string,
  resourceType: ResourceType
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const supabase = await createClient()
  
  // Get user's rate limit from profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('scan_limit_per_hour')
    .eq('id', userId)
    .single()

  const limit = profile?.scan_limit_per_hour || 10
  const now = new Date()
  const windowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0)

  // Get current count for this window
  const { data: rateLimit } = await supabase
    .from('rate_limits')
    .select('count')
    .eq('user_id', userId)
    .eq('resource_type', resourceType)
    .eq('window_start', windowStart.toISOString())
    .single()

  const currentCount = rateLimit?.count || 0
  const remaining = Math.max(0, limit - currentCount)
  const allowed = currentCount < limit

  // Increment or create rate limit record
  if (allowed) {
    if (rateLimit) {
      const rateLimitUpdate = supabase.from('rate_limits') as any
      await rateLimitUpdate.update({ count: currentCount + 1 })
        .eq('id', (rateLimit as any).id)
    } else {
      await supabase
        .from('rate_limits')
        .insert({
          user_id: userId,
          resource_type: resourceType,
          count: 1,
          window_start: windowStart.toISOString(),
        } as any)
    }
  }

  const resetAt = new Date(windowStart)
  resetAt.setHours(resetAt.getHours() + 1)

  return { allowed, remaining, resetAt }
}
