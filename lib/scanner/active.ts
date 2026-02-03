/**
 * Active Vulnerability Scans
 * WICHTIG: Non-destructive, read-only verification techniques only
 * Nur für verifizierte Domains
 */

import { ScannerModule, ScanFinding, ScanContext, ScanProgress } from './types'

export class ActiveScanner implements ScannerModule {
  name = 'active'
  description = 'Aktive Schwachstellen-Scans (nur für verifizierte Domains)'

  async run(
    context: ScanContext,
    onProgress?: (progress: ScanProgress) => Promise<void>
  ): Promise<ScanFinding[]> {
    const findings: ScanFinding[] = []
    const baseUrl = `https://${context.domain}`

    await onProgress?.({
      stage: 'active',
      progress: 0,
      message: 'Starte aktive Scans...',
    })

    // 1. SQL Injection Tests (non-destructive)
    const sqlFindings = await this.testSQLInjection(baseUrl, context, onProgress)
    findings.push(...sqlFindings)

    await onProgress?.({
      stage: 'active',
      progress: 25,
      message: 'SQL Injection Tests abgeschlossen',
    })

    // 2. XSS Tests
    const xssFindings = await this.testXSS(baseUrl, context, onProgress)
    findings.push(...xssFindings)

    await onProgress?.({
      stage: 'active',
      progress: 50,
      message: 'XSS Tests abgeschlossen',
    })

    // 3. IDOR Detection
    const idorFindings = await this.testIDOR(baseUrl, context, onProgress)
    findings.push(...idorFindings)

    await onProgress?.({
      stage: 'active',
      progress: 75,
      message: 'IDOR Tests abgeschlossen',
    })

    // 4. Auth Bypass Checks
    const authFindings = await this.testAuthBypass(baseUrl, context, onProgress)
    findings.push(...authFindings)

    await onProgress?.({
      stage: 'active',
      progress: 100,
      message: 'Aktive Scans abgeschlossen',
    })

    return findings
  }

