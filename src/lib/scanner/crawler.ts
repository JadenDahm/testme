import * as cheerio from 'cheerio';

export interface CrawledPage {
  url: string;
  statusCode: number;
  html: string;
  headers: Record<string, string>;
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    // Remove trailing slash for non-root paths
    if (parsed.pathname !== '/' && parsed.pathname.endsWith('/')) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }
    // Remove common tracking params
    parsed.searchParams.delete('utm_source');
    parsed.searchParams.delete('utm_medium');
    parsed.searchParams.delete('utm_campaign');
    parsed.searchParams.delete('utm_content');
    parsed.searchParams.delete('utm_term');
    parsed.searchParams.delete('fbclid');
    parsed.searchParams.delete('gclid');
    return parsed.href;
  } catch {
    return url;
  }
}

export async function crawlDomain(
  domain: string,
  maxPages: number = 25,
  onProgress?: (current: number, total: number) => void
): Promise<CrawledPage[]> {
  const baseUrl = `https://${domain}`;
  const visited = new Set<string>();
  const toVisit = new Set<string>([baseUrl, `${baseUrl}/`]);
  const pages: CrawledPage[] = [];

  // ── Phase 1: Discover URLs from sitemap.xml ──────────────────
  const sitemapUrls = await parseSitemap(domain);
  for (const sUrl of sitemapUrls.slice(0, 15)) {
    toVisit.add(sUrl);
  }

  // ── Phase 2: Discover URLs from robots.txt ───────────────────
  const robotsUrls = await parseRobotsTxt(domain);
  for (const rUrl of robotsUrls) {
    toVisit.add(rUrl);
  }

  // ── Phase 3: Crawl discovered URLs ───────────────────────────
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

      // Skip very large pages (> 5MB)
      if (html.length > 5_000_000) continue;

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

      // Extract links from the page
      const $ = cheerio.load(html);

      // Extract from anchor tags
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (!href) return;
        addUrlIfValid(href, url, domain, visited, toVisit);
      });

      // Extract from link tags (alternate pages, etc.)
      $('link[href]').each((_, el) => {
        const href = $(el).attr('href');
        const rel = $(el).attr('rel') || '';
        if (href && (rel === 'alternate' || rel === 'canonical')) {
          addUrlIfValid(href, url, domain, visited, toVisit);
        }
      });

      // Extract URLs from JavaScript (basic patterns)
      $('script').each((_, el) => {
        const content = $(el).html();
        if (!content) return;

        // Match URL patterns in JavaScript
        const urlPatterns = content.match(/['"`](\/[a-zA-Z0-9_/-]+(?:\?[^'"`]*)?)[`'"]/g);
        if (urlPatterns) {
          for (const match of urlPatterns.slice(0, 20)) {
            const path = match.slice(1, -1); // Remove quotes
            if (path.startsWith('/') && !path.includes('*') && path.length < 200) {
              addUrlIfValid(path, baseUrl, domain, visited, toVisit);
            }
          }
        }
      });

      // Extract from form actions
      $('form[action]').each((_, el) => {
        const action = $(el).attr('action');
        if (action) {
          addUrlIfValid(action, url, domain, visited, toVisit);
        }
      });

      // Rate limit between requests
      await new Promise((resolve) => setTimeout(resolve, 250));
    } catch {
      // Skip pages that fail to load
    }
  }

  return pages;
}

