import type { ScanFinding } from '@/types';

type FindingInput = Omit<ScanFinding, 'id' | 'scan_id' | 'created_at'>;

interface SensitivePath {
  path: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  recommendation: string;
}

const SENSITIVE_PATHS: SensitivePath[] = [
  // ── Environment & Config Files ─────────────────────────────────
  { path: '/.env', title: 'Environment-Datei (.env) exponiert', description: '.env-Dateien enthalten oft Datenbank-Passwörter, API-Keys und andere Geheimnisse.', severity: 'critical', recommendation: 'Blockiere den Zugriff auf .env Dateien sofort. Rotiere ALLE darin enthaltenen Zugangsdaten.' },
  { path: '/.env.local', title: '.env.local exponiert', description: 'Lokale Environment-Datei mit möglicherweise sensiblen Zugangsdaten.', severity: 'critical', recommendation: 'Blockiere den Zugriff und rotiere alle Zugangsdaten.' },
  { path: '/.env.production', title: '.env.production exponiert', description: 'Produktions-Environment mit Live-Zugangsdaten.', severity: 'critical', recommendation: 'Blockiere den Zugriff sofort und rotiere ALLE Produktions-Zugangsdaten.' },
  { path: '/.env.backup', title: '.env.backup exponiert', description: 'Backup der Environment-Datei.', severity: 'critical', recommendation: 'Lösche diese Datei und blockiere den Zugriff.' },
  { path: '/.env.bak', title: '.env.bak exponiert', description: 'Backup der Environment-Datei.', severity: 'critical', recommendation: 'Lösche diese Datei und blockiere den Zugriff.' },
  { path: '/.env.old', title: '.env.old exponiert', description: 'Alte Environment-Datei mit möglicherweise noch gültigen Zugangsdaten.', severity: 'critical', recommendation: 'Lösche diese Datei und rotiere alle Zugangsdaten.' },
  { path: '/.env.dev', title: '.env.dev exponiert', description: 'Entwicklungs-Environment-Datei.', severity: 'high', recommendation: 'Blockiere den Zugriff.' },
  { path: '/.env.staging', title: '.env.staging exponiert', description: 'Staging-Environment-Datei.', severity: 'high', recommendation: 'Blockiere den Zugriff.' },

  // ── Git ────────────────────────────────────────────────────────
  { path: '/.git/config', title: 'Git-Konfiguration exponiert', description: '.git/config kann Repository-URLs, Branches und manchmal Zugangsdaten enthalten.', severity: 'critical', recommendation: 'Blockiere den Zugriff auf das gesamte .git Verzeichnis. Entferne es vom Webserver.' },
  { path: '/.git/HEAD', title: 'Git HEAD exponiert', description: 'Git HEAD-Referenz ist öffentlich zugänglich. Dies bestätigt ein exponiertes Git-Repository.', severity: 'high', recommendation: 'Blockiere den Zugriff auf .git/ und stelle sicher, dass das Repository nicht auf dem Webserver liegt.' },
  { path: '/.git/logs/HEAD', title: 'Git-Logs exponiert', description: 'Git-Logs können Commit-Nachrichten und Autoreninfo enthalten.', severity: 'high', recommendation: 'Blockiere den Zugriff auf das .git Verzeichnis.' },
  { path: '/.gitignore', title: '.gitignore exponiert', description: '.gitignore zeigt, welche Dateien sensibel sein könnten.', severity: 'info', recommendation: 'Prüfe, ob die .gitignore Informationen über die Infrastruktur preisgibt.' },

  // ── PHP / WordPress ────────────────────────────────────────────
  { path: '/wp-config.php', title: 'WordPress-Konfiguration exponiert', description: 'wp-config.php enthält Datenbank-Zugangsdaten und WordPress-Sicherheitsschlüssel.', severity: 'critical', recommendation: 'Stelle sicher, dass PHP-Dateien ausgeführt und nicht als Text ausgeliefert werden.' },
  { path: '/wp-config.php.bak', title: 'WordPress-Konfiguration Backup exponiert', description: 'Backup der WordPress-Konfiguration mit Datenbank-Zugangsdaten.', severity: 'critical', recommendation: 'Lösche diese Datei sofort und rotiere die Datenbank-Zugangsdaten.' },
  { path: '/phpinfo.php', title: 'phpinfo() exponiert', description: 'phpinfo() zeigt detaillierte Serverinformationen, PHP-Konfiguration und Environment-Variablen.', severity: 'high', recommendation: 'Lösche die phpinfo-Datei oder beschränke den Zugriff.' },
  { path: '/info.php', title: 'PHP Info-Datei exponiert', description: 'Möglicherweise phpinfo() oder andere Serverinformationen.', severity: 'high', recommendation: 'Lösche diese Datei.' },
  { path: '/wp-config.php~', title: 'WordPress-Konfiguration Editor-Backup', description: 'Editor-Backup der WordPress-Konfiguration.', severity: 'critical', recommendation: 'Lösche diese Datei sofort.' },
  { path: '/config.php', title: 'config.php exponiert', description: 'Allgemeine Konfigurationsdatei, möglicherweise mit Zugangsdaten.', severity: 'high', recommendation: 'Stelle sicher, dass PHP-Dateien nicht als Text ausgeliefert werden.' },
  { path: '/configuration.php', title: 'Joomla configuration.php exponiert', description: 'Joomla-Konfigurationsdatei mit Datenbank-Zugangsdaten.', severity: 'critical', recommendation: 'Blockiere den Zugriff auf diese Datei.' },

  // ── Backup / Archive ───────────────────────────────────────────
  { path: '/backup.sql', title: 'SQL-Backup exponiert', description: 'Ein Datenbank-Backup ist öffentlich zugänglich. Dies kann die gesamte Datenbank enthalten.', severity: 'critical', recommendation: 'Entferne das Backup sofort vom Webserver. Speichere Backups niemals im Web-Root.' },
  { path: '/database.sql', title: 'Datenbank-Dump exponiert', description: 'Ein SQL-Dump ist öffentlich zugänglich.', severity: 'critical', recommendation: 'Entferne den Dump sofort.' },
  { path: '/dump.sql', title: 'SQL-Dump exponiert', description: 'Ein SQL-Dump ist öffentlich zugänglich.', severity: 'critical', recommendation: 'Entferne den Dump sofort.' },
  { path: '/db.sql', title: 'Datenbank-Datei exponiert', description: 'Eine SQL-Datei ist öffentlich zugänglich.', severity: 'critical', recommendation: 'Entferne diese Datei sofort.' },
  { path: '/backup.zip', title: 'Backup-Archiv exponiert', description: 'Ein ZIP-Backup ist öffentlich herunterladbar.', severity: 'critical', recommendation: 'Entferne Backups vom Webserver.' },
  { path: '/backup.tar.gz', title: 'Backup-Archiv exponiert', description: 'Ein TAR.GZ-Backup ist öffentlich herunterladbar.', severity: 'critical', recommendation: 'Entferne Backups vom Webserver.' },
  { path: '/site.zip', title: 'Website-Archiv exponiert', description: 'Das gesamte Website-Archiv könnte herunterladbar sein.', severity: 'critical', recommendation: 'Entferne diese Datei sofort.' },

  // ── Server Configuration ───────────────────────────────────────
  { path: '/.htaccess', title: '.htaccess exponiert', description: '.htaccess kann Rewrite-Regeln, Authentifizierung und Konfigurationsdetails enthalten.', severity: 'medium', recommendation: 'Konfiguriere den Webserver so, dass .htaccess nicht ausgeliefert wird.' },
  { path: '/.htpasswd', title: '.htpasswd exponiert', description: '.htpasswd enthält verschlüsselte Passwörter für HTTP-Authentifizierung.', severity: 'critical', recommendation: 'Blockiere den Zugriff sofort und ändere alle betroffenen Passwörter.' },
  { path: '/web.config', title: 'IIS web.config exponiert', description: 'IIS-Konfigurationsdatei kann Connection-Strings und Authentifizierungsdaten enthalten.', severity: 'high', recommendation: 'Blockiere den Zugriff auf web.config.' },
  { path: '/nginx.conf', title: 'Nginx-Konfiguration exponiert', description: 'Nginx-Konfiguration kann Upstream-Server, Pfade und sensible Details enthalten.', severity: 'high', recommendation: 'Entferne diese Datei vom Webserver.' },
  { path: '/httpd.conf', title: 'Apache-Konfiguration exponiert', description: 'Apache-Konfiguration kann sensible Serverdetails enthalten.', severity: 'high', recommendation: 'Entferne diese Datei vom Webserver.' },
  { path: '/server-status', title: 'Apache Server-Status exponiert', description: 'Apache mod_status zeigt aktive Verbindungen und Serverauslastung.', severity: 'medium', recommendation: 'Beschränke den Zugriff auf localhost oder deaktiviere mod_status.' },
  { path: '/server-info', title: 'Apache Server-Info exponiert', description: 'Apache mod_info zeigt die komplette Serverkonfiguration.', severity: 'high', recommendation: 'Beschränke den Zugriff oder deaktiviere mod_info.' },

  // ── Docker / CI/CD ─────────────────────────────────────────────
  { path: '/docker-compose.yml', title: 'Docker Compose exponiert', description: 'docker-compose.yml kann Service-Konfigurationen, Ports und Volumes enthalten.', severity: 'high', recommendation: 'Entferne die Datei vom Webserver.' },
  { path: '/Dockerfile', title: 'Dockerfile exponiert', description: 'Dockerfile zeigt Build-Instruktionen und möglicherweise Base-Images mit bekannten Schwachstellen.', severity: 'medium', recommendation: 'Entferne die Datei vom Webserver.' },
  { path: '/.dockerenv', title: 'Docker-Environment exponiert', description: 'Bestätigt, dass die Anwendung in einem Docker-Container läuft.', severity: 'low', recommendation: 'Blockiere den Zugriff auf diese Datei.' },
  { path: '/Jenkinsfile', title: 'Jenkinsfile exponiert', description: 'CI/CD-Pipeline-Konfiguration mit möglicherweise sensiblen Build-Schritten.', severity: 'medium', recommendation: 'Entferne die Datei vom Webserver.' },
  { path: '/.github/workflows', title: 'GitHub Actions Workflows exponiert', description: 'CI/CD-Workflows können Build-Prozesse und Deployment-Details zeigen.', severity: 'low', recommendation: 'Blockiere den Zugriff auf .github/' },
  { path: '/.gitlab-ci.yml', title: 'GitLab CI-Konfiguration exponiert', description: 'GitLab CI-Pipeline-Konfiguration.', severity: 'medium', recommendation: 'Entferne die Datei vom Webserver.' },

  // ── Package Manager ────────────────────────────────────────────
  { path: '/package.json', title: 'package.json exponiert', description: 'package.json zeigt alle Node.js-Dependencies und deren Versionen. Angreifer können nach bekannten Schwachstellen suchen.', severity: 'low', recommendation: 'Blockiere den Zugriff auf package.json.' },
  { path: '/package-lock.json', title: 'package-lock.json exponiert', description: 'Enthält exakte Versionen aller Dependencies.', severity: 'low', recommendation: 'Blockiere den Zugriff.' },
  { path: '/yarn.lock', title: 'yarn.lock exponiert', description: 'Enthält exakte Versionen aller Dependencies.', severity: 'low', recommendation: 'Blockiere den Zugriff.' },
  { path: '/composer.json', title: 'composer.json exponiert', description: 'PHP-Dependencies und deren Versionen.', severity: 'low', recommendation: 'Blockiere den Zugriff.' },
  { path: '/composer.lock', title: 'composer.lock exponiert', description: 'Exakte PHP-Dependency-Versionen.', severity: 'low', recommendation: 'Blockiere den Zugriff.' },
  { path: '/Gemfile', title: 'Gemfile exponiert', description: 'Ruby-Dependencies.', severity: 'low', recommendation: 'Blockiere den Zugriff.' },
  { path: '/requirements.txt', title: 'Python requirements.txt exponiert', description: 'Python-Dependencies und Versionen.', severity: 'low', recommendation: 'Blockiere den Zugriff.' },

  // ── IDE / Editor Files ─────────────────────────────────────────
  { path: '/.vscode/settings.json', title: 'VS Code Konfiguration exponiert', description: 'IDE-Einstellungen können Pfade und Konfigurationsdetails enthalten.', severity: 'low', recommendation: 'Blockiere den Zugriff auf .vscode/' },
  { path: '/.idea/workspace.xml', title: 'IntelliJ IDEA Workspace exponiert', description: 'IDE-Workspace kann Projekt-Konfiguration und Pfade enthalten.', severity: 'low', recommendation: 'Blockiere den Zugriff auf .idea/' },

  // ── Debug / Admin ──────────────────────────────────────────────
  { path: '/debug', title: 'Debug-Endpoint exponiert', description: 'Ein Debug-Endpoint ist öffentlich zugänglich.', severity: 'high', recommendation: 'Deaktiviere Debug-Endpunkte in der Produktion.' },
  { path: '/_debug', title: 'Debug-Endpoint exponiert', description: 'Ein Debug-Endpoint ist öffentlich zugänglich.', severity: 'high', recommendation: 'Deaktiviere Debug-Endpunkte.' },
  { path: '/trace', title: 'Trace-Endpoint exponiert', description: 'Ein Trace-Endpoint ist öffentlich zugänglich und kann sensible Request-Details zeigen.', severity: 'high', recommendation: 'Deaktiviere TRACE in der Webserver-Konfiguration.' },
  { path: '/admin', title: 'Admin-Panel öffentlich zugänglich', description: 'Ein Admin-Bereich ist ohne zusätzlichen Schutz erreichbar.', severity: 'medium', recommendation: 'Beschränke den Zugriff per IP-Whitelist, VPN oder zusätzlicher Authentifizierung.' },
  { path: '/administrator', title: 'Administrator-Panel exponiert', description: 'Admin-Panel ist öffentlich erreichbar.', severity: 'medium', recommendation: 'Beschränke den Zugriff.' },
  { path: '/wp-admin', title: 'WordPress-Admin exponiert', description: 'WordPress-Admin-Bereich ist öffentlich erreichbar.', severity: 'info', recommendation: 'Beschränke den Zugriff per IP oder Plugin.' },
  { path: '/cpanel', title: 'cPanel exponiert', description: 'cPanel ist öffentlich erreichbar.', severity: 'high', recommendation: 'Beschränke den Zugriff auf cPanel.' },
  { path: '/phpmyadmin', title: 'phpMyAdmin exponiert', description: 'phpMyAdmin ist öffentlich erreichbar.', severity: 'high', recommendation: 'Beschränke den Zugriff oder entferne phpMyAdmin vom öffentlichen Server.' },
  { path: '/adminer.php', title: 'Adminer exponiert', description: 'Adminer (Datenbank-Tool) ist öffentlich zugänglich.', severity: 'high', recommendation: 'Entferne Adminer vom Produktionsserver.' },
  { path: '/elmah.axd', title: 'ELMAH Error Log exponiert', description: 'ASP.NET Error-Logging zeigt detaillierte Fehlermeldungen.', severity: 'high', recommendation: 'Beschränke den Zugriff auf ELMAH.' },

  // ── API Documentation ──────────────────────────────────────────
  { path: '/swagger.json', title: 'Swagger/OpenAPI-Spezifikation exponiert', description: 'Die API-Dokumentation ist öffentlich zugänglich und zeigt alle Endpunkte.', severity: 'medium', recommendation: 'Beschränke den Zugriff auf die API-Dokumentation in der Produktion.' },
  { path: '/openapi.json', title: 'OpenAPI-Spezifikation exponiert', description: 'Die API-Spezifikation zeigt alle verfügbaren Endpunkte.', severity: 'medium', recommendation: 'Beschränke den Zugriff.' },
  { path: '/api-docs', title: 'API-Dokumentation exponiert', description: 'API-Dokumentation ist öffentlich zugänglich.', severity: 'medium', recommendation: 'Beschränke den Zugriff.' },
  { path: '/swagger-ui.html', title: 'Swagger UI exponiert', description: 'Interaktive API-Dokumentation ist öffentlich zugänglich.', severity: 'medium', recommendation: 'Beschränke den Zugriff in der Produktion.' },
  { path: '/graphql', title: 'GraphQL-Endpoint exponiert', description: 'Der GraphQL-Endpoint ist öffentlich erreichbar. Introspection könnte aktiviert sein.', severity: 'medium', recommendation: 'Deaktiviere GraphQL Introspection in der Produktion und implementiere Authentifizierung.' },

  // ── Log Files ──────────────────────────────────────────────────
  { path: '/error.log', title: 'Error-Log exponiert', description: 'Error-Logs können Stack-Traces, Pfade und interne Details enthalten.', severity: 'high', recommendation: 'Speichere Logs niemals im Web-Root.' },
  { path: '/access.log', title: 'Access-Log exponiert', description: 'Access-Logs zeigen alle Anfragen und können IP-Adressen enthalten.', severity: 'medium', recommendation: 'Speichere Logs nicht im Web-Root.' },
  { path: '/debug.log', title: 'Debug-Log exponiert', description: 'Debug-Logs können sensible Details enthalten.', severity: 'high', recommendation: 'Entferne Debug-Logs vom Produktionsserver.' },
  { path: '/wp-content/debug.log', title: 'WordPress Debug-Log exponiert', description: 'WordPress-Debug-Log mit detaillierten Fehlermeldungen.', severity: 'high', recommendation: 'Deaktiviere WP_DEBUG_LOG oder blockiere den Zugriff.' },
  { path: '/storage/logs/laravel.log', title: 'Laravel-Log exponiert', description: 'Laravel-Log mit Stack-Traces und Anwendungsdetails.', severity: 'high', recommendation: 'Blockiere den Zugriff auf /storage/.' },

  // ── Database Files ─────────────────────────────────────────────
  { path: '/database.sqlite', title: 'SQLite-Datenbank exponiert', description: 'Eine SQLite-Datenbank ist öffentlich herunterladbar.', severity: 'critical', recommendation: 'Entferne die Datenbank sofort vom Web-Root.' },
  { path: '/db.sqlite3', title: 'SQLite-Datenbank exponiert', description: 'Eine SQLite-Datenbank (Django) ist öffentlich herunterladbar.', severity: 'critical', recommendation: 'Entferne die Datenbank vom Web-Root.' },

  // ── Security / Miscellaneous ───────────────────────────────────
  { path: '/crossdomain.xml', title: 'crossdomain.xml exponiert', description: 'Flash/Silverlight Cross-Domain-Policy kann zu unsicherer Konfiguration führen.', severity: 'info', recommendation: 'Prüfe, ob crossdomain.xml zu permissiv konfiguriert ist.' },
  { path: '/clientaccesspolicy.xml', title: 'Silverlight Access Policy exponiert', description: 'Silverlight Cross-Domain-Policy.', severity: 'info', recommendation: 'Prüfe die Konfiguration.' },
  { path: '/robots.txt', title: 'robots.txt vorhanden', description: 'robots.txt kann interessante Pfade und versteckte Bereiche aufzeigen.', severity: 'info', recommendation: 'Prüfe, ob robots.txt keine sensiblen Pfade preisgibt.' },
  { path: '/sitemap.xml', title: 'Sitemap exponiert', description: 'Die Sitemap zeigt alle öffentlichen URLs.', severity: 'info', recommendation: 'Prüfe, ob die Sitemap keine internen URLs enthält.' },
  { path: '/.well-known/security.txt', title: 'security.txt vorhanden', description: 'security.txt ist konfiguriert (RFC 9116).', severity: 'info', recommendation: 'Keine Maßnahme erforderlich.' },

  // ── Credentials & Keys ─────────────────────────────────────────
  { path: '/id_rsa', title: 'SSH Private Key exponiert!', description: 'Ein SSH Private Key ist öffentlich herunterladbar.', severity: 'critical', recommendation: 'Entferne den Key sofort, revoziere ihn und generiere einen neuen.' },
  { path: '/.ssh/id_rsa', title: 'SSH Private Key exponiert!', description: 'SSH Private Key im .ssh Verzeichnis.', severity: 'critical', recommendation: 'Entferne den Key sofort.' },
  { path: '/credentials.json', title: 'Credentials-Datei exponiert', description: 'Eine Credentials-Datei ist öffentlich zugänglich.', severity: 'critical', recommendation: 'Entferne die Datei und rotiere alle Zugangsdaten.' },
  { path: '/secrets.json', title: 'Secrets-Datei exponiert', description: 'Eine Secrets-Datei ist öffentlich zugänglich.', severity: 'critical', recommendation: 'Entferne die Datei und rotiere alle Zugangsdaten.' },
  { path: '/firebase-adminsdk.json', title: 'Firebase Admin SDK exponiert', description: 'Firebase Service Account ist öffentlich.', severity: 'critical', recommendation: 'Entferne die Datei und rotiere den Service Account.' },
  { path: '/google-credentials.json', title: 'Google Credentials exponiert', description: 'Google Cloud Zugangsdaten.', severity: 'critical', recommendation: 'Entferne und rotiere die Credentials.' },
];

