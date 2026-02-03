import { ScanContext, ScanFinding, Severity } from './types'

/**
 * Active Vulnerability Scanner Module
 * 
 * CRITICAL SECURITY: Only performs non-destructive, read-only verification tests
 * - No actual exploitation
 * - No data modification
 * - No brute-force attacks
 * - Strict timeouts and rate limits
 * - Only error-based detection
 */
export class ActiveScanner {
  private timeout = 5000 // 5 seconds per test
  private maxTestsPerUrl = 10

  constructor(
    private context: ScanContext,
    private onProgress?: (progress: { stage: string; percentage: number; message: string }) => void
  ) {}

  /**
   * Run all active security tests
   */
  async scan(): Promise<ScanFinding[]> {
    this.onProgress?.({
      stage: 'active',
      percentage: 0,
      message: 'Starting active vulnerability scans (read-only)...'
    })

    const findings: ScanFinding[] = []
    const urls = Array.from(this.context.discoveredUrls)
    const totalTests = urls.length * 3 // 3 test types per URL
    let completed = 0

    for (const url of urls) {
      // SQL Injection tests (error-based only, non-destructive)
      const sqlFindings = await this.testSQLInjection(url)
      findings.push(...sqlFindings)
      completed++
      this.updateProgress(completed, totalTests, 'Testing for SQL Injection...')

      // XSS tests (reflected only, no stored XSS)
      const xssFindings = await this.testXSS(url)
      findings.push(...xssFindings)
      completed++
      this.updateProgress(completed, totalTests, 'Testing for XSS vulnerabilities...')

      // IDOR detection (read-only checks)
      const idorFindings = await this.testIDOR(url)
      findings.push(...idorFindings)
      completed++
      this.updateProgress(completed, totalTests, 'Testing for IDOR vulnerabilities...')

      // Rate limiting between tests
      await this.delay(1000)
    }

    this.onProgress?.({
      stage: 'active',
      percentage: 100,
      message: `Active scan complete: ${findings.length} findings`
    })

    return findings
  }

