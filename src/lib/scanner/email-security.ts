import { Resolver } from 'dns/promises';
import type { ScanFinding } from '@/types';

type FindingInput = Omit<ScanFinding, 'id' | 'scan_id' | 'created_at'>;

export async function checkEmailSecurity(domain: string): Promise<FindingInput[]> {
  const findings: FindingInput[] = [];
  const resolver = new Resolver();
  resolver.setServers(['8.8.8.8', '1.1.1.1']);

  // Check MX records
  await checkMx(domain, resolver, findings);

  // Check SPF
  await checkSpf(domain, resolver, findings);

  // Check DMARC
  await checkDmarc(domain, resolver, findings);

  // Check DKIM (common selectors)
  await checkDkim(domain, resolver, findings);

  // Check DNSSEC
  await checkDnssec(domain, findings);

  // Check BIMI
  await checkBimi(domain, resolver, findings);

  return findings;
}

async function checkMx(domain: string, resolver: Resolver, findings: FindingInput[]) {
  try {
    const records = await resolver.resolveMx(domain);
    if (records.length === 0) {
      findings.push({
        category: 'info',
        severity: 'info',
        title: 'Keine MX-Records gefunden',
        description: 'Für diese Domain sind keine Mail-Exchange-Records konfiguriert. E-Mail-Sicherheitsprüfungen sind daher nur begrenzt relevant.',
        affected_url: domain,
        recommendation: null,
        details: null,
      });
    } else {
      findings.push({
        category: 'info',
        severity: 'info',
        title: 'MX-Records gefunden',
        description: `${records.length} Mail-Exchange-Record(s) konfiguriert.`,
        affected_url: domain,
        recommendation: null,
        details: { records: records.map((r) => ({ priority: r.priority, exchange: r.exchange })) },
      });
    }
  } catch {
    // No MX records
  }
}

async function checkSpf(domain: string, resolver: Resolver, findings: FindingInput[]) {
  try {
    const records = await resolver.resolveTxt(domain);
    const spfRecords = records.flat().filter((r) => r.startsWith('v=spf1'));

    if (spfRecords.length === 0) {
      findings.push({
        category: 'vulnerability',
        severity: 'medium',
        title: 'Kein SPF-Record vorhanden',
        description: 'Ohne SPF-Record kann jeder Server E-Mails im Namen deiner Domain versenden. Dies ermöglicht Phishing und Spoofing.',
        affected_url: domain,
        recommendation: 'Erstelle einen SPF-Record. Beispiel: v=spf1 include:_spf.google.com ~all',
        details: null,
      });
      return;
    }

    if (spfRecords.length > 1) {
      findings.push({
        category: 'vulnerability',
        severity: 'medium',
        title: 'Mehrere SPF-Records gefunden',
        description: 'Es wurden mehrere SPF-Records gefunden. Gemäß RFC 7208 darf nur ein SPF-Record existieren. Mehrere Records können zu unvorhersehbarem Verhalten führen.',
        affected_url: domain,
        recommendation: 'Konsolidiere alle SPF-Einträge in einen einzigen TXT-Record.',
        details: { records: spfRecords },
      });
    }

    const spf = spfRecords[0];

    // Check for overly permissive SPF
    if (spf.includes('+all')) {
      findings.push({
        category: 'vulnerability',
        severity: 'high',
        title: 'SPF-Record ist zu permissiv (+all)',
        description: 'Der SPF-Record endet mit "+all", was bedeutet, dass JEDER Server E-Mails im Namen deiner Domain senden darf. Dies macht den SPF-Schutz wirkungslos.',
        affected_url: domain,
        recommendation: 'Ändere "+all" zu "~all" (Softfail) oder "-all" (Hardfail).',
        details: { spf },
      });
    } else if (spf.includes('?all')) {
      findings.push({
        category: 'vulnerability',
        severity: 'medium',
        title: 'SPF-Record ist neutral (?all)',
        description: 'Der SPF-Record verwendet "?all" (neutral), was keinen Schutz bietet.',
        affected_url: domain,
        recommendation: 'Ändere "?all" zu "~all" (Softfail) oder "-all" (Hardfail).',
        details: { spf },
      });
    } else if (!spf.includes('-all') && !spf.includes('~all')) {
      findings.push({
        category: 'vulnerability',
        severity: 'medium',
        title: 'SPF-Record ohne Catch-All-Mechanismus',
        description: 'Der SPF-Record hat keinen definierten Fallback-Mechanismus (-all oder ~all).',
        affected_url: domain,
        recommendation: 'Füge "-all" oder "~all" am Ende des SPF-Records hinzu.',
        details: { spf },
      });
    } else {
      findings.push({
        category: 'info',
        severity: 'info',
        title: 'SPF-Record konfiguriert',
        description: `SPF-Record vorhanden: ${spf}`,
        affected_url: domain,
        recommendation: null,
        details: { spf },
      });
    }

    // Check for too many DNS lookups
    const lookupMechanisms = (spf.match(/include:|redirect=|a:|mx:|ptr:/g) || []).length;
    if (lookupMechanisms > 8) {
      findings.push({
        category: 'vulnerability',
        severity: 'medium',
        title: 'SPF-Record hat zu viele DNS-Lookups',
        description: `Der SPF-Record enthält ${lookupMechanisms} DNS-Lookup-Mechanismen. Das Limit liegt bei 10. Wird es überschritten, schlägt die SPF-Prüfung fehl.`,
        affected_url: domain,
        recommendation: 'Reduziere die Anzahl der include-Anweisungen oder verwende IP-Adressen statt Domainnamen.',
        details: { spf, lookupCount: lookupMechanisms },
      });
    }
  } catch {
    // No TXT records
    findings.push({
      category: 'vulnerability',
      severity: 'medium',
      title: 'Kein SPF-Record vorhanden',
      description: 'Es konnte kein SPF-Record abgerufen werden.',
      affected_url: domain,
      recommendation: 'Erstelle einen SPF-Record für deine Domain.',
      details: null,
    });
  }
}

