import type { ScanFinding, Severity } from '@/types';

type FindingInput = Omit<ScanFinding, 'id' | 'scan_id' | 'created_at'>;

interface SensitiveFilePath {
  path: string;
  severity: Severity;
  title: string;
  description: string;
  recommendation: string;
}

const SENSITIVE_PATHS: SensitiveFilePath[] = [
  {
    path: '/.env',
    severity: 'critical',
    title: '.env-Datei öffentlich zugänglich',
    description: 'Die .env-Datei enthält häufig sensible Konfigurationsdaten wie Datenbankpasswörter, API-Keys und Secrets.',
    recommendation: 'Blockiere den Zugriff auf .env-Dateien in deiner Webserver-Konfiguration und stelle sicher, dass sie in .gitignore steht.',
  },
  {
    path: '/.git/config',
    severity: 'critical',
    title: 'Git-Repository öffentlich zugänglich',
    description: 'Das .git-Verzeichnis ist zugänglich. Angreifer können den gesamten Quellcode und die Git-Historie herunterladen.',
    recommendation: 'Blockiere den Zugriff auf das .git-Verzeichnis in der Webserver-Konfiguration.',
  },
  {
    path: '/.git/HEAD',
    severity: 'critical',
    title: 'Git HEAD-Datei zugänglich',
    description: 'Die Git HEAD-Datei ist öffentlich zugänglich, was auf ein exponiertes Git-Repository hinweist.',
    recommendation: 'Blockiere den Zugriff auf das gesamte .git-Verzeichnis.',
  },
  {
    path: '/wp-config.php',
    severity: 'critical',
    title: 'WordPress-Konfiguration exponiert',
    description: 'Die wp-config.php enthält Datenbankzugangsdaten und Sicherheitsschlüssel.',
    recommendation: 'Stelle sicher, dass PHP-Dateien serverseitig ausgeführt und nicht als Klartext ausgeliefert werden.',
  },
  {
    path: '/phpinfo.php',
    severity: 'high',
    title: 'phpinfo() öffentlich erreichbar',
    description: 'phpinfo() gibt detaillierte Server-Informationen preis, die Angreifern bei der Planung von Angriffen helfen.',
    recommendation: 'Lösche oder beschränke den Zugriff auf phpinfo()-Dateien.',
  },
  {
    path: '/server-status',
    severity: 'medium',
    title: 'Server-Status-Seite öffentlich',
    description: 'Die Apache/Nginx Server-Status-Seite gibt Informationen über aktive Verbindungen und Serverkonfiguration preis.',
    recommendation: 'Beschränke den Zugriff auf die Status-Seite auf interne IP-Adressen.',
  },
  {
    path: '/backup.sql',
    severity: 'critical',
    title: 'Datenbank-Backup öffentlich zugänglich',
    description: 'Ein SQL-Backup ist öffentlich erreichbar und könnte sensible Daten wie Nutzerpasswörter enthalten.',
    recommendation: 'Entferne alle Backup-Dateien aus dem öffentlich zugänglichen Verzeichnis.',
  },
  {
    path: '/database.sql',
    severity: 'critical',
    title: 'SQL-Datei öffentlich zugänglich',
    description: 'Eine SQL-Datei ist öffentlich erreichbar und könnte sensible Datenbank-Inhalte enthalten.',
    recommendation: 'Entferne SQL-Dateien aus dem Web-Verzeichnis.',
  },
  {
    path: '/.DS_Store',
    severity: 'low',
    title: 'macOS .DS_Store-Datei exponiert',
    description: '.DS_Store-Dateien können Verzeichnisstrukturen preisgeben.',
    recommendation: 'Blockiere den Zugriff auf .DS_Store-Dateien und entferne sie aus dem Repository.',
  },
  {
    path: '/robots.txt',
    severity: 'info',
    title: 'robots.txt gefunden',
    description: 'Die robots.txt-Datei ist vorhanden. Prüfe, ob keine sensiblen Pfade unbeabsichtigt aufgelistet sind.',
    recommendation: 'Überprüfe den Inhalt der robots.txt und stelle sicher, dass keine sensiblen Admin-Pfade gelistet sind.',
  },
  {
    path: '/.htaccess',
    severity: 'medium',
    title: '.htaccess-Datei öffentlich zugänglich',
    description: 'Die .htaccess-Datei enthält Server-Konfigurationen, die nicht öffentlich sein sollten.',
    recommendation: 'Konfiguriere den Webserver so, dass .htaccess-Dateien nicht ausgeliefert werden.',
  },
  {
    path: '/crossdomain.xml',
    severity: 'medium',
    title: 'crossdomain.xml mit zu offenen Regeln',
    description: 'Eine permissive crossdomain.xml kann Cross-Site-Angriffe ermöglichen.',
    recommendation: 'Beschränke die erlaubten Domains in der crossdomain.xml auf das Nötigste.',
  },
  {
    path: '/admin',
    severity: 'medium',
    title: 'Admin-Bereich öffentlich erreichbar',
    description: 'Ein Admin-Bereich ist ohne Zugriffsbeschränkung erreichbar.',
    recommendation: 'Schütze Admin-Bereiche mit Authentifizierung und beschränke den Zugriff auf bekannte IP-Adressen.',
  },
  {
    path: '/debug',
    severity: 'high',
    title: 'Debug-Endpunkt öffentlich erreichbar',
    description: 'Ein Debug-Endpunkt ist öffentlich zugänglich und könnte sensible System-Informationen preisgeben.',
    recommendation: 'Deaktiviere Debug-Endpunkte in der Produktionsumgebung.',
  },
  {
    path: '/api/docs',
    severity: 'low',
    title: 'API-Dokumentation öffentlich zugänglich',
    description: 'Die API-Dokumentation ist öffentlich sichtbar, was die Angriffsfläche vergrößert.',
    recommendation: 'Schütze die API-Dokumentation mit Authentifizierung oder beschränke den Zugriff.',
  },
];

