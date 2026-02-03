/**
 * Passive Security Analysis Module
 * SAFE: Liest nur Daten, führt keine Angriffe aus
 */

import { ScannerModule, ScanFinding, ScanContext, ScanProgress } from './types'
import * as cheerio from 'cheerio'

export class PassiveScanner implements ScannerModule {
  name = 'passive'
  description = 'Passive Sicherheitsanalyse (sicher, keine Angriffe)'

  async run(
    context: ScanContext,
    onProgress?: (progress: ScanProgress) => Promise<void>
  ): Promise<ScanFinding[]> {
    const findings: ScanFinding[] = []
    const baseUrl = `https://${context.domain}`

    await onProgress?.({
      stage: 'passive',
      progress: 0,
      message: 'Starte passive Analyse...',
    })

    // 1. HTTP Security Headers Check
    const headerFindings = await this.checkSecurityHeaders(baseUrl, context)
    findings.push(...headerFindings)

    await onProgress?.({
      stage: 'passive',
      progress: 25,
      message: 'Security Headers geprüft',
    })

    // 2. Exposed Secrets in JavaScript
    const secretFindings = await this.scanForSecrets(baseUrl, context)
    findings.push(...secretFindings)

    await onProgress?.({
      stage: 'passive',
      progress: 50,
      message: 'JavaScript auf Secrets geprüft',
    })

    // 3. Exposed Files Check
    const fileFindings = await this.checkExposedFiles(baseUrl, context)
    findings.push(...fileFindings)

    await onProgress?.({
      stage: 'passive',
      progress: 75,
      message: 'Exposed Files geprüft',
    })

    // 4. Debug Flags & Framework Leaks
    const debugFindings = await this.checkDebugFlags(baseUrl, context)
    findings.push(...debugFindings)

    await onProgress?.({
      stage: 'passive',
      progress: 100,
      message: 'Passive Analyse abgeschlossen',
    })

    return findings
  }

