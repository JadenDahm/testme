/**
 * Domain-Normalisierung und Validierung
 * Sicherheitskritisch: Verhindert Domain-Spoofing und Path-Traversal
 */

export function normalizeDomain(domain: string): string {
  // Entferne Protokoll
  let normalized = domain.replace(/^https?:\/\//i, '')
  
  // Entferne trailing slash
  normalized = normalized.replace(/\/$/, '')
  
  // Entferne Pfad und Query-Parameter
  normalized = normalized.split('/')[0]
  normalized = normalized.split('?')[0]
  
  // Entferne Port (für Verifizierung nicht relevant)
  normalized = normalized.split(':')[0]
  
  // Lowercase
  normalized = normalized.toLowerCase().trim()
  
  return normalized
}

export function validateDomain(domain: string): { valid: boolean; error?: string } {
  const normalized = normalizeDomain(domain)
  
  // Leer?
  if (!normalized || normalized.length === 0) {
    return { valid: false, error: 'Domain darf nicht leer sein' }
  }
  
  // Zu lang?
  if (normalized.length > 253) {
    return { valid: false, error: 'Domain ist zu lang (max. 253 Zeichen)' }
  }
  
  // Gültiges Domain-Format?
  // Erlaubt: example.com, sub.example.com, example.co.uk
  const domainRegex = /^([a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i
  if (!domainRegex.test(normalized)) {
    return { valid: false, error: 'Ungültiges Domain-Format' }
  }
  
  // Lokale Domains blockieren (Sicherheit)
  if (
    normalized.startsWith('localhost') ||
    normalized.startsWith('127.') ||
    normalized.startsWith('192.168.') ||
    normalized.startsWith('10.') ||
    normalized.startsWith('172.') ||
    normalized === 'localhost'
  ) {
    return { valid: false, error: 'Lokale/private IPs sind nicht erlaubt' }
  }
  
  return { valid: true }
}

export function generateVerificationToken(): string {
  // Kryptographisch sicherer Token für Domain-Verifizierung
  const array = new Uint8Array(32)
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(array)
  } else {
    // Fallback für Node.js
    const crypto = require('crypto')
    crypto.randomFillSync(array)
  }
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}