export async function checkSensitiveFiles(domain: string): Promise<FindingInput[]> {
  const findings: FindingInput[] = [];
  const baseUrl = `https://${domain}`;

  const checks = SENSITIVE_PATHS.map(async (item) => {
    try {
      const response = await fetch(`${baseUrl}${item.path}`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(8000),
        headers: { 'User-Agent': 'TestMe-Security-Scanner/1.0' },
        redirect: 'follow',
      });

      // Only flag if we get a 200 response (actual content exists)
      if (response.ok) {
        // For info items, always add them
        if (item.severity === 'info') {
          findings.push({
            category: 'sensitive_files',
            severity: item.severity,
            title: item.title,
            description: item.description,
            affected_url: `${baseUrl}${item.path}`,
            recommendation: item.recommendation,
            details: { path: item.path, statusCode: response.status },
          });
        } else {
          // For actual sensitive files, verify with GET to check content
          const getResponse = await fetch(`${baseUrl}${item.path}`, {
            method: 'GET',
            signal: AbortSignal.timeout(8000),
            headers: { 'User-Agent': 'TestMe-Security-Scanner/1.0' },
            redirect: 'follow',
          });

          if (getResponse.ok) {
            const contentType = getResponse.headers.get('content-type') || '';
            const body = await getResponse.text();

            // Skip if it's an HTML error page (soft 404)
            if (contentType.includes('text/html') && body.length > 0) {
              const lowerBody = body.toLowerCase();
              if (lowerBody.includes('not found') || lowerBody.includes('404') || lowerBody.includes('error')) {
                return; // Likely a custom 404 page
              }
            }

            findings.push({
              category: 'sensitive_files',
              severity: item.severity,
              title: item.title,
              description: item.description,
              affected_url: `${baseUrl}${item.path}`,
              recommendation: item.recommendation,
              details: { path: item.path, statusCode: response.status, contentType },
            });
          }
        }
      }
    } catch {
      // Connection error or timeout - file likely doesn't exist
    }
  });

  // Run checks in batches of 5 to respect rate limits
  for (let i = 0; i < checks.length; i += 5) {
    await Promise.all(checks.slice(i, i + 5));
    if (i + 5 < checks.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return findings;
}
