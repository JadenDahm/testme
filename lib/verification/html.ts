/**
 * Verify domain ownership via HTML file under /.well-known/
 * 
 * SECURITY: Only performs a GET request to verify file existence
 * Does not perform any destructive operations
 */
export async function verifyHTMLFile(
  domain: string,
  verificationToken: string
): Promise<{ verified: boolean; error?: string }> {
  try {
    // Ensure domain has protocol
    const url = domain.startsWith('http') 
      ? `${domain}/.well-known/security-scanner-verification.txt`
      : `https://${domain}/.well-known/security-scanner-verification.txt`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout

    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'SecurityScanner/1.0 (Verification)'
        }
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        return {
          verified: false,
          error: `File not accessible (HTTP ${response.status}). Please ensure the file is publicly accessible.`
        }
      }

      const content = await response.text()
      const trimmedContent = content.trim()
      const expectedContent = verificationToken.trim()

      if (trimmedContent !== expectedContent) {
        return {
          verified: false,
          error: `File content does not match. Expected: ${expectedContent}`
        }
      }

      return { verified: true }
    } catch (fetchError) {
      clearTimeout(timeoutId)
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return {
          verified: false,
          error: 'Request timeout. Please ensure the file is accessible.'
        }
      }

      throw fetchError
    }
  } catch (error) {
    return {
      verified: false,
      error: error instanceof Error ? error.message : 'HTML file verification failed'
    }
  }
}
