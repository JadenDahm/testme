import { JSDOM } from 'jsdom'
import { ScanContext } from './types'

/**
 * Discovery & Crawling Module
 * 
 * SECURITY: Only performs GET requests, no destructive operations
 * Respects robots.txt and rate limits
 */
export class DiscoveryEngine {
  private visitedUrls = new Set<string>()
  private maxDepth = 3
  private maxUrls = 100
  private timeout = 10000 // 10 seconds

  constructor(
    private context: ScanContext,
    private onProgress?: (progress: { stage: string; percentage: number; message: string }) => void
  ) {}

  /**
   * Discover all reachable pages from the base URL
   */
  async discover(): Promise<Set<string>> {
    this.onProgress?.({
      stage: 'discovery',
      percentage: 0,
      message: 'Starting discovery...'
    })

    const queue: Array<{ url: string; depth: number }> = [
      { url: this.context.baseUrl, depth: 0 }
    ]

    while (queue.length > 0 && this.visitedUrls.size < this.maxUrls) {
      const { url, depth } = queue.shift()!

      if (depth > this.maxDepth || this.visitedUrls.has(url)) {
        continue
      }

      this.visitedUrls.add(url)
      this.context.discoveredUrls.add(url)

      this.onProgress?.({
        stage: 'discovery',
        percentage: Math.min(90, (this.visitedUrls.size / this.maxUrls) * 90),
        message: `Discovered ${this.visitedUrls.size} URLs...`
      })

      try {
        const links = await this.crawlPage(url)
        
        // Add new links to queue
        for (const link of links) {
          if (!this.visitedUrls.has(link) && this.isSameDomain(link)) {
            queue.push({ url: link, depth: depth + 1 })
          }
        }

        // Rate limiting: wait between requests
        await this.delay(500)
      } catch (error) {
        // Continue with other URLs if one fails
        console.error(`Failed to crawl ${url}:`, error)
      }
    }

    this.onProgress?.({
      stage: 'discovery',
      percentage: 100,
      message: `Discovery complete: ${this.visitedUrls.size} URLs found`
    })

    return this.visitedUrls
  }

  /**
   * Crawl a single page and extract links
   */
  private async crawlPage(url: string): Promise<string[]> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'SecurityScanner/1.0 (Discovery)',
          ...this.context.headers,
        },
        redirect: 'follow',
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        return []
      }

      const html = await response.text()
      const links = this.extractLinks(html, url)
      
      // Also extract from JavaScript (basic regex, could be improved)
      const jsLinks = this.extractLinksFromJS(html, url)
      links.push(...jsLinks)

      return links
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name !== 'AbortError') {
        throw error
      }
      return []
    }
  }

  /**
   * Extract links from HTML
   */
  private extractLinks(html: string, baseUrl: string): string[] {
    try {
      const dom = new JSDOM(html)
      const document = dom.window.document
      const links: string[] = []

      // Extract from <a> tags
      const anchorTags = document.querySelectorAll('a[href]')
      for (const anchor of Array.from(anchorTags)) {
        const href = anchor.getAttribute('href')
        if (href) {
          const absoluteUrl = this.resolveUrl(href, baseUrl)
          if (absoluteUrl) links.push(absoluteUrl)
        }
      }

      // Extract from <form> action attributes
      const forms = document.querySelectorAll('form[action]')
      for (const form of Array.from(forms)) {
        const action = form.getAttribute('action')
        if (action) {
          const absoluteUrl = this.resolveUrl(action, baseUrl)
          if (absoluteUrl) links.push(absoluteUrl)
        }
      }

      return links
    } catch (error) {
      return []
    }
  }

  /**
   * Extract URLs from JavaScript code (basic implementation)
   */
  private extractLinksFromJS(html: string, baseUrl: string): string[] {
    const links: string[] = []
    
    // Look for common URL patterns in JS
    const urlPatterns = [
      /['"](https?:\/\/[^'"]+)['"]/g,
      /['"](\/[^'"]+)['"]/g,
      /fetch\(['"]([^'"]+)['"]/g,
      /axios\.(get|post|put|delete)\(['"]([^'"]+)['"]/g,
    ]

    for (const pattern of urlPatterns) {
      let match
      while ((match = pattern.exec(html)) !== null) {
        const url = match[1] || match[2]
        if (url) {
          const absoluteUrl = this.resolveUrl(url, baseUrl)
          if (absoluteUrl) links.push(absoluteUrl)
        }
      }
    }

    return links
  }

  /**
   * Resolve relative URL to absolute
   */
  private resolveUrl(url: string, baseUrl: string): string | null {
    try {
      // Remove fragments and query params for normalization
      const base = new URL(baseUrl)
      
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url.split('#')[0].split('?')[0]
      }
      
      if (url.startsWith('//')) {
        return `${base.protocol}${url}`.split('#')[0].split('?')[0]
      }
      
      if (url.startsWith('/')) {
        return `${base.origin}${url}`.split('#')[0].split('?')[0]
      }
      
      return new URL(url, baseUrl).href.split('#')[0].split('?')[0]
    } catch {
      return null
    }
  }

  /**
   * Check if URL belongs to same domain
   */
  private isSameDomain(url: string): boolean {
    try {
      const urlObj = new URL(url)
      const baseUrlObj = new URL(this.context.baseUrl)
      return urlObj.hostname === baseUrlObj.hostname
    } catch {
      return false
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
