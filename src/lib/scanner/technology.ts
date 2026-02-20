import * as cheerio from 'cheerio';
import type { ScanFinding } from '@/types';

type FindingInput = Omit<ScanFinding, 'id' | 'scan_id' | 'created_at'>;

interface TechSignature {
  name: string;
  category: string;
  check: (data: PageData) => TechMatch | null;
}

interface PageData {
  html: string;
  headers: Record<string, string>;
  $: cheerio.CheerioAPI;
}

interface TechMatch {
  name: string;
  version?: string;
  category: string;
  evidence: string;
}

const TECH_SIGNATURES: TechSignature[] = [
  // CMS
  {
    name: 'WordPress',
    category: 'CMS',
    check: ({ html, $ }) => {
      const meta = $('meta[name="generator"]').attr('content') || '';
      if (meta.toLowerCase().includes('wordpress')) {
        const version = meta.match(/WordPress\s+([\d.]+)/i)?.[1];
        return { name: 'WordPress', version, category: 'CMS', evidence: `Meta-Generator: ${meta}` };
      }
      if (html.includes('/wp-content/') || html.includes('/wp-includes/')) {
        return { name: 'WordPress', category: 'CMS', evidence: 'wp-content/wp-includes Pfade erkannt' };
      }
      return null;
    },
  },
  {
    name: 'Drupal',
    category: 'CMS',
    check: ({ html, $ }) => {
      const meta = $('meta[name="generator"]').attr('content') || '';
      if (meta.toLowerCase().includes('drupal')) {
        const version = meta.match(/Drupal\s+([\d.]+)/i)?.[1];
        return { name: 'Drupal', version, category: 'CMS', evidence: `Meta-Generator: ${meta}` };
      }
      if (html.includes('Drupal.settings') || html.includes('/sites/default/files')) {
        return { name: 'Drupal', category: 'CMS', evidence: 'Drupal-Patterns im HTML erkannt' };
      }
      return null;
    },
  },
  {
    name: 'Joomla',
    category: 'CMS',
    check: ({ html, $ }) => {
      const meta = $('meta[name="generator"]').attr('content') || '';
      if (meta.toLowerCase().includes('joomla')) {
        return { name: 'Joomla', category: 'CMS', evidence: `Meta-Generator: ${meta}` };
      }
      if (html.includes('/media/jui/') || html.includes('Joomla!')) {
        return { name: 'Joomla', category: 'CMS', evidence: 'Joomla-Patterns im HTML erkannt' };
      }
      return null;
    },
  },
  {
    name: 'Shopify',
    category: 'E-Commerce',
    check: ({ html }) => {
      if (html.includes('cdn.shopify.com') || html.includes('Shopify.theme')) {
        return { name: 'Shopify', category: 'E-Commerce', evidence: 'Shopify CDN/Theme erkannt' };
      }
      return null;
    },
  },
  {
    name: 'WooCommerce',
    category: 'E-Commerce',
    check: ({ html }) => {
      if (html.includes('woocommerce') || html.includes('wc-blocks')) {
        return { name: 'WooCommerce', category: 'E-Commerce', evidence: 'WooCommerce-Klassen erkannt' };
      }
      return null;
    },
  },
  // Frameworks
  {
    name: 'Next.js',
    category: 'Framework',
    check: ({ html, headers }) => {
      if (headers['x-powered-by']?.includes('Next.js') || html.includes('__NEXT_DATA__') || html.includes('/_next/')) {
        return { name: 'Next.js', category: 'Framework', evidence: '__NEXT_DATA__ oder _next/ Pfade erkannt' };
      }
      return null;
    },
  },
  {
    name: 'Nuxt.js',
    category: 'Framework',
    check: ({ html }) => {
      if (html.includes('__NUXT__') || html.includes('/_nuxt/')) {
        return { name: 'Nuxt.js', category: 'Framework', evidence: '__NUXT__ oder _nuxt/ Pfade erkannt' };
      }
      return null;
    },
  },
  {
    name: 'React',
    category: 'JavaScript-Library',
    check: ({ html }) => {
      if (html.includes('__REACT_DEVTOOLS') || html.includes('data-reactroot') || html.includes('react-app') || html.includes('_reactRootContainer')) {
        return { name: 'React', category: 'JavaScript-Library', evidence: 'React-Marker im DOM erkannt' };
      }
      return null;
    },
  },
  {
    name: 'Vue.js',
    category: 'JavaScript-Library',
    check: ({ html }) => {
      if (html.includes('data-v-') || html.includes('__vue__') || html.includes('Vue.config')) {
        return { name: 'Vue.js', category: 'JavaScript-Library', evidence: 'Vue-Marker im DOM erkannt' };
      }
      return null;
    },
  },
  {
    name: 'Angular',
    category: 'JavaScript-Framework',
    check: ({ html }) => {
      if (html.includes('ng-version') || html.includes('ng-app') || html.includes('angular.min.js')) {
        const version = html.match(/ng-version="([\d.]+)"/)?.[1];
        return { name: 'Angular', version, category: 'JavaScript-Framework', evidence: 'Angular-Attribute erkannt' };
      }
      return null;
    },
  },
  {
    name: 'Laravel',
    category: 'Backend-Framework',
    check: ({ html, headers }) => {
      if (html.includes('csrf-token') && html.includes('laravel') || headers['set-cookie']?.includes('laravel_session')) {
        return { name: 'Laravel', category: 'Backend-Framework', evidence: 'Laravel-Session/CSRF erkannt' };
      }
      return null;
    },
  },
  {
    name: 'Django',
    category: 'Backend-Framework',
    check: ({ html, headers }) => {
      if (html.includes('csrfmiddlewaretoken') || headers['set-cookie']?.includes('csrftoken')) {
        return { name: 'Django', category: 'Backend-Framework', evidence: 'Django CSRF-Token erkannt' };
      }
      return null;
    },
  },
  {
    name: 'Ruby on Rails',
    category: 'Backend-Framework',
    check: ({ html, headers }) => {
      if (html.includes('csrf-param') && html.includes('authenticity_token') || headers['x-powered-by']?.includes('Phusion')) {
        return { name: 'Ruby on Rails', category: 'Backend-Framework', evidence: 'Rails authenticity_token erkannt' };
      }
      return null;
    },
  },
  {
    name: 'Express.js',
    category: 'Backend-Framework',
    check: ({ headers }) => {
      if (headers['x-powered-by'] === 'Express') {
        return { name: 'Express.js', category: 'Backend-Framework', evidence: 'X-Powered-By: Express' };
      }
      return null;
    },
  },
  // Web Servers
  {
    name: 'Nginx',
    category: 'Webserver',
    check: ({ headers }) => {
      const server = headers['server'] || '';
      if (server.toLowerCase().includes('nginx')) {
        const version = server.match(/nginx\/([\d.]+)/i)?.[1];
        return { name: 'Nginx', version, category: 'Webserver', evidence: `Server: ${server}` };
      }
      return null;
    },
  },
  {
    name: 'Apache',
    category: 'Webserver',
    check: ({ headers }) => {
      const server = headers['server'] || '';
      if (server.toLowerCase().includes('apache')) {
        const version = server.match(/Apache\/([\d.]+)/i)?.[1];
        return { name: 'Apache', version, category: 'Webserver', evidence: `Server: ${server}` };
      }
      return null;
    },
  },
  {
    name: 'Cloudflare',
    category: 'CDN/Proxy',
    check: ({ headers }) => {
      if (headers['server']?.includes('cloudflare') || headers['cf-ray']) {
        return { name: 'Cloudflare', category: 'CDN/Proxy', evidence: 'Cloudflare-Header erkannt' };
      }
      return null;
    },
  },
  {
    name: 'Vercel',
    category: 'Hosting',
    check: ({ headers }) => {
      if (headers['x-vercel-id'] || headers['server'] === 'Vercel') {
        return { name: 'Vercel', category: 'Hosting', evidence: 'Vercel-Header erkannt' };
      }
      return null;
    },
  },
  // CSS Frameworks
  {
    name: 'Bootstrap',
    category: 'CSS-Framework',
    check: ({ html }) => {
      if (html.includes('bootstrap.min.css') || html.includes('bootstrap.min.js')) {
        return { name: 'Bootstrap', category: 'CSS-Framework', evidence: 'Bootstrap-Assets erkannt' };
      }
      return null;
    },
  },
  {
    name: 'Tailwind CSS',
    category: 'CSS-Framework',
    check: ({ html }) => {
      // Tailwind uses utility classes
      const twPatterns = /class="[^"]*(?:flex|grid|text-(?:sm|lg|xl)|bg-(?:blue|red|green)|p-\d|m-\d|rounded)/;
      if (twPatterns.test(html)) {
        return { name: 'Tailwind CSS', category: 'CSS-Framework', evidence: 'Tailwind-Utility-Klassen erkannt' };
      }
      return null;
    },
  },
  // More Frameworks
  {
    name: 'Svelte/SvelteKit',
    category: 'Framework',
    check: ({ html }) => {
      if (html.includes('__sveltekit') || html.includes('svelte-') || html.includes('data-sveltekit')) {
        return { name: 'SvelteKit', category: 'Framework', evidence: 'SvelteKit-Marker erkannt' };
      }
      return null;
    },
  },
  {
    name: 'Gatsby',
    category: 'Framework',
    check: ({ html }) => {
      if (html.includes('___gatsby') || html.includes('gatsby-')) {
        return { name: 'Gatsby', category: 'Framework', evidence: 'Gatsby-Marker erkannt' };
      }
      return null;
    },
  },
  {
    name: 'Astro',
    category: 'Framework',
    check: ({ html }) => {
      if (html.includes('astro-') || html.includes('data-astro-')) {
        return { name: 'Astro', category: 'Framework', evidence: 'Astro-Attribute erkannt' };
      }
      return null;
    },
  },
  {
    name: 'Remix',
    category: 'Framework',
    check: ({ html }) => {
      if (html.includes('__remix') || html.includes('data-remix')) {
        return { name: 'Remix', category: 'Framework', evidence: 'Remix-Marker erkannt' };
      }
      return null;
    },
  },
  // More Web Servers
  {
    name: 'LiteSpeed',
    category: 'Webserver',
    check: ({ headers }) => {
      const server = headers['server'] || '';
      if (server.toLowerCase().includes('litespeed')) {
        const version = server.match(/LiteSpeed\/([\d.]+)/i)?.[1];
        return { name: 'LiteSpeed', version, category: 'Webserver', evidence: `Server: ${server}` };
      }
      return null;
    },
  },
  {
    name: 'Caddy',
    category: 'Webserver',
    check: ({ headers }) => {
      const server = headers['server'] || '';
      if (server.toLowerCase().includes('caddy')) {
        return { name: 'Caddy', category: 'Webserver', evidence: `Server: ${server}` };
      }
      return null;
    },
  },
  {
    name: 'IIS',
    category: 'Webserver',
    check: ({ headers }) => {
      const server = headers['server'] || '';
      if (server.toLowerCase().includes('microsoft-iis')) {
        const version = server.match(/IIS\/([\d.]+)/i)?.[1];
        return { name: 'IIS', version, category: 'Webserver', evidence: `Server: ${server}` };
      }
      return null;
    },
  },
  // CDN & Hosting
  {
    name: 'Netlify',
    category: 'Hosting',
    check: ({ headers }) => {
      if (headers['x-nf-request-id'] || headers['server'] === 'Netlify') {
        return { name: 'Netlify', category: 'Hosting', evidence: 'Netlify-Header erkannt' };
      }
      return null;
    },
  },
  {
    name: 'AWS CloudFront',
    category: 'CDN/Proxy',
    check: ({ headers }) => {
      if (headers['x-amz-cf-id'] || headers['x-amz-cf-pop'] || headers['via']?.includes('cloudfront')) {
        return { name: 'AWS CloudFront', category: 'CDN/Proxy', evidence: 'CloudFront-Header erkannt' };
      }
      return null;
    },
  },
  {
    name: 'Fastly',
    category: 'CDN/Proxy',
    check: ({ headers }) => {
      if (headers['x-served-by']?.includes('cache-') || headers['via']?.includes('varnish') && headers['x-fastly-request-id']) {
        return { name: 'Fastly', category: 'CDN/Proxy', evidence: 'Fastly-Header erkannt' };
      }
      return null;
    },
  },
  // Analytics
  {
    name: 'Google Analytics',
    category: 'Analytics',
    check: ({ html }) => {
      if (html.includes('google-analytics.com') || html.includes('gtag') || html.includes('GoogleAnalyticsObject')) {
        return { name: 'Google Analytics', category: 'Analytics', evidence: 'GA-Tracking-Code erkannt' };
      }
      return null;
    },
  },
  {
    name: 'Google Tag Manager',
    category: 'Analytics',
    check: ({ html }) => {
      if (html.includes('googletagmanager.com')) {
        return { name: 'Google Tag Manager', category: 'Analytics', evidence: 'GTM erkannt' };
      }
      return null;
    },
  },
  {
    name: 'Matomo/Piwik',
    category: 'Analytics',
    check: ({ html }) => {
      if (html.includes('matomo.js') || html.includes('piwik.js') || html.includes('_paq.push')) {
        return { name: 'Matomo', category: 'Analytics', evidence: 'Matomo/Piwik-Tracking erkannt' };
      }
      return null;
    },
  },
  {
    name: 'Plausible',
    category: 'Analytics',
    check: ({ html }) => {
      if (html.includes('plausible.io/js/')) {
        return { name: 'Plausible', category: 'Analytics', evidence: 'Plausible Analytics erkannt' };
      }
      return null;
    },
  },
  {
    name: 'Hotjar',
    category: 'Analytics',
    check: ({ html }) => {
      if (html.includes('hotjar.com') || html.includes('_hjSettings')) {
        return { name: 'Hotjar', category: 'Analytics', evidence: 'Hotjar-Tracking erkannt' };
      }
      return null;
    },
  },
  // Security & Performance
  {
    name: 'reCAPTCHA',
    category: 'Sicherheit',
    check: ({ html }) => {
      if (html.includes('google.com/recaptcha') || html.includes('grecaptcha')) {
        return { name: 'reCAPTCHA', category: 'Sicherheit', evidence: 'Google reCAPTCHA erkannt' };
      }
      return null;
    },
  },
  {
    name: 'hCaptcha',
    category: 'Sicherheit',
    check: ({ html }) => {
      if (html.includes('hcaptcha.com') || html.includes('h-captcha')) {
        return { name: 'hCaptcha', category: 'Sicherheit', evidence: 'hCaptcha erkannt' };
      }
      return null;
    },
  },
  {
    name: 'jQuery',
    category: 'JavaScript-Library',
    check: ({ html }) => {
      const match = html.match(/jquery[.-]?([\d.]+)?\.(?:min\.)?js/i);
      if (match) {
        return { name: 'jQuery', version: match[1], category: 'JavaScript-Library', evidence: 'jQuery-Script erkannt' };
      }
      if (html.includes('jQuery') || html.includes('jquery')) {
        return { name: 'jQuery', category: 'JavaScript-Library', evidence: 'jQuery-Referenz erkannt' };
      }
      return null;
    },
  },
];