  /**
   * Test for SQL Injection vulnerabilities (error-based, read-only)
   * 
   * SECURITY: Only sends test payloads that trigger error messages
   * Does not attempt to extract data or modify database
   */
  private async testSQLInjection(url: string): Promise<ScanFinding[]> {
    const findings: ScanFinding[] = []

    // Extract parameters from URL
    const urlObj = new URL(url)
    const params = Array.from(urlObj.searchParams.entries())

    if (params.length === 0) return findings

    // Non-destructive SQL injection test payloads (error-based only)
    const testPayloads = [
      "'",
      "''",
      "`",
      "\\",
      "' OR '1'='1",
      "' OR 1=1--",
      "1' AND '1'='1",
    ]

    for (const [paramName, paramValue] of params) {
      for (const payload of testPayloads) {
        try {
          const testUrl = new URL(url)
          testUrl.searchParams.set(paramName, payload)

          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), this.timeout)

          const response = await fetch(testUrl.toString(), {
            method: 'GET',
            signal: controller.signal,
            headers: {
              'User-Agent': 'SecurityScanner/1.0',
              ...this.context.headers,
            },
          })

          clearTimeout(timeoutId)

          const content = await response.text()

          // Check for SQL error messages (non-destructive detection)
          const sqlErrorPatterns = [
            /SQL syntax/i,
            /mysql.*error/i,
            /postgresql.*error/i,
            /ORA-\d{5}/i,
            /Microsoft.*ODBC.*SQL/i,
            /SQLite.*error/i,
            /Warning.*\Wmysql_/i,
            /valid MySQL result/i,
            /MySqlClient\./i,
            /PostgreSQL.*ERROR/i,
            /Warning.*\Wpg_/i,
            /Warning.*\Woci_/i,
            /Warning.*\Wifx_/i,
            /Exception.*SQL/i,
            /SQLException/i,
          ]

          for (const pattern of sqlErrorPatterns) {
            if (pattern.test(content)) {
              findings.push({
                finding_type: 'sql_injection',
                severity: 'critical',
                title: 'SQL Injection Vulnerability Detected',
                description: `The parameter "${paramName}" appears to be vulnerable to SQL injection. Error messages were returned when testing with SQL injection payloads.`,
                affected_url: url,
                affected_parameter: paramName,
                proof_of_concept: `Test payload used: ${payload}. The server returned SQL error messages, indicating potential SQL injection vulnerability.`,
                impact: `SQL injection can allow attackers to read, modify, or delete data from your database. In worst cases, it can lead to complete database compromise.`,
                recommendation: `Use parameterized queries (prepared statements) for all database operations. Never concatenate user input directly into SQL queries. Validate and sanitize all user input. Use an ORM that handles parameterization automatically.`,
                owasp_category: 'A03:2021 – Injection',
                cwe_id: 'CWE-89',
              })

              // Found vulnerability, no need to test more payloads for this parameter
              break
            }
          }

          // Rate limiting
          await this.delay(500)
        } catch (error) {
          // Continue with next test
          if (error instanceof Error && error.name !== 'AbortError') {
            console.error(`SQL injection test failed for ${url}:`, error)
          }
        }
      }
    }

    return findings
  }

  /**
   * Test for XSS vulnerabilities (reflected only)
   * 
   * SECURITY: Only tests for reflected XSS, does not attempt stored XSS
   * Uses harmless test payloads that don't execute malicious code
   */
  private async testXSS(url: string): Promise<ScanFinding[]> {
    const findings: ScanFinding[] = []

    const urlObj = new URL(url)
    const params = Array.from(urlObj.searchParams.entries())

    if (params.length === 0) return findings

    // Harmless XSS test payloads (won't execute, just detect reflection)
    const testPayloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert("XSS")>',
      '<svg onload=alert("XSS")>',
      'javascript:alert("XSS")',
      '<iframe src="javascript:alert(\'XSS\')">',
    ]

    for (const [paramName, paramValue] of params) {
      for (const payload of testPayloads) {
        try {
          const testUrl = new URL(url)
          testUrl.searchParams.set(paramName, payload)

          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), this.timeout)

          const response = await fetch(testUrl.toString(), {
            method: 'GET',
            signal: controller.signal,
            headers: {
              'User-Agent': 'SecurityScanner/1.0',
              ...this.context.headers,
            },
          })

          clearTimeout(timeoutId)

          const content = await response.text()

          // Check if payload is reflected in response (potential XSS)
          if (content.includes(payload) || content.includes(payload.replace(/"/g, '&quot;'))) {
            findings.push({
              finding_type: 'xss',
              severity: 'high',
              title: 'Reflected XSS Vulnerability Detected',
              description: `The parameter "${paramName}" reflects user input without proper encoding, which could lead to XSS attacks.`,
              affected_url: url,
              affected_parameter: paramName,
              proof_of_concept: `Test payload "${payload}" was reflected in the response without proper encoding.`,
              impact: `XSS vulnerabilities allow attackers to execute malicious JavaScript in users' browsers, potentially stealing session cookies, credentials, or performing actions on behalf of users.`,
              recommendation: `Encode all user input before displaying it in HTML. Use context-appropriate encoding (HTML entity encoding, JavaScript encoding, URL encoding). Consider using a templating engine that auto-escapes by default. Implement Content-Security-Policy headers.`,
              owasp_category: 'A03:2021 – Injection',
              cwe_id: 'CWE-79',
            })

            break // Found vulnerability for this parameter
          }

          await this.delay(500)
        } catch (error) {
          if (error instanceof Error && error.name !== 'AbortError') {
            console.error(`XSS test failed for ${url}:`, error)
          }
        }
      }
    }

    return findings
  }

  /**
   * Test for IDOR (Insecure Direct Object Reference) vulnerabilities
   * 
   * SECURITY: Only performs read-only checks, no data modification
   */
  private async testIDOR(url: string): Promise<ScanFinding[]> {
    const findings: ScanFinding[] = []

    // IDOR detection: Look for numeric IDs in URLs that might be enumerable
    const idPattern = /\/(\d+)(?:\/|$|\?)/g
    const matches = url.matchAll(idPattern)

    for (const match of matches) {
      const originalId = match[1]
      const testIds = [
        String(Number(originalId) + 1),
        String(Number(originalId) - 1),
        '1',
        '999999',
      ]

      for (const testId of testIds) {
        try {
          const testUrl = url.replace(`/${originalId}/`, `/${testId}/`)
            .replace(`/${originalId}?`, `/${testId}?`)
            .replace(`/${originalId}`, `/${testId}`)

          // Only test if URL actually changed
          if (testUrl === url) continue

          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), this.timeout)

          const response = await fetch(testUrl, {
            method: 'GET',
            signal: controller.signal,
            headers: {
              'User-Agent': 'SecurityScanner/1.0',
              ...this.context.headers,
            },
          })

          clearTimeout(timeoutId)

          // If we get a successful response with different ID, potential IDOR
          if (response.ok && response.status !== 404) {
            const content = await response.text()
            
            // Check if response contains data (not just a generic error page)
            if (content.length > 100 && !content.includes('404') && !content.includes('Not Found')) {
              findings.push({
                finding_type: 'idor',
                severity: 'high',
                title: 'Potential IDOR Vulnerability',
                description: `The URL appears to allow access to resources by manipulating object IDs. Accessing ID ${testId} returned data when it should be restricted.`,
                affected_url: url,
                affected_parameter: `ID parameter (${originalId} -> ${testId})`,
                proof_of_concept: `Changed ID from ${originalId} to ${testId} and received a successful response, indicating potential IDOR vulnerability.`,
                impact: `IDOR vulnerabilities allow unauthorized users to access resources they shouldn't have access to by guessing or enumerating object IDs.`,
                recommendation: `Implement proper authorization checks for all object access. Use indirect object references (mapping IDs to user-specific tokens). Implement access control lists (ACLs) to verify users have permission to access specific resources.`,
                owasp_category: 'A01:2021 – Broken Access Control',
                cwe_id: 'CWE-639',
              })

              break // Found potential IDOR
            }
          }

          await this.delay(500)
        } catch (error) {
          if (error instanceof Error && error.name !== 'AbortError') {
            console.error(`IDOR test failed for ${url}:`, error)
          }
        }
      }
    }

    return findings
  }

  private updateProgress(completed: number, total: number, message: string) {
    this.onProgress?.({
      stage: 'active',
      percentage: Math.min(99, Math.round((completed / total) * 100)),
      message,
    })
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