  private async checkSecurityHeaders(
    url: string,
    context: ScanContext
  ): Promise<ScanFinding[]> {
    const findings: ScanFinding[] = []

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'SecurityScanner/1.0',
          ...context.authenticated?.headers,
        },
        signal: AbortSignal.timeout(10000),
      })

      const headers = response.headers
      const missingHeaders: string[] = []

      // Kritische Security Headers
      const requiredHeaders = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': ['DENY', 'SAMEORIGIN'],
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': /max-age=\d+/,
        'Content-Security-Policy': /.+/,
      }

      for (const [header, expected] of Object.entries(requiredHeaders)) {
        const value = headers.get(header)
        if (!value) {
          missingHeaders.push(header)
        } else if (Array.isArray(expected)) {
          if (!expected.includes(value)) {
            findings.push({
              finding_type: 'insecure_header',
              severity: 'medium',
              title: `Ungültiger Wert für ${header}`,
              description: `${header} ist vorhanden, hat aber einen unsicheren Wert: ${value}`,
              affected_url: url,
              impact: 'Die Website ist anfällig für bestimmte Angriffe',
              remediation: `Setze ${header} auf einen sicheren Wert`,
              owasp_category: 'A05:2021 – Security Misconfiguration',
              cwe_id: 'CWE-693',
            })
          }
        } else if (expected instanceof RegExp) {
          if (!expected.test(value)) {
            findings.push({
              finding_type: 'insecure_header',
              severity: 'medium',
              title: `Ungültiger Wert für ${header}`,
              description: `${header} hat einen unsicheren Wert: ${value}`,
              affected_url: url,
              impact: 'Die Website ist anfällig für bestimmte Angriffe',
              remediation: `Setze ${header} auf einen sicheren Wert`,
              owasp_category: 'A05:2021 – Security Misconfiguration',
              cwe_id: 'CWE-693',
            })
          }
        }
      }

      if (missingHeaders.length > 0) {
        findings.push({
          finding_type: 'missing_security_headers',
          severity: 'medium',
          title: 'Fehlende Security Headers',
          description: `Die folgenden Security Headers fehlen: ${missingHeaders.join(', ')}`,
          affected_url: url,
          impact: 'Die Website ist anfällig für verschiedene Angriffe (Clickjacking, XSS, etc.)',
          remediation: `Füge die fehlenden Headers hinzu: ${missingHeaders.join(', ')}`,
          owasp_category: 'A05:2021 – Security Misconfiguration',
          cwe_id: 'CWE-693',
        })
      }
    } catch (error) {
      console.error('Security headers check error:', error)
    }

    return findings
  }

  private async scanForSecrets(
    url: string,
    context: ScanContext
  ): Promise<ScanFinding[]> {
    const findings: ScanFinding[] = []

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'SecurityScanner/1.0',
          ...context.authenticated?.headers,
        },
        signal: AbortSignal.timeout(10000),
      })

      const html = await response.text()
      const $ = cheerio.load(html)

      // Suche in JavaScript
      $('script').each((_, element) => {
        const scriptContent = $(element).html() || ''

        // API Keys, Tokens, Secrets Patterns
        const secretPatterns = [
          {
            pattern: /(api[_-]?key|apikey)\s*[:=]\s*['"]([^'"]{20,})['"]/gi,
            name: 'API Key',
            severity: 'high' as const,
          },
          {
            pattern: /(secret|token|password)\s*[:=]\s*['"]([^'"]{10,})['"]/gi,
            name: 'Secret/Token',
            severity: 'high' as const,
          },
          {
            pattern: /(aws[_-]?access[_-]?key[_-]?id)\s*[:=]\s*['"]([^'"]+)['"]/gi,
            name: 'AWS Access Key',
            severity: 'critical' as const,
          },
          {
            pattern: /(private[_-]?key|rsa[_-]?private[_-]?key)\s*[:=]\s*['"]([^'"]{50,})['"]/gi,
            name: 'Private Key',
            severity: 'critical' as const,
          },
        ]

        for (const { pattern, name, severity } of secretPatterns) {
          let match
          while ((match = pattern.exec(scriptContent)) !== null) {
            const secretValue = match[2]
            // Ignoriere offensichtliche Platzhalter
            if (
              secretValue.includes('your-') ||
              secretValue.includes('example') ||
              secretValue.includes('placeholder')
            ) {
              continue
            }

            findings.push({
              finding_type: 'exposed_secret',
              severity,
              title: `Exposed ${name} in JavaScript gefunden`,
              description: `Ein ${name} wurde im JavaScript-Code gefunden. Dies ist ein kritisches Sicherheitsrisiko.`,
              affected_url: url,
              proof_of_concept: `Gefunden: ${match[0].substring(0, 50)}...`,
              impact: `Der ${name} kann von Angreifern extrahiert werden und missbraucht werden.`,
              remediation: `Entferne alle Secrets aus dem Client-seitigen Code. Nutze Environment Variables auf dem Server.`,
              owasp_category: 'A01:2021 – Broken Access Control',
              cwe_id: 'CWE-798',
              metadata: {
                secret_type: name,
                line_preview: match[0].substring(0, 100),
              },
            })
          }
        }
      })
    } catch (error) {
      console.error('Secret scan error:', error)
    }

    return findings
  }

  private async checkExposedFiles(
    baseUrl: string,
    context: ScanContext
  ): Promise<ScanFinding[]> {
    const findings: ScanFinding[] = []

    // Liste von gefährlichen Dateien, die nicht öffentlich zugänglich sein sollten
    const dangerousFiles = [
      { path: '/.env', severity: 'critical' as const },
      { path: '/.git/config', severity: 'high' as const },
      { path: '/.git/HEAD', severity: 'high' as const },
      { path: '/.env.local', severity: 'critical' as const },
      { path: '/.env.production', severity: 'critical' as const },
      { path: '/config.json', severity: 'medium' as const },
      { path: '/backup.sql', severity: 'high' as const },
      { path: '/database.sql', severity: 'high' as const },
      { path: '/.htaccess', severity: 'low' as const },
      { path: '/phpinfo.php', severity: 'medium' as const },
    ]

    for (const file of dangerousFiles) {
      try {
        const url = `${baseUrl}${file.path}`
        const response = await fetch(url, {
          method: 'HEAD',
          headers: {
            'User-Agent': 'SecurityScanner/1.0',
            ...context.authenticated?.headers,
          },
          signal: AbortSignal.timeout(5000),
        })

        if (response.ok) {
          findings.push({
            finding_type: 'exposed_file',
            severity: file.severity,
            title: `Exposed File gefunden: ${file.path}`,
            description: `Die Datei ${file.path} ist öffentlich zugänglich und sollte nicht im Web-Root liegen.`,
            affected_url: url,
            impact: 'Sensible Informationen können von Angreifern abgerufen werden.',
            remediation: `Entferne ${file.path} aus dem öffentlichen Verzeichnis oder blockiere den Zugriff via .htaccess / Server-Konfiguration.`,
            owasp_category: 'A05:2021 – Security Misconfiguration',
            cwe_id: 'CWE-219',
          })
        }
      } catch {
        // Datei nicht gefunden = gut
      }
    }

    return findings
  }

  private async checkDebugFlags(
    url: string,
    context: ScanContext
  ): Promise<ScanFinding[]> {
    const findings: ScanFinding[] = []

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'SecurityScanner/1.0',
          ...context.authenticated?.headers,
        },
        signal: AbortSignal.timeout(10000),
      })

      const html = await response.text()
      const $ = cheerio.load(html)

      // Suche nach Debug-Flags in HTML/Comments
      const htmlText = $.html()

      // Debug-Modi in verschiedenen Frameworks
      const debugPatterns = [
        { pattern: /debug\s*[:=]\s*true/gi, name: 'Debug Mode', severity: 'medium' as const },
        { pattern: /APP_DEBUG\s*[:=]\s*true/gi, name: 'Laravel Debug', severity: 'high' as const },
        { pattern: /DEBUG\s*[:=]\s*True/gi, name: 'Django Debug', severity: 'high' as const },
        { pattern: /NODE_ENV\s*[:=]\s*['"]development['"]/gi, name: 'Development Mode', severity: 'medium' as const },
      ]

      for (const { pattern, name, severity } of debugPatterns) {
        if (pattern.test(htmlText)) {
          findings.push({
            finding_type: 'debug_flag',
            severity,
            title: `${name} aktiviert`,
            description: `Debug-Modus ist in der Production-Umgebung aktiviert.`,
            affected_url: url,
            impact: 'Debug-Modi können sensible Informationen preisgeben und Performance-Probleme verursachen.',
            remediation: `Deaktiviere den Debug-Modus in der Production-Umgebung.`,
            owasp_category: 'A05:2021 – Security Misconfiguration',
            cwe_id: 'CWE-489',
          })
        }
      }

      // Framework-Version Leaks
      const versionPatterns = [
        { pattern: /X-Powered-By:\s*([^\r\n]+)/gi, name: 'X-Powered-By Header' },
        { pattern: /<!--\s*Powered by\s+([^>]+)-->/gi, name: 'Framework Comment' },
      ]

      for (const { pattern, name } of versionPatterns) {
        let match
        while ((match = pattern.exec(htmlText)) !== null) {
          findings.push({
            finding_type: 'framework_leak',
            severity: 'low',
            title: `${name} offenbart Framework-Version`,
            description: `Die ${name} zeigt Framework-Informationen: ${match[1]}`,
            affected_url: url,
            impact: 'Angreifer können bekannte Schwachstellen für diese Version ausnutzen.',
            remediation: `Entferne ${name} oder verstecke Framework-Informationen.`,
            owasp_category: 'A05:2021 – Security Misconfiguration',
            cwe_id: 'CWE-200',
          })
        }
      }
    } catch (error) {
      console.error('Debug flags check error:', error)
    }

    return findings
  }
}
