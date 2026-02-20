import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { jsPDF } from 'jspdf';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ── Severity color ──────────────────────────────────────────────────────
function severityColor(severity: string): [number, number, number] {
  switch (severity) {
    case 'critical': return [220, 38, 38];
    case 'high':     return [234, 88, 12];
    case 'medium':   return [202, 138, 4];
    case 'low':      return [22, 163, 74];
    default:         return [100, 116, 139];
  }
}

function severityLabel(severity: string): string {
  switch (severity) {
    case 'critical': return 'KRITISCH';
    case 'high':     return 'HOCH';
    case 'medium':   return 'MITTEL';
    case 'low':      return 'NIEDRIG';
    default:         return 'INFO';
  }
}

function scoreColor(score: number): [number, number, number] {
  if (score >= 80) return [22, 163, 74];
  if (score >= 60) return [202, 138, 4];
  if (score >= 40) return [234, 88, 12];
  return [220, 38, 38];
}

// ── PDF Generation ──────────────────────────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: scanId } = await params;
  const supabase = getSupabaseAdmin();

  // Get scan data (separate queries to avoid PostgREST schema cache issues)
  const { data: scan, error: scanError } = await supabase
    .from('scans')
    .select('*')
    .eq('id', scanId)
    .single();

  if (scanError || !scan) {
    return NextResponse.json({ error: 'Scan nicht gefunden' }, { status: 404 });
  }

  // Get domain name separately
  const { data: domainData } = await supabase
    .from('domains')
    .select('domain_name')
    .eq('id', scan.domain_id)
    .single();

  // Attach domain info to scan object
  scan.domains = { domain_name: domainData?.domain_name || 'Unbekannt' };

  // Get findings
  const { data: findings } = await supabase
    .from('scan_findings')
    .select('*')
    .eq('scan_id', scanId)
    .order('severity', { ascending: true });

  const allFindings = findings || [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const domainName = (scan.domains as any)?.domain_name || 'Unbekannt';
  const score = scan.score || 0;
  const summary = scan.summary || '';

  // Create PDF
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let y = 0;

  // ── Helper functions ────────────────────────────────────────────────
  function checkPageBreak(neededSpace: number) {
    if (y + neededSpace > pageHeight - 25) {
      // Add footer before new page
      addFooter();
      doc.addPage();
      y = 25;
      addHeader();
    }
  }

  function addHeader() {
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 18, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('TestMe Security Report', margin, 12);
    doc.setFont('helvetica', 'normal');
    doc.text(domainName, pageWidth - margin, 12, { align: 'right' });
    doc.setTextColor(0, 0, 0);
  }

  function addFooter() {
    const pageNum = doc.getNumberOfPages();
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Seite ${pageNum} | Generiert am ${new Date().toLocaleDateString('de-DE')} | Vertraulich`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
    doc.setTextColor(0, 0, 0);
  }

  // ── Cover Page ──────────────────────────────────────────────────────
  // Background gradient effect (dark header)
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 100, 'F');

  // Company branding
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('Security Audit Report', margin, 45);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(domainName, margin, 58);

  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184);
  doc.text(`Scan ID: ${scanId.substring(0, 8)}...`, margin, 70);
  doc.text(`Datum: ${new Date(scan.completed_at || scan.created_at).toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' })}`, margin, 78);
  doc.text(`Scan-Dauer: ${scan.started_at && scan.completed_at ? Math.round((new Date(scan.completed_at).getTime() - new Date(scan.started_at).getTime()) / 1000) + 's' : 'N/A'}`, margin, 86);

  // Score display
  const [sr, sg, sb] = scoreColor(score);
  doc.setFillColor(sr, sg, sb);
  doc.roundedRect(pageWidth - margin - 50, 35, 50, 50, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.text(String(score), pageWidth - margin - 25, 62, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('/ 100', pageWidth - margin - 25, 72, { align: 'center' });

  // Score label
  let scoreLabel = '';
  if (score >= 80) scoreLabel = 'SEHR GUT';
  else if (score >= 60) scoreLabel = 'BEFRIEDIGEND';
  else if (score >= 40) scoreLabel = 'MANGELHAFT';
  else scoreLabel = 'KRITISCH';

  doc.setFontSize(8);
  doc.text(scoreLabel, pageWidth - margin - 25, 80, { align: 'center' });

  // Disclaimer
  doc.setTextColor(0, 0, 0);
  y = 115;
  doc.setFillColor(254, 243, 199); // yellow-100
  doc.roundedRect(margin, y, contentWidth, 25, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(146, 64, 14);
  doc.text('HINWEIS', margin + 5, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  const disclaimer = 'Dieser Bericht wurde automatisch erstellt und stellt keine Penetrationsprüfung dar. Die Ergebnisse basieren auf nicht-invasiven, passiven und aktiven Scans von außen. Für eine vollständige Sicherheitsbewertung wird ein manueller Penetrationstest empfohlen.';
  const disclaimerLines = doc.splitTextToSize(disclaimer, contentWidth - 10);
  doc.text(disclaimerLines, margin + 5, y + 14);

  // ── Executive Summary ───────────────────────────────────────────────
  y = 155;
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Executive Summary', margin, y);
  y += 8;

  // Summary text
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  if (summary) {
    const summaryLines = doc.splitTextToSize(summary, contentWidth);
    doc.text(summaryLines, margin, y);
    y += summaryLines.length * 4 + 5;
  }

  // Statistics boxes
  const criticalCount = allFindings.filter((f) => f.severity === 'critical').length;
  const highCount = allFindings.filter((f) => f.severity === 'high').length;
  const mediumCount = allFindings.filter((f) => f.severity === 'medium').length;
  const lowCount = allFindings.filter((f) => f.severity === 'low').length;
  const infoCount = allFindings.filter((f) => f.severity === 'info').length;

  const stats = [
    { label: 'Kritisch', count: criticalCount, color: [220, 38, 38] as [number, number, number] },
    { label: 'Hoch', count: highCount, color: [234, 88, 12] as [number, number, number] },
    { label: 'Mittel', count: mediumCount, color: [202, 138, 4] as [number, number, number] },
    { label: 'Niedrig', count: lowCount, color: [22, 163, 74] as [number, number, number] },
    { label: 'Info', count: infoCount, color: [100, 116, 139] as [number, number, number] },
  ];

  const boxWidth = (contentWidth - 4 * 4) / 5;
  checkPageBreak(30);
  stats.forEach((stat, i) => {
    const bx = margin + i * (boxWidth + 4);
    doc.setFillColor(stat.color[0], stat.color[1], stat.color[2]);
    doc.roundedRect(bx, y, boxWidth, 22, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(String(stat.count), bx + boxWidth / 2, y + 11, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(stat.label, bx + boxWidth / 2, y + 18, { align: 'center' });
  });
  y += 30;

  // Total findings
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(9);
  doc.text(`Gesamtergebnis: ${allFindings.length} Findings in ${new Set(allFindings.map((f) => f.category)).size} Kategorien`, margin, y);
  y += 12;

  // ── Category Breakdown ──────────────────────────────────────────────
  checkPageBreak(30);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Kategorieübersicht', margin, y);
  y += 8;

  const categories = [...new Set(allFindings.map((f) => f.category))];
  const categoryLabels: Record<string, string> = {
    ssl: 'SSL/TLS', headers: 'HTTP Headers', cors: 'CORS', email: 'E-Mail Security',
    vulnerability: 'Schwachstellen', secrets: 'Secrets & Leaks', info: 'Informationen',
    sensitive_files: 'Sensible Dateien',
  };

  for (const cat of categories) {
    checkPageBreak(12);
    const catFindings = allFindings.filter((f) => f.category === cat);
    const catCritical = catFindings.filter((f) => f.severity === 'critical' || f.severity === 'high').length;

    doc.setFillColor(catCritical > 0 ? 254 : 240, catCritical > 0 ? 242 : 253, catCritical > 0 ? 242 : 244);
    doc.roundedRect(margin, y - 4, contentWidth, 10, 1, 1, 'F');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(categoryLabels[cat] || cat, margin + 3, y + 1);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`${catFindings.length} Findings`, pageWidth - margin - 3, y + 1, { align: 'right' });

    y += 12;
  }

  y += 5;

  // ── Detailed Findings ───────────────────────────────────────────────
  doc.addPage();
  y = 25;
  addHeader();

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Detaillierte Ergebnisse', margin, y);
  y += 10;

  // Group by severity (critical first)
  const severityOrder = ['critical', 'high', 'medium', 'low', 'info'];
  const sortedFindings = [...allFindings].sort((a, b) =>
    severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity)
  );

  for (const finding of sortedFindings) {
    const [r, g, b] = severityColor(finding.severity);
    const label = severityLabel(finding.severity);

    // Estimate needed space
    const descLines = doc.splitTextToSize(finding.description || '', contentWidth - 8);
    const recLines = finding.recommendation ? doc.splitTextToSize(finding.recommendation, contentWidth - 8) : [];
    const neededSpace = 25 + descLines.length * 3.5 + recLines.length * 3.5;

    checkPageBreak(neededSpace);

    // Severity badge
    doc.setFillColor(r, g, b);
    doc.roundedRect(margin, y, 20, 5, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin + 10, y + 3.5, { align: 'center' });

    // Category
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(categoryLabels[finding.category] || finding.category, margin + 23, y + 3.5);

    y += 8;

    // Title
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    const titleLines = doc.splitTextToSize(finding.title, contentWidth - 4);
    doc.text(titleLines, margin + 2, y);
    y += titleLines.length * 4 + 2;

    // Description
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(descLines, margin + 2, y);
    y += descLines.length * 3.5 + 2;

    // Affected URL
    if (finding.affected_url) {
      doc.setFontSize(7);
      doc.setTextColor(59, 130, 246);
      const urlText = finding.affected_url.length > 80
        ? finding.affected_url.substring(0, 80) + '...'
        : finding.affected_url;
      doc.text(`URL: ${urlText}`, margin + 2, y);
      y += 4;
    }

    // Recommendation
    if (finding.recommendation) {
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(22, 163, 74);
      doc.text('Empfehlung:', margin + 2, y);
      y += 3.5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(recLines, margin + 2, y);
      y += recLines.length * 3.5;
    }

    // Separator
    y += 3;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;
  }

  // ── OWASP Compliance Section ────────────────────────────────────────
  const owaspFinding = allFindings.find((f) => f.title.includes('OWASP'));
  if (owaspFinding?.details) {
    checkPageBreak(80);
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('OWASP Top 10 (2021) Compliance', margin, y);
    y += 10;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const owaspData = (owaspFinding.details as any).owaspTop10;
    if (Array.isArray(owaspData)) {
      for (const item of owaspData) {
        checkPageBreak(12);
        const status = item.status as string;
        const [cr, cg, cb] = status === 'PASS' ? [22, 163, 74] as const
          : status === 'WARNING' ? [202, 138, 4] as const
          : [220, 38, 38] as const;

        doc.setFillColor(cr, cg, cb);
        doc.roundedRect(margin, y - 3, 15, 5, 1, 1, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(6);
        doc.setFont('helvetica', 'bold');
        doc.text(status, margin + 7.5, y, { align: 'center' });

        doc.setTextColor(15, 23, 42);
        doc.setFontSize(8);
        doc.text(`${item.id}: ${item.name}`, margin + 18, y);

        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'normal');
        doc.text(`${item.issues} Issue(s)`, pageWidth - margin, y, { align: 'right' });
        y += 8;
      }
    }
  }

  // ── Final Footer ────────────────────────────────────────────────────
  // Add footer to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Seite ${i} von ${totalPages} | TestMe Security Scanner | Vertraulich – Nur für den internen Gebrauch`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  }

  // Generate PDF buffer
  const pdfBuffer = doc.output('arraybuffer');

  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="security-report-${domainName}-${new Date().toISOString().split('T')[0]}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
}
