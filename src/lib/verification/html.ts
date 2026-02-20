interface VerifyHtmlResult {
  verified: boolean;
  debug?: string;
}

export async function verifyHtmlFile(domain: string, expectedToken: string): Promise<VerifyHtmlResult> {
  const url = `https://${domain}/.well-known/testme-verify.txt`;

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TestMe-Security-Verifier/1.0)',
        'Accept': 'text/plain, */*',
      },
    });

    if (!response.ok) {
      return {
        verified: false,
        debug: `HTTP ${response.status} ${response.statusText} beim Abruf von ${url}`,
      };
    }

    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();
    
    // Check if we got HTML back instead of plain text (middleware redirect)
    if (text.includes('<!DOCTYPE') || text.includes('<html') || text.includes('<head')) {
      return {
        verified: false,
        debug: `Die URL ${url} gibt HTML zurück statt der Textdatei. Wahrscheinlich fängt eine Middleware oder ein Router die Anfrage ab. Bitte stelle sicher, dass .well-known Pfade nicht von der App-Middleware abgefangen werden.`,
      };
    }

    // Normalize: trim whitespace, remove BOM, normalize line breaks
    const normalizedText = text.trim().replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n/g, '');
    const normalizedToken = expectedToken.trim();
    
    if (normalizedText === normalizedToken) {
      return { verified: true };
    }

    // Token mismatch - provide debug info
    return {
      verified: false,
      debug: `Token stimmt nicht überein.\nErwartet (${normalizedToken.length} Zeichen): "${normalizedToken}"\nErhalten (${normalizedText.length} Zeichen): "${normalizedText.substring(0, 100)}"${normalizedText.length > 100 ? '...' : ''}\nContent-Type: ${contentType}`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return {
      verified: false,
      debug: `Netzwerkfehler beim Abruf von ${url}: ${message}`,
    };
  }
}

export async function verifyMetaTag(domain: string, expectedToken: string): Promise<boolean> {
  const url = `https://${domain}`;

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: {
        'User-Agent': 'TestMe-Security-Verifier/1.0',
      },
    });

    if (!response.ok) return false;

    const html = await response.text();
    // Look for <meta name="testme-verify" content="TOKEN">
    const regex = /<meta\s+name=["']testme-verify["']\s+content=["']([^"']+)["']/i;
    const match = html.match(regex);

    return match !== null && match[1] === expectedToken;
  } catch {
    return false;
  }
}