export async function checkSensitiveFiles(domain: string): Promise<FindingInput[]> {
  const findings: FindingInput[] = [];
  const baseUrl = `https://${domain}`;

  // Run checks in batches of 8 to respect rate limits
  for (let i = 0; i < SENSITIVE_PATHS.length; i += 8) {
    const batch = SENSITIVE_PATHS.slice(i, i + 8);

    const checks = batch.map(async (item) => {
      try {
        const url = `${baseUrl}${item.path}`;
        const response = await fetch(url, {
          method: 'HEAD',
          signal: AbortSignal.timeout(8000),
          headers: { 'User-Agent': 'TestMe-Security-Scanner/1.0' },
          redirect: 'follow',
        });

        // Only flag if we get a 200 response
        if (response.ok) {
          // For info items, always add them
          if (item.severity === 'info') {
            findings.push({
              category: 'sensitive_files',
              severity: item.severity,
              title: item.title,
              description: item.description,
              affected_url: url,
              recommendation: item.recommendation,
              details: { path: item.path, statusCode: response.status },
            });
            return;
          }

          // For actual sensitive files, verify with GET to check content
          const getResponse = await fetch(url, {
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
              if (
                lowerBody.includes('not found') ||
                lowerBody.includes('404') ||
                lowerBody.includes('page not found') ||
                lowerBody.includes('error') ||
                lowerBody.includes('does not exist') ||
                lowerBody.includes('not available')
              ) {
                return; // Likely a custom 404 page
              }
            }

            // Additional validation for specific file types
            if (item.path.endsWith('.sql')) {
              // Verify it looks like actual SQL
              if (!body.includes('CREATE') && !body.includes('INSERT') && !body.includes('SELECT') && !body.includes('DROP')) {
                return;
              }
            }

            if (item.path === '/.git/HEAD') {
              if (!body.startsWith('ref:') && !body.match(/^[a-f0-9]{40}/)) {
                return;
              }
            }

            if (item.path === '/.git/config') {
              if (!body.includes('[core]') && !body.includes('[remote')) {
                return;
              }
            }

            findings.push({
              category: 'sensitive_files',
              severity: item.severity,
              title: item.title,
              description: item.description,
              affected_url: url,
              recommendation: item.recommendation,
              details: {
                path: item.path,
                statusCode: response.status,
                contentType,
                bodyPreview: body.substring(0, 200),
              },
            });
          }
        }
      } catch {
        // Connection error or timeout - file likely doesn't exist
      }
    });

    await Promise.all(checks);

    // Rate limit between batches
    if (i + 8 < SENSITIVE_PATHS.length) {
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
  }

  // ── Directory Listing Check ────────────────────────────────────
  const directoryPaths = ['/', '/images/', '/uploads/', '/assets/', '/static/', '/media/', '/files/', '/backup/', '/logs/'];

  for (const dirPath of directoryPaths) {
    try {
      const response = await fetch(`${baseUrl}${dirPath}`, {
        signal: AbortSignal.timeout(5000),
        headers: { 'User-Agent': 'TestMe-Security-Scanner/1.0' },
        redirect: 'follow',
      });

      if (response.ok) {
        const body = await response.text();
        const lowerBody = body.toLowerCase();

        // Check for directory listing indicators
        if (
          (lowerBody.includes('index of') && lowerBody.includes('parent directory')) ||
          (lowerBody.includes('<title>index of') && lowerBody.includes('</title>')) ||
          (lowerBody.includes('directory listing') && lowerBody.includes('href="'))
        ) {
          findings.push({
            category: 'sensitive_files',
            severity: 'medium',
            title: `Directory Listing aktiv: ${dirPath}`,
            description: `Das Verzeichnis ${dirPath} zeigt eine Auflistung aller Dateien. Angreifer können gezielt nach sensiblen Dateien suchen.`,
            affected_url: `${baseUrl}${dirPath}`,
            recommendation: 'Deaktiviere Directory Listing in der Webserver-Konfiguration (z.B. Options -Indexes in Apache).',
            details: { path: dirPath },
          });
        }
      }
    } catch {
      // Ignore
    }
  }

  return findings;
}
