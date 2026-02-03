/**
 * Einfacher HTML-Parser ohne externe Dependencies
 * Ersetzt cheerio für Browser-Kompatibilität
 */

export interface ParsedElement {
  tag: string
  attributes: Record<string, string>
  text?: string
  html?: string
}

export function parseHTML(html: string): {
  links: Array<{ href: string; text?: string }>
  forms: Array<{ action: string; method: string; inputs: string[] }>
  scripts: string[]
} {
  const links: Array<{ href: string; text?: string }> = []
  const forms: Array<{ action: string; method: string; inputs: string[] }> = []
  const scripts: string[] = []

  // Extrahiere Links (a[href])
  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi
  let match
  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1]
    const text = match[2]?.replace(/<[^>]+>/g, '').trim()
    if (href) {
      links.push({ href, text })
    }
  }

  // Extrahiere Formulare
  const formRegex = /<form[^>]*>(.*?)<\/form>/gis
  while ((match = formRegex.exec(html)) !== null) {
    const formTag = html.substring(match.index, match.index + match[0].indexOf('>'))
    const formContent = match[1] || ''
    
    // Extrahiere action
    const actionMatch = formTag.match(/action=["']([^"']+)["']/i)
    const action = actionMatch ? actionMatch[1] : ''
    
    // Extrahiere method (default: GET)
    const methodMatch = formTag.match(/method=["']([^"']+)["']/i)
    const method = methodMatch ? methodMatch[1].toUpperCase() : 'GET'

    // Extrahiere Input-Namen
    const inputRegex = /<input[^>]+name=["']([^"']+)["'][^>]*>/gi
    const inputs: string[] = []
    let inputMatch
    while ((inputMatch = inputRegex.exec(formContent)) !== null) {
      inputs.push(inputMatch[1])
    }

    if (action) {
      forms.push({ action, method, inputs })
    }
  }

  // Extrahiere Script-Inhalte
  const scriptRegex = /<script[^>]*>(.*?)<\/script>/gis
  while ((match = scriptRegex.exec(html)) !== null) {
    const scriptContent = match[1]
    if (scriptContent) {
      scripts.push(scriptContent)
    }
  }

  return { links, forms, scripts }
}

export function extractTextFromHTML(html: string): string {
  // Entferne alle HTML-Tags
  return html.replace(/<[^>]+>/g, '').trim()
}
