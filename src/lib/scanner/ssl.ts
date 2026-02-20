import * as https from 'node:https';
import * as tls from 'node:tls';
import { Resolver } from 'dns/promises';
import { fetchWithRetry } from './utils';
import type { ScanFinding } from '@/types';

type FindingInput = Omit<ScanFinding, 'id' | 'scan_id' | 'created_at'>;

interface CertificateInfo {
  subject: string;
  issuer: string;
  validFrom: Date;
  validTo: Date;
  daysUntilExpiry: number;
  serialNumber: string;
  fingerprint: string;
  protocol: string | null;
  cipher: string;
  subjectAltNames: string[];
  selfSigned: boolean;
}

function getCertificateInfo(domain: string): Promise<CertificateInfo> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: domain,
        port: 443,
        method: 'HEAD',
        path: '/',
        timeout: 10000,
        rejectUnauthorized: false, // We want to inspect even invalid certs
        headers: { 'User-Agent': 'TestMe-Security-Scanner/1.0' },
      },
      (res) => {
        const socket = res.socket as tls.TLSSocket;
        const cert = socket.getPeerCertificate(true);
        const protocol = socket.getProtocol?.() || null;
        const cipherInfo = socket.getCipher?.();

        const validFrom = new Date(cert.valid_from);
        const validTo = new Date(cert.valid_to);
        const now = new Date();
        const daysUntilExpiry = Math.floor(
          (validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Check if self-signed
        const isSelfSigned =
          cert.issuer &&
          cert.subject &&
          JSON.stringify(cert.issuer) === JSON.stringify(cert.subject);

        // Get Subject Alternative Names
        const sanString = cert.subjectaltname || '';
        const sans = sanString
          .split(',')
          .map((s: string) => s.trim().replace('DNS:', ''))
          .filter(Boolean);

        resolve({
          subject: cert.subject?.CN || '',
          issuer: cert.issuer?.O || cert.issuer?.CN || '',
          validFrom,
          validTo,
          daysUntilExpiry,
          serialNumber: cert.serialNumber || '',
          fingerprint: cert.fingerprint256 || cert.fingerprint || '',
          protocol,
          cipher: cipherInfo?.name || '',
          subjectAltNames: sans,
          selfSigned: !!isSelfSigned,
        });

        res.destroy();
      }
    );

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout bei SSL-Verbindung'));
    });
    req.end();
  });
}

function testTlsVersion(
  domain: string,
  minVersion: tls.SecureVersion,
  maxVersion: tls.SecureVersion
): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = tls.connect(
      {
        host: domain,
        port: 443,
        maxVersion,
        minVersion,
        timeout: 5000,
        rejectUnauthorized: false,
      },
      () => {
        socket.destroy();
        resolve(true);
      }
    );
    socket.on('error', () => resolve(false));
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

