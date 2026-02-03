/**
 * Discovery & Crawl Module
 * Findet alle erreichbaren Seiten, Routen und Endpunkte
 */

import { ScannerModule, ScanFinding, ScanContext, ScanProgress } from './types'
import { parseHTML } from '@/lib/utils/html-parser'

export class DiscoveryScanner implements ScannerModule {
  name = 'discovery'
  description = 'Crawlt Website und findet alle Routen und Endpunkte'

  private visitedUrls = new Set<string>()
  private foundUrls = new Set<string>()
  private foundEndpoints: Array<{ url: string; method: string; params: string[] }> = []

  async run(
    context: ScanContext,
    onProgress?: (progress: ScanProgress) => Promise<void>
  ): Promise<ScanFinding[]> {
    const findings: ScanFinding[] = []
    const baseUrl = `https://${context.domain}`
    
    await onProgress?.({
      stage: 'discovery',
      progress: 0,
      message: 'Starte Discovery...',
    })

    // Starte Crawl von Root
    await this.crawlUrl(baseUrl, baseUrl, context, onProgress)

    await onProgress?.({
      stage: 'discovery',
      progress: 100,
      message: `Discovery abgeschlossen: ${this.foundUrls.size} URLs gefunden`,
    })

    // Speichere gefundene URLs in Metadata für andere Scanner
    // (wird später in scan.ts verwendet)

    return findings
  }

  private async crawlUrl(
    url: string,
    baseUrl: string,
    context: ScanContext,
    onProgress?: (progress: ScanProgress) => Promise<void>
  ): Promise<void> {
    // Verhindere Endlosschleifen
    if (this.visitedUrls.has(url) || this.visitedUrls.size > 1000) {
      return
    }

    this.visitedUrls.add(url)

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'SecurityScanner/1.0',
          ...context.authenticated?.headers,
        },
        signal: AbortSignal.timeout(10000),
        redirect: 'follow',
      })

      if (!response.ok) {
        return
      }

      const contentType = response.headers.get('content-type') || ''
      if (!contentType.includes('text/html')) {
        return
      }

      const html = await response.text()
      const parsed = parseHTML(html)

      // Extrahiere Links
      for (const link of parsed.links) {
        const href = link.href
        if (!href) continue

        const absoluteUrl = this.resolveUrl(href, baseUrl, url)
        if (absoluteUrl && absoluteUrl.startsWith(baseUrl)) {
          this.foundUrls.add(absoluteUrl)
          
          // Crawle neue URLs (max. Tiefe 3)
          if (this.getUrlDepth(absoluteUrl, baseUrl) <= 3) {
            this.crawlUrl(absoluteUrl, baseUrl, context, onProgress).catch(() => {
              // Ignoriere Fehler beim Crawlen
            })
          }
        }
      }

      // Extrahiere Form-Actions (potenzielle Endpunkte)
      for (const form of parsed.forms) {
        const action = form.action
        const method = form.method || 'GET'
        if (action) {
          const absoluteUrl = this.resolveUrl(action, baseUrl, url)
          if (absoluteUrl) {
            this.foundEndpoints.push({ 
              url: absoluteUrl, 
              method, 
              params: form.inputs 
            })
          }
        }
      }

      // Extrahiere API-Calls aus JavaScript (vereinfacht)
      for (const scriptContent of parsed.scripts) {
        // Suche nach fetch(), axios(), $.ajax() etc.
        const apiPatterns = [
          /fetch\(['"]([^'"]+)['"]/g,
          /axios\.(get|post|put|delete)\(['"]([^'"]+)['"]/g,
          /\$\.ajax\([^)]*url:\s*['"]([^'"]+)['"]/g,
        ]

        for (const pattern of apiPatterns) {
          let match
          while ((match = pattern.exec(scriptContent)) !== null) {
            const apiUrl = match[1] || match[2]
            if (apiUrl) {
              const absoluteUrl = this.resolveUrl(apiUrl, baseUrl, url)
              if (absoluteUrl) {
                this.foundEndpoints.push({
                  url: absoluteUrl,
                  method: 'GET',
                  params: [],
                })
              }
            }
          }
        }
      }

      await onProgress?.({
        stage: 'discovery',
        progress: Math.min(90, (this.visitedUrls.size / 100) * 90),
        message: `${this.visitedUrls.size} Seiten gecrawlt, ${this.foundUrls.size} URLs gefunden`,
      })
    } catch (error) {
      // Ignoriere Fehler beim Crawlen einzelner URLs
      console.debug(`Crawl error for ${url}:`, error)
    }
  }

  private resolveUrl(href: string, baseUrl: string, currentUrl: string): string | null {
    try {
      // Absolute URL
      if (href.startsWith('http://') || href.startsWith('https://')) {
        return href
      }

      // Relative URL
      const base = new URL(currentUrl)
      return new URL(href, base).toString()
    } catch {
      return null
    }
  }

  private getUrlDepth(url: string, baseUrl: string): number {
    try {
      const base = new URL(baseUrl)
      const target = new URL(url)
      const basePath = base.pathname.split('/').filter(Boolean)
      const targetPath = target.pathname.split('/').filter(Boolean)
      return targetPath.length - basePath.length
    } catch {
      return 0
    }
  }

  getFoundUrls(): string[] {
    return Array.from(this.foundUrls)
  }

  getFoundEndpoints(): Array<{ url: string; method: string; params: string[] }> {
    return this.foundEndpoints
  }
}