export async function detectTechnology(domain: string): Promise<FindingInput[]> {
  const findings: FindingInput[] = [];
  const url = `https://${domain}`;

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'TestMe-Security-Scanner/1.0' },
      redirect: 'follow',
    });

    const html = await response.text();
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const $ = cheerio.load(html);
    const pageData: PageData = { html, headers, $ };
    const detectedTechs: TechMatch[] = [];

    for (const sig of TECH_SIGNATURES) {
      const match = sig.check(pageData);
      if (match) {
        detectedTechs.push(match);
      }
    }

    // Report detected technologies
    if (detectedTechs.length > 0) {
      const techList = detectedTechs.map((t) => `${t.name}${t.version ? ` ${t.version}` : ''} (${t.category})`);

      findings.push({
        category: 'info',
        severity: 'info',
        title: `${detectedTechs.length} Technologien erkannt`,
        description: `Folgende Technologien wurden identifiziert: ${techList.join(', ')}`,
        affected_url: url,
        recommendation: 'Stelle sicher, dass alle verwendeten Technologien auf dem neuesten Stand sind.',
        details: { technologies: detectedTechs },
      });

      // Flag specific version disclosures
      for (const tech of detectedTechs) {
        if (tech.version) {
          findings.push({
            category: 'info',
            severity: 'low',
            title: `${tech.name} Version ${tech.version} erkannt`,
            description: `${tech.name} in Version ${tech.version} wurde erkannt. Versionsinformationen helfen Angreifern, bekannte Schwachstellen gezielt auszunutzen.`,
            affected_url: url,
            recommendation: `Halte ${tech.name} stets aktuell und verberge nach Möglichkeit die Versionsinformation.`,
            details: { technology: tech.name, version: tech.version, evidence: tech.evidence },
          });
        }
      }
    }

    // Check for WordPress-specific vulnerabilities
    if (detectedTechs.some((t) => t.name === 'WordPress')) {
      await checkWordPressSecurity(domain, findings);
    }

  } catch (error) {
    findings.push({
      category: 'info',
      severity: 'info',
      title: 'Technologie-Erkennung fehlgeschlagen',
      description: `Konnte Technologien nicht erkennen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
      affected_url: url,
      recommendation: null,
      details: null,
    });
  }

  return findings;
}

async function checkWordPressSecurity(domain: string, findings: FindingInput[]) {
  const wpChecks = [
    { path: '/wp-json/wp/v2/users', title: 'WordPress REST-API Benutzerauflistung', severity: 'medium' as const },
    { path: '/wp-login.php', title: 'WordPress Login-Seite öffentlich erreichbar', severity: 'info' as const },
    { path: '/xmlrpc.php', title: 'WordPress XML-RPC aktiv', severity: 'medium' as const },
    { path: '/readme.html', title: 'WordPress Readme exponiert', severity: 'low' as const },
    { path: '/?author=1', title: 'WordPress Author Enumeration', severity: 'low' as const },
  ];

  for (const check of wpChecks) {
    try {
      const response = await fetch(`https://${domain}${check.path}`, {
        signal: AbortSignal.timeout(5000),
        headers: { 'User-Agent': 'TestMe-Security-Scanner/1.0' },
        redirect: 'follow',
      });

      if (response.ok) {
        const desc = check.path === '/xmlrpc.php'
          ? 'XML-RPC ist aktiv und kann für Brute-Force-Angriffe und DDoS-Amplification missbraucht werden.'
          : check.path === '/wp-json/wp/v2/users'
          ? 'Die WordPress REST-API gibt Benutzernamen preis, was Brute-Force-Angriffe erleichtert.'
          : `${check.title} – dies kann Angreifern Informationen über die Installation geben.`;

        findings.push({
          category: check.severity === 'info' ? 'info' : 'vulnerability',
          severity: check.severity,
          title: check.title,
          description: desc,
          affected_url: `https://${domain}${check.path}`,
          recommendation: check.path === '/xmlrpc.php'
            ? 'Deaktiviere XML-RPC, wenn nicht benötigt. Nutze ein Security-Plugin oder .htaccess.'
            : 'Beschränke den Zugriff auf diese Ressource oder deaktiviere sie.',
          details: { path: check.path },
        });
      }
    } catch {
      // Ignore
    }
    await new Promise((r) => setTimeout(r, 200));
  }
}