async function checkDmarc(domain: string, resolver: Resolver, findings: FindingInput[]) {
  try {
    const records = await resolver.resolveTxt(`_dmarc.${domain}`);
    const dmarcRecords = records.flat().filter((r) => r.startsWith('v=DMARC1'));

    if (dmarcRecords.length === 0) {
      findings.push({
        category: 'vulnerability',
        severity: 'high',
        title: 'Kein DMARC-Record vorhanden',
        description: 'Ohne DMARC-Record kann E-Mail-Spoofing nicht zuverlässig erkannt werden. DMARC ist der wichtigste Schutz gegen Phishing-E-Mails, die von deiner Domain zu kommen scheinen.',
        affected_url: domain,
        recommendation: 'Erstelle einen DMARC-Record. Starte mit: v=DMARC1; p=none; rua=mailto:dmarc@' + domain + ' und steigere die Policy schrittweise.',
        details: null,
      });
      return;
    }

    const dmarc = dmarcRecords[0];

    // Check DMARC policy
    const policyMatch = dmarc.match(/p=(none|quarantine|reject)/i);
    const policy = policyMatch ? policyMatch[1].toLowerCase() : null;

    if (policy === 'none') {
      findings.push({
        category: 'vulnerability',
        severity: 'medium',
        title: 'DMARC-Policy ist auf "none" gesetzt',
        description: 'Die DMARC-Policy "none" überwacht nur, blockiert aber keine gefälschten E-Mails. Angreifer können weiterhin E-Mails im Namen deiner Domain senden.',
        affected_url: domain,
        recommendation: 'Steigere die DMARC-Policy schrittweise zu "quarantine" und dann "reject".',
        details: { dmarc, policy },
      });
    } else if (policy === 'quarantine') {
      findings.push({
        category: 'info',
        severity: 'info',
        title: 'DMARC-Policy: quarantine',
        description: 'DMARC ist auf "quarantine" gesetzt. Verdächtige E-Mails werden in den Spam-Ordner verschoben.',
        affected_url: domain,
        recommendation: 'Erwäge ein Upgrade auf "reject" für maximalen Schutz.',
        details: { dmarc, policy },
      });
    } else if (policy === 'reject') {
      findings.push({
        category: 'info',
        severity: 'info',
        title: 'DMARC-Policy: reject (optimal)',
        description: 'DMARC ist auf "reject" gesetzt. Gefälschte E-Mails werden abgewiesen. Dies ist die stärkste Konfiguration.',
        affected_url: domain,
        recommendation: null,
        details: { dmarc, policy },
      });
    }

    // Check for rua (reporting)
    if (!dmarc.includes('rua=')) {
      findings.push({
        category: 'vulnerability',
        severity: 'low',
        title: 'DMARC: Keine Reporting-Adresse konfiguriert',
        description: 'Ohne rua-Tag erhältst du keine DMARC-Berichte und kannst Missbrauch nicht überwachen.',
        affected_url: domain,
        recommendation: 'Füge rua=mailto:dmarc-reports@' + domain + ' hinzu.',
        details: { dmarc },
      });
    }
  } catch {
    findings.push({
      category: 'vulnerability',
      severity: 'high',
      title: 'Kein DMARC-Record vorhanden',
      description: 'Kein DMARC-Record unter _dmarc.' + domain + ' gefunden.',
      affected_url: domain,
      recommendation: 'Erstelle einen DMARC-Record: v=DMARC1; p=quarantine; rua=mailto:dmarc@' + domain,
      details: null,
    });
  }
}

