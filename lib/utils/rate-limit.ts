/**
 * Rate Limiting Utility
 * Verhindert Missbrauch und DDoS
 */

import { createServiceClient } from '@/lib/supabase/server'

export type ActionType = 'scan' | 'verification' | 'api_call'

interface RateLimitConfig {
  maxRequests: number
  windowMinutes: number
}

const RATE_LIMITS: Record<ActionType, RateLimitConfig> = {
  scan: { maxRequests: 5, windowMinutes: 60 }, // 5 Scans pro Stunde
  verification: { maxRequests: 10, windowMinutes: 60 }, // 10 Verifizierungen pro Stunde
  api_call: { maxRequests: 100, windowMinutes: 15 }, // 100 API Calls pro 15 Minuten
}

export async function checkRateLimit(
  userId: string,
  actionType: ActionType
): Promise<{ allowed: boolean; remaining?: number; resetAt?: Date }> {
  const supabase = await createServiceClient()
  const config = RATE_LIMITS[actionType]
  const windowStart = new Date()
  windowStart.setMinutes(windowStart.getMinutes() - config.windowMinutes)

  // Zähle Requests im aktuellen Zeitfenster
  const { data, error } = await supabase
    .from('rate_limits')
    .select('count')
    .eq('user_id', userId)
    .eq('action_type', actionType)
    .gte('window_start', windowStart.toISOString())
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows returned, das ist OK
    console.error('Rate limit check error:', error)
    return { allowed: false }
  }

  const currentCount = data?.count || 0

  if (currentCount >= config.maxRequests) {
    const resetAt = new Date(windowStart)
    resetAt.setMinutes(resetAt.getMinutes() + config.windowMinutes)
    return {
      allowed: false,
      remaining: 0,
      resetAt,
    }
  }

  // Erhöhe Counter
  const now = new Date()
  const { error: upsertError } = await supabase
    .from('rate_limits')
    .upsert(
      {
        user_id: userId,
        action_type: actionType,
        count: currentCount + 1,
        window_start: now.toISOString(),
      },
      {
        onConflict: 'user_id,action_type,window_start',
      }
    )

  if (upsertError) {
    console.error('Rate limit upsert error:', upsertError)
    return { allowed: false }
  }

  return {
    allowed: true,
    remaining: config.maxRequests - currentCount - 1,
  }
}
