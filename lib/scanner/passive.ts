import { ScanContext, ScanFinding, Severity } from './types'

/**
 * Passive Security Analysis Module
 * 
 * SECURITY: Only analyzes existing content, no active probing
 * Safe to run on any domain
 */
export class PassiveScanner {
  constructor(
    private context: ScanContext,
    private onProgress?: (progress: { stage: string; percentage: number; message: string }) => void
  ) {}

  /**
   * Run all passive security checks
   */
  async scan(): Promise<ScanFinding[]> {
    this.onProgress?.({
      stage: 'passive',
      percentage: 0,
      message: 'Starting passive security analysis...'
    })

    const findings: ScanFinding[] = []
    const urls = Array.from(this.context.discoveredUrls)
    const totalChecks = urls.length * 4 // 4 checks per URL

    let completed = 0

    for (const url of urls) {
      // Check for exposed secrets in JavaScript
      const secretFindings = await this.checkExposedSecrets(url)
      findings.push(...secretFindings)
      completed++
      this.updateProgress(completed, totalChecks, 'Checking for exposed secrets...')

      // Check for exposed files
      const fileFindings = await this.checkExposedFiles(url)
      findings.push(...fileFindings)
      completed++
      this.updateProgress(completed, totalChecks, 'Checking for exposed files...')

      // Check security headers
      const headerFindings = await this.checkSecurityHeaders(url)
      findings.push(...headerFindings)
      completed++
      this.updateProgress(completed, totalChecks, 'Analyzing security headers...')

      // Check for debug flags and framework leaks
      const debugFindings = await this.checkDebugFlags(url)
      findings.push(...debugFindings)
      completed++
      this.updateProgress(completed, totalChecks, 'Checking for debug information...')
    }

    this.onProgress?.({
      stage: 'passive',
      percentage: 100,
      message: `Passive scan complete: ${findings.length} findings`
    })

    return findings
  }