export async function checkSsl(domain: string): Promise<FindingInput[]> {
  const findings: FindingInput[] = [];
  const url = `https://${domain}`;

  // ── 1. Deep Certificate Analysis ──────────────────────────────────────
  try {
    const certInfo = await getCertificateInfo(domain);

    // Report TLS version
    if (certInfo.protocol) {
      const isModern = certInfo.protocol === 'TLSv1.3';
      findings.push({
        category: 'ssl',
        severity: isModern ? 'info' : 'info',
        title: `TLS-Version: ${certInfo.protocol}`,
        description: `Die Verbindung nutzt ${certInfo.protocol}. ${
          isModern
            ? 'TLS 1.3 ist die aktuellste und sicherste Version.'
            : certInfo.protocol === 'TLSv1.2'
            ? 'TLS 1.2 ist noch sicher, aber ein Upgrade auf TLS 1.3 wird empfohlen.'
            : 'Diese TLS-Version ist veraltet und unsicher.'
        }`,
        affected_url: url,
        recommendation: isModern
          ? null
          : 'Konfiguriere deinen Server für TLS 1.3 als bevorzugte Version.',
        details: { protocol: certInfo.protocol, cipher: certInfo.cipher },
      });
    }

    // Report cipher suite
    if (certInfo.cipher) {
      const weakCiphers = ['RC4', 'DES', '3DES', 'MD5', 'NULL', 'EXPORT', 'anon'];
      const isWeak = weakCiphers.some((wc) =>
        certInfo.cipher.toUpperCase().includes(wc)
      );
      if (isWeak) {
        findings.push({
          category: 'ssl',
          severity: 'high',
          title: 'Schwache Cipher-Suite erkannt',
          description: `Die Cipher-Suite "${certInfo.cipher}" enthält bekannt unsichere Algorithmen.`,
          affected_url: url,
          recommendation:
            'Konfiguriere den Server so, dass nur moderne Cipher-Suites (AES-GCM, ChaCha20) erlaubt sind.',
          details: { cipher: certInfo.cipher },
        });
      }
    }

    // Self-signed certificate
    if (certInfo.selfSigned) {
      findings.push({
        category: 'ssl',
        severity: 'critical',
        title: 'Selbstsigniertes Zertifikat erkannt',
        description:
          'Das SSL-Zertifikat ist selbstsigniert und wird von Browsern als unsicher eingestuft. Besucher sehen eine Sicherheitswarnung.',
        affected_url: url,
        recommendation:
          "Verwende ein Zertifikat von einer vertrauenswürdigen Zertifizierungsstelle (CA). Let's Encrypt bietet kostenlose Zertifikate.",
        details: {
          subject: certInfo.subject,
          issuer: certInfo.issuer,
        },
      });
    }

    // Certificate expiry
    if (certInfo.daysUntilExpiry < 0) {
      findings.push({
        category: 'ssl',
        severity: 'critical',
        title: 'SSL-Zertifikat ist abgelaufen!',
        description: `Das Zertifikat ist seit ${Math.abs(certInfo.daysUntilExpiry)} Tagen abgelaufen (${certInfo.validTo.toLocaleDateString('de-DE')}). Browser zeigen eine Sicherheitswarnung an.`,
        affected_url: url,
        recommendation: 'Erneuere das SSL-Zertifikat sofort.',
        details: {
          validTo: certInfo.validTo.toISOString(),
          daysExpired: Math.abs(certInfo.daysUntilExpiry),
        },
      });
    } else if (certInfo.daysUntilExpiry <= 14) {
      findings.push({
        category: 'ssl',
        severity: 'high',
        title: `SSL-Zertifikat läuft in ${certInfo.daysUntilExpiry} Tagen ab!`,
        description: `Das Zertifikat läuft am ${certInfo.validTo.toLocaleDateString('de-DE')} ab. Ohne rechtzeitige Erneuerung werden Besucher eine Sicherheitswarnung sehen.`,
        affected_url: url,
        recommendation:
          'Erneuere das SSL-Zertifikat umgehend. Richte automatische Erneuerung ein (z.B. certbot).',
        details: {
          validTo: certInfo.validTo.toISOString(),
          daysUntilExpiry: certInfo.daysUntilExpiry,
        },
      });
    } else if (certInfo.daysUntilExpiry <= 30) {
      findings.push({
        category: 'ssl',
        severity: 'medium',
        title: `SSL-Zertifikat läuft in ${certInfo.daysUntilExpiry} Tagen ab`,
        description: `Das Zertifikat läuft am ${certInfo.validTo.toLocaleDateString('de-DE')} ab.`,
        affected_url: url,
        recommendation:
          'Plane die Erneuerung des Zertifikats ein. Automatische Erneuerung wird empfohlen.',
        details: {
          validTo: certInfo.validTo.toISOString(),
          daysUntilExpiry: certInfo.daysUntilExpiry,
        },
      });
    } else {
      findings.push({
        category: 'ssl',
        severity: 'info',
        title: 'SSL-Zertifikat gültig',
        description: `Das Zertifikat ist noch ${certInfo.daysUntilExpiry} Tage gültig (bis ${certInfo.validTo.toLocaleDateString('de-DE')}). Aussteller: ${certInfo.issuer}.`,
        affected_url: url,
        recommendation: null,
        details: {
          subject: certInfo.subject,
          issuer: certInfo.issuer,
          validTo: certInfo.validTo.toISOString(),
          daysUntilExpiry: certInfo.daysUntilExpiry,
          sans: certInfo.subjectAltNames.slice(0, 10),
        },
      });
    }

    // Check domain match
    if (certInfo.subject && certInfo.subjectAltNames.length > 0) {
      const domainMatches = certInfo.subjectAltNames.some(
        (san) =>
          san === domain ||
          san === `*.${domain.split('.').slice(1).join('.')}` ||
          san === `www.${domain}`
      );
      if (!domainMatches && certInfo.subject !== domain) {
        findings.push({
          category: 'ssl',
          severity: 'high',
          title: 'Zertifikat stimmt nicht mit der Domain überein',
          description: `Das Zertifikat ist für "${certInfo.subject}" (SANs: ${certInfo.subjectAltNames.slice(0, 5).join(', ')}) ausgestellt, nicht für "${domain}".`,
          affected_url: url,
          recommendation:
            'Stelle sicher, dass das Zertifikat für die korrekte Domain ausgestellt ist.',
          details: {
            expectedDomain: domain,
            certSubject: certInfo.subject,
            sans: certInfo.subjectAltNames.slice(0, 10),
          },
        });
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    if (
      message.includes('certificate') ||
      message.includes('CERT') ||
      message.includes('SSL')
    ) {
      findings.push({
        category: 'ssl',
        severity: 'critical',
        title: 'SSL/TLS-Zertifikatsfehler',
        description: `Die HTTPS-Verbindung ist fehlerhaft: ${message}`,
        affected_url: url,
        recommendation:
          "Stelle sicher, dass ein gültiges SSL-Zertifikat installiert ist. Nutze z.B. Let's Encrypt.",
        details: { error: message },
      });
    } else {
      findings.push({
        category: 'ssl',
        severity: 'high',
        title: 'SSL-Analyse fehlgeschlagen',
        description: `Die SSL-Analyse konnte nicht durchgeführt werden: ${message}`,
        affected_url: url,
        recommendation: 'Stelle sicher, dass HTTPS korrekt konfiguriert ist.',
        details: { error: message },
      });
    }
  }

  // ── 2. Test deprecated TLS versions ──────────────────────────────────
  try {
    const supportsTls10 = await testTlsVersion(domain, 'TLSv1' as tls.SecureVersion, 'TLSv1' as tls.SecureVersion);
    if (supportsTls10) {
      findings.push({
        category: 'ssl',
        severity: 'high',
        title: 'Veraltetes TLS 1.0 wird unterstützt',
        description:
          'Der Server akzeptiert Verbindungen über TLS 1.0, das seit 2020 offiziell als unsicher gilt und bekannte Schwachstellen hat (BEAST, POODLE).',
        affected_url: url,
        recommendation:
          'Deaktiviere TLS 1.0 in der Webserver-Konfiguration. Nur TLS 1.2 und 1.3 sollten aktiv sein.',
        details: { protocol: 'TLSv1.0' },
      });
    }
  } catch {
    // Can't test, Node might not support TLS 1.0
  }

  try {
    const supportsTls11 = await testTlsVersion(domain, 'TLSv1.1' as tls.SecureVersion, 'TLSv1.1' as tls.SecureVersion);
    if (supportsTls11) {
      findings.push({
        category: 'ssl',
        severity: 'medium',
        title: 'Veraltetes TLS 1.1 wird unterstützt',
        description:
          'Der Server akzeptiert Verbindungen über TLS 1.1, das seit 2020 als veraltet gilt.',
        affected_url: url,
        recommendation:
          'Deaktiviere TLS 1.1. Nur TLS 1.2 und TLS 1.3 sollten unterstützt werden.',
        details: { protocol: 'TLSv1.1' },
      });
    }
  } catch {
    // Can't test
  }

  // ── 3. HTTPS accessibility check via fetch ─────────────────────────────
  try {
    const response = await fetchWithRetry(url, {
      timeoutMs: 10000,
      redirect: 'manual',
    });

    findings.push({
      category: 'ssl',
      severity: 'info',
      title: 'HTTPS ist aktiv',
      description: 'Die Website ist über HTTPS erreichbar.',
      affected_url: url,
      recommendation: null,
      details: { statusCode: response.status },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    findings.push({
      category: 'ssl',
      severity: 'high',
      title: 'HTTPS nicht erreichbar',
      description: `Die Website konnte über HTTPS nicht erreicht werden: ${message}`,
      affected_url: url,
      recommendation:
        'Aktiviere HTTPS für deine Website mit einem gültigen SSL/TLS-Zertifikat.',
      details: { error: message },
    });
  }

  // ── 4. HTTP to HTTPS redirect ──────────────────────────────────────────
  try {
    const httpResponse = await fetchWithRetry(`http://${domain}`, {
      timeoutMs: 10000,
      retries: 1,
      redirect: 'manual',
    });

    const location = httpResponse.headers.get('location');
    if (
      httpResponse.status >= 300 &&
      httpResponse.status < 400 &&
      location?.startsWith('https://')
    ) {
      // Check for HTTPS redirect chain
      if (httpResponse.status === 301) {
        findings.push({
          category: 'ssl',
          severity: 'info',
          title: 'HTTP zu HTTPS Weiterleitung aktiv (301)',
          description:
            'HTTP-Anfragen werden korrekt per permanenter (301) Weiterleitung auf HTTPS umgeleitet.',
          affected_url: `http://${domain}`,
          recommendation: null,
          details: { redirectTo: location, statusCode: 301 },
        });
      } else {
        findings.push({
          category: 'ssl',
          severity: 'low',
          title: 'HTTP zu HTTPS Weiterleitung aktiv (temporär)',
          description: `HTTP wird auf HTTPS weitergeleitet, aber mit Status ${httpResponse.status} statt 301 (permanent).`,
          affected_url: `http://${domain}`,
          recommendation:
            'Verwende eine permanente (301) Weiterleitung statt einer temporären.',
          details: { redirectTo: location, statusCode: httpResponse.status },
        });
      }
    } else if (httpResponse.ok) {
      findings.push({
        category: 'ssl',
        severity: 'high',
        title: 'Keine HTTP zu HTTPS Weiterleitung',
        description:
          'Die Website ist auch über unverschlüsseltes HTTP erreichbar, ohne auf HTTPS weiterzuleiten. Sensible Daten können abgefangen werden.',
        affected_url: `http://${domain}`,
        recommendation:
          'Konfiguriere eine permanente (301) Weiterleitung von HTTP auf HTTPS.',
        details: { httpStatusCode: httpResponse.status },
      });
    }
  } catch {
    // HTTP not accessible - fine if HTTPS works
  }

  // ── 5. Check for security.txt (with detailed validation) ────────────────
  try {
    const secTxtResponse = await fetchWithRetry(`${url}/.well-known/security.txt`, {
      timeoutMs: 5000,
      retries: 1,
      redirect: 'follow',
    });

    if (secTxtResponse.ok) {
      const body = await secTxtResponse.text();
      const hasContact = /^Contact:/mi.test(body);
      const hasExpires = /^Expires:/mi.test(body);
      const hasEncryption = /^Encryption:/mi.test(body);
      const hasPreferredLanguages = /^Preferred-Languages:/mi.test(body);
      const hasCanonical = /^Canonical:/mi.test(body);

      if (hasContact) {
        const issues: string[] = [];
        if (!hasExpires) issues.push('Expires fehlt (RFC 9116 Pflicht)');
        if (!hasEncryption) issues.push('Encryption fehlt');
        if (!hasCanonical) issues.push('Canonical fehlt');

        if (issues.length > 0) {
          findings.push({
            category: 'info',
            severity: 'info',
            title: 'security.txt vorhanden (unvollständig)',
            description: `Die security.txt ist vorhanden, aber nicht vollständig: ${issues.join(', ')}.`,
            affected_url: `${url}/.well-known/security.txt`,
            recommendation: `Ergänze die fehlenden Felder: ${issues.join(', ')}. Siehe https://securitytxt.org/`,
            details: { hasContact, hasExpires, hasEncryption, hasPreferredLanguages, hasCanonical },
          });
        } else {
          findings.push({
            category: 'info',
            severity: 'info',
            title: 'security.txt vollständig konfiguriert',
            description: 'Die security.txt ist RFC-9116-konform mit Contact, Expires und weiteren Feldern.',
            affected_url: `${url}/.well-known/security.txt`,
            recommendation: null,
            details: { hasContact, hasExpires, hasEncryption, hasPreferredLanguages, hasCanonical },
          });
        }
      }
    } else {
      findings.push({
        category: 'info',
        severity: 'low',
        title: 'Keine security.txt vorhanden',
        description:
          'Es wurde keine security.txt gefunden. Gemäß RFC 9116 sollte jede Website eine security.txt bereitstellen, damit Sicherheitsforscher Schwachstellen melden können.',
        affected_url: `${url}/.well-known/security.txt`,
        recommendation:
          'Erstelle eine /.well-known/security.txt mit mindestens einem Contact-Feld. Siehe https://securitytxt.org/',
        details: null,
      });
    }
  } catch {
    // Ignore
  }

  // ── 6. CAA Record Check ────────────────────────────────────────────────
  try {
    const resolver = new Resolver();
    resolver.setServers(['8.8.8.8', '1.1.1.1']);
    const caaRecords = await resolver.resolveCaa(domain);

    if (caaRecords.length === 0) {
      findings.push({
        category: 'ssl',
        severity: 'medium',
        title: 'Keine CAA-Records konfiguriert',
        description:
          'Ohne CAA (Certificate Authority Authorization) Records kann jede Zertifizierungsstelle Zertifikate für deine Domain ausstellen. CAA schränkt dies auf autorisierte CAs ein.',
        affected_url: url,
        recommendation:
          'Erstelle CAA-DNS-Records, die nur autorisierte CAs erlauben. Beispiel: 0 issue "letsencrypt.org"',
        details: null,
      });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const issuers = (caaRecords as any[])
        .filter((r) => r.critical === 0 || r.critical === 128)
        .map((r) => `${r.tag || r.type || ''}: ${r.value || ''}`);

      findings.push({
        category: 'ssl',
        severity: 'info',
        title: 'CAA-Records konfiguriert',
        description: `CAA-Records schränken die Zertifikatsausstellung auf autorisierte CAs ein: ${issuers.join(', ')}`,
        affected_url: url,
        recommendation: null,
        details: { records: caaRecords },
      });
    }
  } catch {
    findings.push({
      category: 'ssl',
      severity: 'medium',
      title: 'Keine CAA-Records konfiguriert',
      description: 'Es konnten keine CAA-Records abgefragt werden. Ohne CAA kann jede CA Zertifikate ausstellen.',
      affected_url: url,
      recommendation: 'Erstelle CAA-DNS-Records, um autorisierte Zertifizierungsstellen festzulegen.',
      details: null,
    });
  }

  // ── 7. HSTS Preload Check ──────────────────────────────────────────────
  try {
    const hstsResponse = await fetchWithRetry(url, {
      timeoutMs: 8000,
      retries: 1,
      redirect: 'follow',
    });

    const hstsHeader = hstsResponse.headers.get('strict-transport-security');
    if (hstsHeader) {
      const hasPreload = hstsHeader.toLowerCase().includes('preload');
      const hasIncludeSubDomains = hstsHeader.toLowerCase().includes('includesubdomains');
      const maxAgeMatch = hstsHeader.match(/max-age=(\d+)/);
      const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1]) : 0;

      if (hasPreload && hasIncludeSubDomains && maxAge >= 31536000) {
        findings.push({
          category: 'ssl',
          severity: 'info',
          title: 'HSTS Preload bereit',
          description: 'Die HSTS-Konfiguration erfüllt die Anforderungen für die HSTS Preload List (max-age ≥ 1 Jahr, includeSubDomains, preload).',
          affected_url: url,
          recommendation: 'Reiche die Domain bei hstspreload.org ein, falls noch nicht geschehen.',
          details: { hsts: hstsHeader, maxAge, hasPreload, hasIncludeSubDomains },
        });
      } else if (hasPreload && (!hasIncludeSubDomains || maxAge < 31536000)) {
        findings.push({
          category: 'ssl',
          severity: 'low',
          title: 'HSTS Preload-Directive gesetzt, aber Anforderungen nicht erfüllt',
          description: `Der HSTS-Header enthält "preload", erfüllt aber nicht alle Anforderungen: ${maxAge < 31536000 ? 'max-age zu niedrig' : ''}${!hasIncludeSubDomains ? ' includeSubDomains fehlt' : ''}.`,
          affected_url: url,
          recommendation: 'Setze max-age auf mindestens 31536000 und füge includeSubDomains hinzu.',
          details: { hsts: hstsHeader },
        });
      }
    }
  } catch {
    // Already covered in header check
  }

  // ── 8. Certificate Chain Completeness ──────────────────────────────────
  try {
    await new Promise<void>((resolve, reject) => {
      const req = https.request(
        {
          hostname: domain,
          port: 443,
          method: 'HEAD',
          path: '/',
          timeout: 8000,
          rejectUnauthorized: true, // Strict mode to check chain
          headers: { 'User-Agent': 'TestMe-Security-Scanner/1.0' },
        },
        (res) => {
          res.destroy();
          resolve();
        }
      );
      req.on('error', (err) => reject(err));
      req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
      req.end();
    });

    // If we get here, the chain is valid
    findings.push({
      category: 'ssl',
      severity: 'info',
      title: 'Zertifikatskette vollständig',
      description: 'Die SSL-Zertifikatskette ist vollständig und wird von vertrauenswürdigen Root-CAs validiert.',
      affected_url: url,
      recommendation: null,
      details: null,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('unable to verify') || msg.includes('certificate chain') || msg.includes('UNABLE_TO_GET_ISSUER_CERT')) {
      findings.push({
        category: 'ssl',
        severity: 'high',
        title: 'Unvollständige Zertifikatskette',
        description: 'Die SSL-Zertifikatskette ist unvollständig. Intermediate-Zertifikate fehlen, was bei einigen Clients zu Fehlern führen kann.',
        affected_url: url,
        recommendation: 'Stelle sicher, dass alle Intermediate-Zertifikate in der Serverkonfiguration enthalten sind. Teste mit ssllabs.com.',
        details: { error: msg },
      });
    }
    // Other errors are likely network-related, not chain-related
  }

  return findings;
}
