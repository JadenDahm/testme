'use server'

/**
 * Scan Management Server Actions
 * Sicherheitskritisch: Nur verifizierte Domains scannen
 */

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { ScannerEngine } from '@/lib/scanner/engine'
import { ScanContext, ScanFinding } from '@/lib/scanner/types'
import { checkRateLimit } from '@/lib/utils/rate-limit'
import { logAuditEvent } from '@/lib/utils/audit'
import { revalidatePath } from 'next/cache'

export async function startScan(domainId: string, scanType: 'passive' | 'active' | 'full' = 'full') {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()
  
  if (!user) {
    return { success: false, error: 'Nicht authentifiziert' }
  }

  // Rate Limiting
  const rateLimit = await checkRateLimit(user.id, 'scan')
  if (!rateLimit.allowed) {
    return {
      success: false,
      error: `Rate Limit erreicht. Bitte versuche es später erneut.`,
    }
  }

  // Hole Domain und prüfe Verifizierung
  const { data: domain, error: domainError } = await supabase
    .from('domains')
    .select('*')
    .eq('id', domainId)
    .eq('user_id', user.id)
    .single()

  if (domainError || !domain) {
    return { success: false, error: 'Domain nicht gefunden' }
  }

  // SICHERHEIT: Blockiere Scans für nicht-verifizierte Domains
  if (domain.verification_status !== 'verified') {
    return {
      success: false,
      error: 'Domain muss zuerst verifiziert werden, bevor Scans gestartet werden können.',
    }
  }

  // Prüfe Scan-Quota
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('scan_quota, scans_used')
    .eq('id', user.id)
    .single()

  if (profile && profile.scans_used >= profile.scan_quota) {
    return {
      success: false,
      error: 'Scan-Quota erreicht. Bitte upgrade deinen Plan.',
    }
  }

  // Erstelle Scan-Eintrag
  const { data: scan, error: scanError } = await supabase
    .from('scans')
    .insert({
      user_id: user.id,
      domain_id: domainId,
      status: 'queued',
      scan_type: scanType,
      progress: 0,
    })
    .select()
    .single()

  if (scanError || !scan) {
    return { success: false, error: 'Fehler beim Erstellen des Scans' }
  }

  await logAuditEvent(user.id, 'scan_started', 'scan', scan.id, {
    domain_id: domainId,
    scan_type: scanType,
  })

  // Starte Scan asynchron (in Production: Queue-System)
  // Hier vereinfacht: direkt ausführen
  processScan(scan.id, domain.normalized_domain, user.id, scanType).catch(
    (error) => {
      console.error('Scan error:', error)
    }
  )

  revalidatePath('/dashboard')
  return { success: true, data: scan }
}

async function processScan(
  scanId: string,
  domain: string,
  userId: string,
  scanType: 'passive' | 'active' | 'full'
) {
  const supabase = await createServiceClient()
  const engine = new ScannerEngine()

  try {
    // Update Status zu "running"
    await supabase
      .from('scans')
      .update({
        status: 'running',
        started_at: new Date().toISOString(),
        progress: 0,
      })
      .eq('id', scanId)

    const context: ScanContext = {
      scanId,
      domain,
      userId,
      scanType,
    }

    // Führe Scan aus
    const findings = await engine.runScan(context, async (progress) => {
      // Update Progress in DB
      await supabase
        .from('scans')
        .update({
          progress: progress.progress,
        })
        .eq('id', scanId)

      // Log Progress
      await supabase.from('scan_logs').insert({
        scan_id: scanId,
        log_level: 'info',
        message: progress.message || `${progress.stage}: ${progress.progress}%`,
        metadata: { stage: progress.stage },
      })
    })

    // Speichere Findings
    if (findings.length > 0) {
      await supabase.from('scan_findings').insert(
        findings.map((finding) => ({
          scan_id: scanId,
          ...finding,
        }))
      )
    }

    // Berechne Security Score
    const securityScore = calculateSecurityScore(findings)

    // Zähle Findings nach Severity
    const counts = {
      critical: findings.filter((f) => f.severity === 'critical').length,
      high: findings.filter((f) => f.severity === 'high').length,
      medium: findings.filter((f) => f.severity === 'medium').length,
      low: findings.filter((f) => f.severity === 'low').length,
    }

    // Update Scan als completed
    await supabase
      .from('scans')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        progress: 100,
        security_score: securityScore,
        total_findings: findings.length,
        critical_count: counts.critical,
        high_count: counts.high,
        medium_count: counts.medium,
        low_count: counts.low,
      })
      .eq('id', scanId)

    // Erhöhe scans_used
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('scans_used')
      .eq('id', userId)
      .single()
    
    if (profile) {
      await supabase
        .from('user_profiles')
        .update({ scans_used: (profile.scans_used || 0) + 1 })
        .eq('id', userId)
    }

    await logAuditEvent(userId, 'scan_completed', 'scan', scanId, {
      total_findings: findings.length,
      security_score: securityScore,
    })
  } catch (error) {
    console.error('Scan processing error:', error)
    
    await supabase
      .from('scans')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unbekannter Fehler',
        completed_at: new Date().toISOString(),
      })
      .eq('id', scanId)

    await logAuditEvent(userId, 'scan_failed', 'scan', scanId, {
      error: String(error),
    })
  }
}

function calculateSecurityScore(findings: ScanFinding[]): number {
  let score = 100

  // Abzug basierend auf Severity
  for (const finding of findings) {
    switch (finding.severity) {
      case 'critical':
        score -= 10
        break
      case 'high':
        score -= 5
        break
      case 'medium':
        score -= 2
        break
      case 'low':
        score -= 1
        break
    }
  }

  return Math.max(0, Math.min(100, score))
}

export async function getScans(domainId?: string) {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()
  
  if (!user) {
    return { success: false, error: 'Nicht authentifiziert', data: [] }
  }

  let query = supabase
    .from('scans')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (domainId) {
    query = query.eq('domain_id', domainId)
  }

  const { data, error } = await query

  if (error) {
    return { success: false, error: 'Fehler beim Laden der Scans', data: [] }
  }

  return { success: true, data: data || [] }
}

export async function getScanFindings(scanId: string) {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()
  
  if (!user) {
    return { success: false, error: 'Nicht authentifiziert', data: [] }
  }

  // Prüfe ob Scan dem User gehört
  const { data: scan } = await supabase
    .from('scans')
    .select('id')
    .eq('id', scanId)
    .eq('user_id', user.id)
    .single()

  if (!scan) {
    return { success: false, error: 'Scan nicht gefunden', data: [] }
  }

  const { data: findings, error } = await supabase
    .from('scan_findings')
    .select('*')
    .eq('scan_id', scanId)
    .order('severity', { ascending: false })

  if (error) {
    return { success: false, error: 'Fehler beim Laden der Findings', data: [] }
  }

  return { success: true, data: findings || [] }
}

export async function cancelScan(scanId: string) {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()
  
  if (!user) {
    return { success: false, error: 'Nicht authentifiziert' }
  }

  const { error } = await supabase
    .from('scans')
    .update({ status: 'cancelled' })
    .eq('id', scanId)
    .eq('user_id', user.id)

  if (error) {
    return { success: false, error: 'Fehler beim Abbrechen des Scans' }
  }

  await logAuditEvent(user.id, 'scan_cancelled', 'scan', scanId)

  revalidatePath('/dashboard')
  return { success: true }
}
