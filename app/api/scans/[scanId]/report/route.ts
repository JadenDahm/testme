import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { generatePDFReport } from '@/lib/report/pdf'

/**
 * Generate and download PDF report for a scan
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { scanId: string } }
) {
  try {
    const { user, supabase } = await requireAuth()
    const { scanId } = params

    // Get scan data
    const { data: scan, error: scanError } = await supabase
      .from('scans')
      .select(`
        *,
        domains!inner(domain, user_id)
      `)
      .eq('id', scanId)
      .single() as any

    if (scanError || !scan) {
      return NextResponse.json(
        { error: 'Scan not found' },
        { status: 404 }
      )
    }

    // Verify ownership
    if ((scan as any).domains.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Get findings
    const { data: findings } = await supabase
      .from('scan_findings')
      .select('*')
      .eq('scan_id', scanId)
      .order('severity', { ascending: false }) as any

    // Generate PDF
    const pdf = generatePDFReport({
      scanId: (scan as any).id,
      domain: (scan as any).domains.domain,
      scanDate: (scan as any).created_at,
      securityScore: (scan as any).security_score || 0,
      totalFindings: (scan as any).total_findings,
      findings: {
        critical: (scan as any).critical_count,
        high: (scan as any).high_count,
        medium: (scan as any).medium_count,
        low: (scan as any).low_count,
      },
      scanFindings: (findings || []).map(f => ({
        title: f.title,
        severity: f.severity,
        description: f.description,
        affected_url: f.affected_url,
        recommendation: f.recommendation,
        owasp_category: f.owasp_category || undefined,
      })),
    })

    // Return PDF as blob
    const pdfBlob = pdf.output('blob')
    const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer())

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="security-report-${scanId}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Error generating report:', error)
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    )
  }
}
