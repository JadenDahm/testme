import * as cheerio from 'cheerio';

export interface CrawledPage {
  url: string;
  statusCode: number;
  html: string;
  headers: Record<string, string>;
}

export async function crawlDomain(
  domain: string,
  maxPages: number = 20,
  onProgress?: (current: number, total: number) => void
): Promise<CrawledPage[]> {
  const baseUrl = `https://${domain}`;
  const visited = new Set<string>();
  const toVisit = new Set<string>([baseUrl, `${baseUrl}/`]);
  const pages: CrawledPage[] = [];

  while (toVisit.size > 0 && pages.length < maxPages) {
    const url = toVisit.values().next().value;
    if (!url) break;
    toVisit.delete(url);

    const normalizedUrl = normalizeUrl(url);
    if (visited.has(normalizedUrl)) continue;
    visited.add(normalizedUrl);

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(10000),
        headers: { 'User-Agent': 'TestMe-Security-Scanner/1.0' },
        redirect: 'follow',
      });

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) continue;

      const html = await response.text();

      // Convert headers to plain object
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      pages.push({
        url: response.url || url,
        statusCode: response.status,
        html,
        headers,
      });

      if (onProgress) {
        onProgress(pages.length, maxPages);
      }

      // Extract links
      const $ = cheerio.load(html);
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (!href) return;

        try {
          const absoluteUrl = new URL(href, url).href;
          const parsedUrl = new URL(absoluteUrl);

          // Only follow same-domain links
          if (parsedUrl.hostname !== domain && parsedUrl.hostname !== `www.${domain}`) return;

          // Skip non-HTTP protocols
          if (!parsedUrl.protocol.startsWith('http')) return;

          // Skip anchors, tel, mailto
          if (href.startsWith('#') || href.startsWith('tel:') || href.startsWith('mailto:')) return;

          // Skip common non-page extensions
          const ext = parsedUrl.pathname.split('.').pop()?.toLowerCase();
          const skipExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'svg', 'css', 'js', 'zip', 'mp3', 'mp4', 'webp'];
          if (ext && skipExtensions.includes(ext)) return;

          const normalized = normalizeUrl(absoluteUrl);
          if (!visited.has(normalized)) {
            toVisit.add(absoluteUrl);
          }
        } catch {
          // Invalid URL
        }
      });

      // Rate limit between requests
      await new Promise((resolve) => setTimeout(resolve, 300));
    } catch {
      // Skip pages that fail to load
    }
  }

  return pages;
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove trailing slash, fragment, sort params
    let normalized = `${parsed.protocol}//${parsed.hostname}${parsed.pathname}`;
    normalized = normalized.replace(/\/+$/, '');
    if (parsed.search) {
      const params = new URLSearchParams(parsed.search);
      params.sort();
      normalized += `?${params.toString()}`;
    }
    return normalized.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}
