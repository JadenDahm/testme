// DNS verification using Google DNS API (works in serverless environments)

/**
 * Verify domain ownership via DNS TXT record
 * 
 * SECURITY: Only checks for the exact verification token in TXT records
 * Does not perform any destructive operations
 * 
 * NOTE: This uses Node.js dns module, so it must run on the server
 */
export async function verifyDNSTXTRecord(
  domain: string,
  verificationToken: string
): Promise<{ verified: boolean; error?: string }> {
  try {
    // Use external DNS lookup via API to avoid server-side DNS issues
    // In production, you might want to use a DNS API service
    const response = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=TXT`, {
      headers: {
        'Accept': 'application/json',
      },
      // Timeout after 10 seconds
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      return {
        verified: false,
        error: 'DNS lookup failed'
      }
    }

    const data = await response.json()
    
    if (!data.Answer || data.Answer.length === 0) {
      return {
        verified: false,
        error: `TXT record not found. Please add: security-scanner-verification=${verificationToken}`
      }
    }

    // Extract TXT record values
    const txtRecords = data.Answer
      .filter((record: any) => record.type === 16) // TXT record type
      .map((record: any) => record.data.replace(/^"|"$/g, '')) // Remove quotes

    // Check if verification token exists in any TXT record
    const expectedValue = `security-scanner-verification=${verificationToken}`
    const verified = txtRecords.some((record: string) => record === expectedValue)

    if (!verified) {
      return {
        verified: false,
        error: `TXT record not found. Please add: ${expectedValue}`
      }
    }

    return { verified: true }
  } catch (error) {
    return {
      verified: false,
      error: error instanceof Error ? error.message : 'DNS verification failed'
    }
  }
}