function addUrlIfValid(
  href: string,
  baseUrl: string,
  domain: string,
  visited: Set<string>,
  toVisit: Set<string>
) {
  try {
    const absoluteUrl = new URL(href, baseUrl).href;
    const parsedUrl = new URL(absoluteUrl);

    // Only follow same-domain links
    if (
      parsedUrl.hostname !== domain &&
      parsedUrl.hostname !== `www.${domain}` &&
      !parsedUrl.hostname.endsWith(`.${domain}`)
    ) {
      return;
    }

    // Skip non-HTTP protocols
    if (!parsedUrl.protocol.startsWith('http')) return;

    // Skip anchors, tel, mailto
    if (href.startsWith('#') || href.startsWith('tel:') || href.startsWith('mailto:') || href.startsWith('javascript:')) return;

    // Skip common non-page extensions
    const ext = parsedUrl.pathname.split('.').pop()?.toLowerCase();
    const skipExtensions = [
      'pdf', 'jpg', 'jpeg', 'png', 'gif', 'svg', 'css', 'js', 'zip',
      'mp3', 'mp4', 'webp', 'ico', 'woff', 'woff2', 'ttf', 'eot',
      'map', 'xml', 'json', 'txt', 'csv', 'xls', 'xlsx', 'doc',
      'docx', 'ppt', 'pptx', 'rar', '7z', 'tar', 'gz',
    ];
    if (ext && skipExtensions.includes(ext)) return;

    const normalized = normalizeUrl(absoluteUrl);
    if (!visited.has(normalized)) {
      toVisit.add(absoluteUrl);
    }
  } catch {
    // Invalid URL
  }
}

async function parseSitemap(domain: string): Promise<string[]> {
  const urls: string[] = [];
  const sitemapUrls = [
    `https://${domain}/sitemap.xml`,
    `https://${domain}/sitemap_index.xml`,
    `https://${domain}/sitemap.xml.gz`,
  ];

  for (const sitemapUrl of sitemapUrls) {
    try {
      const response = await fetch(sitemapUrl, {
        signal: AbortSignal.timeout(8000),
        headers: { 'User-Agent': 'TestMe-Security-Scanner/1.0' },
        redirect: 'follow',
      });

      if (!response.ok) continue;

      const body = await response.text();

      // Extract URLs from sitemap
      const locMatches = body.match(/<loc>(.*?)<\/loc>/gi);
      if (locMatches) {
        for (const match of locMatches) {
          const url = match.replace(/<\/?loc>/gi, '').trim();
          if (url.startsWith('http')) {
            // Check if this is a nested sitemap
            if (url.endsWith('.xml') || url.endsWith('.xml.gz')) {
              // Parse nested sitemap (one level deep)
              try {
                const nestedResponse = await fetch(url, {
                  signal: AbortSignal.timeout(5000),
                  headers: { 'User-Agent': 'TestMe-Security-Scanner/1.0' },
                  redirect: 'follow',
                });
                if (nestedResponse.ok) {
                  const nestedBody = await nestedResponse.text();
                  const nestedLocs = nestedBody.match(/<loc>(.*?)<\/loc>/gi);
                  if (nestedLocs) {
                    for (const nestedMatch of nestedLocs.slice(0, 20)) {
                      const nestedUrl = nestedMatch.replace(/<\/?loc>/gi, '').trim();
                      if (nestedUrl.startsWith('http') && !nestedUrl.endsWith('.xml')) {
                        urls.push(nestedUrl);
                      }
                    }
                  }
                }
              } catch {
                // Ignore nested sitemap errors
              }
            } else {
              urls.push(url);
            }
          }
        }
      }

      if (urls.length > 0) break;
    } catch {
      // Sitemap not available
    }
  }

  return urls;
}

async function parseRobotsTxt(domain: string): Promise<string[]> {
  const urls: string[] = [];

  try {
    const response = await fetch(`https://${domain}/robots.txt`, {
      signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': 'TestMe-Security-Scanner/1.0' },
      redirect: 'follow',
    });

    if (!response.ok) return urls;

    const body = await response.text();
    const lines = body.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();

      // Extract disallowed paths (interesting for testing)
      if (trimmed.toLowerCase().startsWith('disallow:')) {
        const path = trimmed.substring('disallow:'.length).trim();
        if (path && path !== '/' && path.length > 1 && !path.includes('*')) {
          urls.push(`https://${domain}${path}`);
        }
      }

      // Extract sitemap URLs
      if (trimmed.toLowerCase().startsWith('sitemap:')) {
        const sitemapUrl = trimmed.substring('sitemap:'.length).trim();
        if (sitemapUrl.startsWith('http')) {
          // This will be handled by the sitemap parser
        }
      }
    }
  } catch {
    // robots.txt not available
  }

  return urls.slice(0, 10); // Only take first 10 disallowed paths
}