  private async testSQLInjection(
    baseUrl: string,
    context: ScanContext,
    onProgress?: (progress: ScanProgress) => Promise<void>
  ): Promise<ScanFinding[]> {
    const findings: ScanFinding[] = []

    // Non-destructive SQL Injection Test Payloads
    // Diese verursachen KEINE Datenänderungen, nur Fehlerprüfung
    const testPayloads = [
      { payload: "' OR '1'='1", type: 'boolean-based' },
      { payload: "' OR 1=1--", type: 'boolean-based' },
      { payload: "1' AND 1=1--", type: 'boolean-based' },
      { payload: "1' UNION SELECT NULL--", type: 'union-based' },
    ]

    // Teste auf typischen Endpunkten mit Parametern
    const testUrls = [
      `${baseUrl}/?id=TEST_PAYLOAD`,
      `${baseUrl}/search?q=TEST_PAYLOAD`,
      `${baseUrl}/user?id=TEST_PAYLOAD`,
    ]

    for (const testUrl of testUrls) {
      for (const { payload, type } of testPayloads) {
        try {
          const url = testUrl.replace('TEST_PAYLOAD', encodeURIComponent(payload))
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'User-Agent': 'SecurityScanner/1.0',
              ...context.authenticated?.headers,
            },
            signal: AbortSignal.timeout(5000),
          })

          const text = await response.text()

          // Prüfe auf SQL-Fehlermeldungen (nicht-destruktiv)
          const sqlErrorPatterns = [
            /SQL syntax.*MySQL/i,
            /Warning.*\Wmysql_/i,
            /PostgreSQL.*ERROR/i,
            /Warning.*\Wpg_/i,
            /Microsoft.*ODBC.*SQL Server/i,
            /SQLServer JDBC Driver/i,
            /ORA-\d{5}/i,
            /Oracle.*Driver/i,
          ]

          for (const pattern of sqlErrorPatterns) {
            if (pattern.test(text)) {
              findings.push({
                finding_type: 'sql_injection',
                severity: 'critical',
                title: `SQL Injection Schwachstelle gefunden (${type})`,
                description: `Die Anwendung zeigt SQL-Fehlermeldungen bei manipulierten Eingaben. Dies deutet auf eine SQL Injection Schwachstelle hin.`,
                affected_url: url,
                affected_parameter: 'id',
                proof_of_concept: `Payload: ${payload}`,
                impact: 'Angreifer können Datenbankabfragen ausführen, Daten lesen/löschen oder die Datenbankstruktur manipulieren.',
                remediation: 'Nutze Prepared Statements / Parameterized Queries. Validiere und sanitize alle Benutzereingaben.',
                owasp_category: 'A03:2021 – Injection',
                cwe_id: 'CWE-89',
                metadata: { injection_type: type, payload },
              })
              break // Nur ein Finding pro URL
            }
          }
        } catch (error) {
          // Ignoriere Timeouts/Fehler
        }
      }
    }

    return findings
  }

  private async testXSS(
    baseUrl: string,
    context: ScanContext,
    onProgress?: (progress: ScanProgress) => Promise<void>
  ): Promise<ScanFinding[]> {
    const findings: ScanFinding[] = []

    // Non-destructive XSS Test Payloads
    // Diese werden NICHT ausgeführt, nur geprüft ob sie reflektiert werden
    const testPayloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert("XSS")>',
      '<svg onload=alert("XSS")>',
      'javascript:alert("XSS")',
    ]

    const testUrls = [
      `${baseUrl}/?q=TEST_PAYLOAD`,
      `${baseUrl}/search?query=TEST_PAYLOAD`,
      `${baseUrl}/comment?text=TEST_PAYLOAD`,
    ]

    for (const testUrl of testUrls) {
      for (const payload of testPayloads) {
        try {
          const url = testUrl.replace('TEST_PAYLOAD', encodeURIComponent(payload))
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'User-Agent': 'SecurityScanner/1.0',
              ...context.authenticated?.headers,
            },
            signal: AbortSignal.timeout(5000),
          })

          const text = await response.text()

          // Prüfe ob Payload unescaped reflektiert wird
          if (text.includes(payload) || text.includes(decodeURIComponent(payload))) {
            findings.push({
              finding_type: 'xss_reflected',
              severity: 'high',
              title: 'Reflected XSS Schwachstelle gefunden',
              description: `Die Anwendung reflektiert Benutzereingaben ohne ausreichende Sanitization.`,
              affected_url: url,
              affected_parameter: 'q',
              proof_of_concept: `Payload wird unescaped reflektiert: ${payload.substring(0, 50)}...`,
              impact: 'Angreifer können JavaScript-Code in der Anwendung ausführen, Session-Cookies stehlen oder Phishing-Angriffe durchführen.',
              remediation: 'Validiere und escape alle Benutzereingaben. Nutze Content Security Policy (CSP).',
              owasp_category: 'A03:2021 – Injection',
              cwe_id: 'CWE-79',
              metadata: { payload },
            })
            break
          }
        } catch (error) {
          // Ignoriere Fehler
        }
      }
    }

    return findings
  }

  private async testIDOR(
    baseUrl: string,
    context: ScanContext,
    onProgress?: (progress: ScanProgress) => Promise<void>
  ): Promise<ScanFinding[]> {
    const findings: ScanFinding[] = []

    // IDOR (Insecure Direct Object Reference) Tests
    // Prüfe ob Ressourcen ohne Autorisierung zugänglich sind
    const testIds = ['1', '2', '100', '999', 'admin', 'test']

    for (const id of testIds) {
      try {
        const testUrls = [
          `${baseUrl}/user/${id}`,
          `${baseUrl}/api/user/${id}`,
          `${baseUrl}/profile?id=${id}`,
        ]

        for (const url of testUrls) {
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'User-Agent': 'SecurityScanner/1.0',
              ...context.authenticated?.headers,
            },
            signal: AbortSignal.timeout(5000),
          })

          // Wenn Ressource ohne Auth zugänglich ist, könnte es IDOR sein
          // (Dies ist eine vereinfachte Prüfung - in Production sollte man die Response analysieren)
          if (response.ok && response.status === 200) {
            const contentType = response.headers.get('content-type') || ''
            if (contentType.includes('application/json')) {
              // Könnte eine API-Ressource sein
              findings.push({
                finding_type: 'idor',
                severity: 'medium',
                title: 'Mögliche IDOR Schwachstelle',
                description: `Die Ressource ${url} ist ohne explizite Autorisierungsprüfung zugänglich.`,
                affected_url: url,
                impact: 'Angreifer können möglicherweise auf Ressourcen anderer Benutzer zugreifen.',
                remediation: 'Implementiere explizite Autorisierungsprüfungen für alle Ressourcen. Nutze Access Control Lists (ACLs).',
                owasp_category: 'A01:2021 – Broken Access Control',
                cwe_id: 'CWE-639',
                metadata: { tested_id: id },
              })
            }
          }
        }
      } catch (error) {
        // Ignoriere Fehler
      }
    }

    return findings
  }

  private async testAuthBypass(
    baseUrl: string,
    context: ScanContext,
    onProgress?: (progress: ScanProgress) => Promise<void>
  ): Promise<ScanFinding[]> {
    const findings: ScanFinding[] = []

    // Prüfe auf typische Auth-Bypass-Pfade
    const bypassPaths = [
      '/admin',
      '/api/admin',
      '/dashboard',
      '/admin/login',
      '/wp-admin',
      '/administrator',
    ]

    for (const path of bypassPaths) {
      try {
        const url = `${baseUrl}${path}`
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'SecurityScanner/1.0',
            ...context.authenticated?.headers,
          },
          signal: AbortSignal.timeout(5000),
        })

        // Wenn Admin-Bereich ohne Auth zugänglich ist
        if (response.ok && response.status === 200) {
          const text = await response.text()
          // Prüfe auf typische Admin-Keywords
          if (
            text.includes('admin') ||
            text.includes('dashboard') ||
            text.includes('manage')
          ) {
            findings.push({
              finding_type: 'auth_bypass',
              severity: 'high',
              title: `Möglicher Auth-Bypass: ${path}`,
              description: `Der Pfad ${path} ist ohne Authentifizierung zugänglich.`,
              affected_url: url,
              impact: 'Angreifer können möglicherweise auf geschützte Bereiche zugreifen.',
              remediation: 'Implementiere Authentifizierung und Autorisierung für alle geschützten Pfade.',
              owasp_category: 'A01:2021 – Broken Access Control',
              cwe_id: 'CWE-287',
              metadata: { path },
            })
          }
        }
      } catch (error) {
        // Ignoriere Fehler
      }
    }

    return findings
  }
}