async function checkDkim(domain: string, resolver: Resolver, findings: FindingInput[]) {
  const commonSelectors = ['default', 'google', 'dkim', 'selector1', 'selector2', 'k1', 'mail', 'email', 's1', 's2'];
  let dkimFound = false;

  for (const selector of commonSelectors) {
    try {
      const records = await resolver.resolveTxt(`${selector}._domainkey.${domain}`);
      const dkimRecords = records.flat().filter((r) => r.includes('v=DKIM1') || r.includes('p='));

      if (dkimRecords.length > 0) {
        dkimFound = true;
        findings.push({
          category: 'info',
          severity: 'info',
          title: `DKIM-Record gefunden (Selector: ${selector})`,
          description: 'Ein DKIM-Record wurde gefunden. DKIM signiert ausgehende E-Mails kryptographisch.',
          affected_url: domain,
          recommendation: null,
          details: { selector, record: dkimRecords[0].substring(0, 100) },
        });
        break;
      }
    } catch {
      // Selector not found
    }
  }

  if (!dkimFound) {
    findings.push({
      category: 'vulnerability',
      severity: 'medium',
      title: 'Kein DKIM-Record mit Standard-Selector gefunden',
      description: 'Es konnte kein DKIM-Record unter den gängigen Selektoren gefunden werden. DKIM verifiziert die Authentizität von E-Mails.',
      affected_url: domain,
      recommendation: 'Richte DKIM bei deinem E-Mail-Anbieter ein. Der genaue Selector hängt vom Anbieter ab.',
      details: { testedSelectors: commonSelectors },
    });
  }
}

async function checkDnssec(domain: string, findings: FindingInput[]) {
  try {
    // Use Google DNS-over-HTTPS to check DNSSEC
    const response = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=A&do=1`,
      {
        signal: AbortSignal.timeout(8000),
        headers: { Accept: 'application/dns-json' },
      }
    );

    if (response.ok) {
      const data = await response.json() as { AD?: boolean; Status?: number };

      if (data.AD === true) {
        findings.push({
          category: 'info',
          severity: 'info',
          title: 'DNSSEC aktiviert und validiert',
          description: 'DNSSEC (DNS Security Extensions) ist aktiviert. DNS-Antworten sind kryptographisch signiert und vor Manipulation geschützt.',
          affected_url: domain,
          recommendation: null,
          details: { dnssecValidated: true },
        });
      } else {
        findings.push({
          category: 'vulnerability',
          severity: 'medium',
          title: 'DNSSEC nicht aktiviert',
          description: 'DNSSEC ist nicht aktiviert. Ohne DNSSEC können DNS-Antworten manipuliert werden (DNS Spoofing/Cache Poisoning), was zu Man-in-the-Middle-Angriffen führen kann.',
          affected_url: domain,
          recommendation: 'Aktiviere DNSSEC bei deinem DNS-Provider. Die meisten modernen DNS-Provider (Cloudflare, Route 53, etc.) unterstützen DNSSEC.',
          details: { dnssecValidated: false },
        });
      }
    }
  } catch {
    // Cannot check DNSSEC - don't report
  }
}

async function checkBimi(domain: string, resolver: Resolver, findings: FindingInput[]) {
  try {
    const records = await resolver.resolveTxt(`default._bimi.${domain}`);
    const bimiRecords = records.flat().filter((r) => r.startsWith('v=BIMI1'));

    if (bimiRecords.length > 0) {
      const bimi = bimiRecords[0];
      const hasLogo = bimi.includes('l=') && !bimi.includes('l=;') && !bimi.includes('l= ;');
      const hasAuthority = bimi.includes('a=') && !bimi.includes('a=;') && !bimi.includes('a= ;');

      findings.push({
        category: 'info',
        severity: 'info',
        title: 'BIMI-Record konfiguriert',
        description: `Brand Indicators for Message Identification (BIMI) ist konfiguriert. ${hasLogo ? 'Ein Logo ist hinterlegt.' : 'Kein Logo hinterlegt.'} ${hasAuthority ? 'Ein VMC-Zertifikat ist vorhanden.' : ''}`,
        affected_url: domain,
        recommendation: hasLogo ? null : 'Füge ein SVG-Logo im BIMI-Record hinzu, damit dein Markenlogo in E-Mail-Clients angezeigt wird.',
        details: { bimi, hasLogo, hasAuthority },
      });
    }
  } catch {
    // No BIMI record - not critical, just informational
  }
}
