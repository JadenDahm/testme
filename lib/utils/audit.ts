/**
 * Audit Logging
 * Protokolliert alle wichtigen Aktionen für Compliance und Forensik
 */

import { createServiceClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

export type ActionType =
  | 'scan_started'
  | 'scan_completed'
  | 'scan_failed'
  | 'scan_cancelled'
  | 'domain_added'
  | 'domain_verified'
  | 'domain_verification_failed'
  | 'user_login'
  | 'user_logout'

export async function logAuditEvent(
  userId: string | null,
  actionType: ActionType,
  resourceType: string | null,
  resourceId: string | null,
  details?: Record<string, unknown>
) {
  try {
    const supabase = await createServiceClient()
    const headersList = await headers()
    
    const ipAddress = headersList.get('x-forwarded-for') || 
                     headersList.get('x-real-ip') || 
                     'unknown'
    const userAgent = headersList.get('user-agent') || 'unknown'

    await supabase.from('audit_logs').insert({
      user_id: userId,
      action_type: actionType,
      resource_type: resourceType,
      resource_id: resourceId,
      details: details || {},
      ip_address: ipAddress,
      user_agent: userAgent,
    })
  } catch (error) {
    // Audit-Logging sollte nie die Hauptfunktion blockieren
    console.error('Audit log error:', error)
  }
}
