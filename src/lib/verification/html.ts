export async function verifyHtmlFile(domain: string, expectedToken: string): Promise<boolean> {
  const url = `https://${domain}/.well-known/testme-verify.txt`;

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: {
        'User-Agent': 'TestMe-Security-Verifier/1.0',
      },
    });

    if (!response.ok) return false;

    const text = await response.text();
    return text.trim() === expectedToken;
  } catch {
    return false;
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