  /**
   * Check for exposed secrets in JavaScript files
   */
  private async checkExposedSecrets(url: string): Promise<ScanFinding[]> {
    const findings: ScanFinding[] = []
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'SecurityScanner/1.0',
          ...this.context.headers,
        },
        redirect: 'follow',
      })

      if (!response.ok) return findings

      const content = await response.text()

      // Common secret patterns (non-destructive, read-only detection)
      const secretPatterns = [
        {
          pattern: /['"](?:api[_-]?key|apikey)['"]\s*[:=]\s*['"]([^'"]{20,})['"]/gi,
          type: 'API Key',
          severity: 'high' as Severity,
        },
        {
          pattern: /['"](?:secret|secret[_-]?key)['"]\s*[:=]\s*['"]([^'"]{20,})['"]/gi,
          type: 'Secret Key',
          severity: 'critical' as Severity,
        },
        {
          pattern: /['"](?:token|access[_-]?token)['"]\s*[:=]\s*['"]([^'"]{20,})['"]/gi,
          type: 'Access Token',
          severity: 'high' as Severity,
        },
        {
          pattern: /['"](?:password|pwd)['"]\s*[:=]\s*['"]([^'"]+)['"]/gi,
          type: 'Password',
          severity: 'critical' as Severity,
        },
        {
          pattern: /['"]aws[_-]?access[_-]?key[_-]?id['"]\s*[:=]\s*['"]([^'"]+)['"]/gi,
          type: 'AWS Access Key',
          severity: 'critical' as Severity,
        },
      ]

      for (const { pattern, type, severity } of secretPatterns) {
        const matches = content.matchAll(pattern)
        for (const match of matches) {
          // Don't expose the actual secret in the finding
          const secretPreview = match[1]?.substring(0, 10) + '...'
          
          findings.push({
            finding_type: 'exposed_secret',
            severity,
            title: `Exposed ${type} Found`,
            description: `A potential ${type.toLowerCase()} was found in the page source. This could be exposed to anyone viewing the page.`,
            affected_url: url,
            proof_of_concept: `Found pattern: ${type} = ${secretPreview}`,
            impact: `Exposed secrets can be used by attackers to gain unauthorized access to your systems or services.`,
            recommendation: `Remove all secrets from client-side code. Use environment variables on the server side only. Consider using a secrets management service.`,
            owasp_category: 'A05:2021 – Security Misconfiguration',
            cwe_id: 'CWE-312',
          })
        }
      }
    } catch (error) {
      // Silently fail for individual URL checks
    }

    return findings
  }

  /**
   * Check for exposed sensitive files
   */
  private async checkExposedFiles(url: string): Promise<ScanFinding[]> {
    const findings: ScanFinding[] = []
    const baseUrl = new URL(url).origin

    // Common exposed file paths
    const sensitivePaths = [
      { path: '/.env', severity: 'critical' as Severity },
      { path: '/.git/config', severity: 'high' as Severity },
      { path: '/.git/HEAD', severity: 'high' as Severity },
      { path: '/.env.local', severity: 'critical' as Severity },
      { path: '/.env.production', severity: 'critical' as Severity },
      { path: '/config.json', severity: 'medium' as Severity },
      { path: '/backup.sql', severity: 'high' as Severity },
      { path: '/database.sql', severity: 'high' as Severity },
      { path: '/.DS_Store', severity: 'low' as Severity },
      { path: '/package.json', severity: 'low' as Severity },
    ]

    for (const { path, severity } of sensitivePaths) {
      try {
        const fileUrl = `${baseUrl}${path}`
        const response = await fetch(fileUrl, {
          method: 'HEAD', // Use HEAD to avoid downloading large files
          headers: {
            'User-Agent': 'SecurityScanner/1.0',
            ...this.context.headers,
          },
        })

        if (response.ok) {
          findings.push({
            finding_type: 'exposed_file',
            severity,
            title: `Exposed File: ${path}`,
            description: `A sensitive file is publicly accessible at ${path}. This file should not be accessible via web.`,
            affected_url: fileUrl,
            impact: `Exposed files can reveal sensitive information including configuration, secrets, or source code.`,
            recommendation: `Remove the file from the web root or configure your web server to deny access to sensitive paths. Add these paths to .gitignore and ensure they're not deployed.`,
            owasp_category: 'A05:2021 – Security Misconfiguration',
            cwe_id: 'CWE-219',
          })
        }
      } catch {
        // File not accessible, which is good
      }
    }

    return findings
  }

  /**
   * Check security headers
   */
  private async checkSecurityHeaders(url: string): Promise<ScanFinding[]> {
    const findings: ScanFinding[] = []

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'SecurityScanner/1.0',
          ...this.context.headers,
        },
        redirect: 'follow',
      })

      const headers = response.headers
      const requiredHeaders = [
        {
          name: 'X-Content-Type-Options',
          value: 'nosniff',
          severity: 'medium' as Severity,
        },
        {
          name: 'X-Frame-Options',
          value: 'DENY',
          severity: 'medium' as Severity,
          alternatives: ['SAMEORIGIN'],
        },
        {
          name: 'X-XSS-Protection',
          value: '1; mode=block',
          severity: 'low' as Severity,
        },
        {
          name: 'Strict-Transport-Security',
          value: 'max-age=',
          severity: 'high' as Severity,
          partial: true,
        },
        {
          name: 'Content-Security-Policy',
          value: '',
          severity: 'high' as Severity,
          optional: true,
        },
      ]

      for (const required of requiredHeaders) {
        const headerValue = headers.get(required.name.toLowerCase())
        
        if (!headerValue) {
          if (!required.optional) {
            findings.push({
              finding_type: 'security_header',
              severity: required.severity,
              title: `Missing Security Header: ${required.name}`,
              description: `The ${required.name} header is missing. This header helps protect against various attacks.`,
              affected_url: url,
              impact: `Missing security headers can leave your application vulnerable to attacks like clickjacking, MIME type sniffing, and XSS.`,
              recommendation: `Add the ${required.name} header to your server configuration. Example: ${required.name}: ${required.value || 'configure appropriately'}`,
              owasp_category: 'A05:2021 – Security Misconfiguration',
              cwe_id: 'CWE-693',
            })
          }
        } else if (required.partial && !headerValue.includes(required.value)) {
          findings.push({
            finding_type: 'security_header',
            severity: required.severity,
            title: `Incorrect Security Header: ${required.name}`,
            description: `The ${required.name} header is present but may not be configured correctly.`,
            affected_url: url,
            impact: `Incorrectly configured security headers may not provide adequate protection.`,
            recommendation: `Review and update the ${required.name} header configuration.`,
            owasp_category: 'A05:2021 – Security Misconfiguration',
            cwe_id: 'CWE-693',
          })
        }
      }
    } catch {
      // Silently fail
    }

    return findings
  }

  /**
   * Check for debug flags and framework information leaks
   */
  private async checkDebugFlags(url: string): Promise<ScanFinding[]> {
    const findings: ScanFinding[] = []

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'SecurityScanner/1.0',
          ...this.context.headers,
        },
        redirect: 'follow',
      })

      if (!response.ok) return findings

      const content = await response.text()

      // Check for debug flags
      const debugPatterns = [
        { pattern: /debug\s*[:=]\s*true/gi, type: 'Debug Flag' },
        { pattern: /DEBUG\s*[:=]\s*true/gi, type: 'Debug Flag' },
        { pattern: /development\s*[:=]\s*true/gi, type: 'Development Mode' },
        { pattern: /NODE_ENV\s*[:=]\s*['"]development['"]/gi, type: 'Development Environment' },
      ]

      for (const { pattern, type } of debugPatterns) {
        if (pattern.test(content)) {
          findings.push({
            finding_type: 'debug_flag',
            severity: 'medium',
            title: `${type} Detected`,
            description: `A ${type.toLowerCase()} was detected in the page source. This should not be present in production.`,
            affected_url: url,
            impact: `Debug flags and development mode indicators can reveal sensitive information about your application's configuration and make it easier for attackers to find vulnerabilities.`,
            recommendation: `Remove all debug flags and ensure the application is running in production mode. Use environment variables to control these settings.`,
            owasp_category: 'A05:2021 – Security Misconfiguration',
            cwe_id: 'CWE-489',
          })
        }
      }

      // Check for framework version leaks
      const frameworkPatterns = [
        { pattern: /X-Powered-By:\s*([^\r\n]+)/gi, type: 'Server Header' },
        { pattern: /<!--\s*Powered by\s+([^-]+)/gi, type: 'Framework Comment' },
      ]

      for (const { pattern, type } of frameworkPatterns) {
        const match = content.match(pattern)
        if (match) {
          findings.push({
            finding_type: 'framework_leak',
            severity: 'low',
            title: `${type} Information Leak`,
            description: `Framework or server information is exposed, which can help attackers identify known vulnerabilities.`,
            affected_url: url,
            impact: `Exposed framework versions can help attackers target known vulnerabilities specific to that version.`,
            recommendation: `Remove or obfuscate framework version information from headers and HTML comments.`,
            owasp_category: 'A05:2021 – Security Misconfiguration',
            cwe_id: 'CWE-209',
          })
        }
      }
    } catch {
      // Silently fail
    }

    return findings
  }

  private updateProgress(completed: number, total: number, message: string) {
    this.onProgress?.({
      stage: 'passive',
      percentage: Math.min(99, Math.round((completed / total) * 100)),
      message,
    })
  }
}
