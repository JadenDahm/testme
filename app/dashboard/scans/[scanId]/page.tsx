import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'

export default async function ScanDetailPage({
  params,
}: {
  params: { scanId: string }
}) {
  const { user, supabase } = await requireAuth()

  const { data: scan } = await supabase
    .from('scans')
    .select(`
      *,
      domains!inner(domain)
    `)
    .eq('id', params.scanId)
    .eq('user_id', user.id)
    .single()

  if (!scan) {
    notFound()
  }

  const { data: findings } = await supabase
    .from('scan_findings')
    .select('*')
    .eq('scan_id', params.scanId)
    .order('severity', { ascending: false })

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'low':
        return 'bg-gray-100 text-gray-800 border-gray-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const downloadReport = async () => {
    'use server'
    // This would trigger the PDF download
    // In a real implementation, you'd use a client component with a button
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/dashboard/scans"
          className="text-primary-600 hover:text-primary-700 text-sm mb-4 inline-block"
        >
          ← Zurück zu Scans
        </Link>
      </div>

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Scan Details</h1>
          <p className="text-gray-600 mt-1">{(scan as any).domains.domain}</p>
        </div>
        {scan.status === 'completed' && (
          <a
            href={`/api/scans/${params.scanId}/report`}
            download
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition"
          >
            PDF Report herunterladen
          </a>
        )}
      </div>

      {/* Scan Info */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Status</h3>
            <p className="text-lg font-semibold">{scan.status}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Security Score</h3>
            <p className="text-3xl font-bold text-primary-600">
              {scan.security_score !== null ? `${scan.security_score}/100` : '-'}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Scan Datum</h3>
            <p className="text-lg">
              {format(new Date(scan.created_at), 'dd.MM.yyyy HH:mm')}
            </p>
          </div>
        </div>

        {scan.status === 'running' && (
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Fortschritt</span>
              <span>{scan.progress_percentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all"
                style={{ width: `${scan.progress_percentage}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Findings Summary */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Findings Zusammenfassung</h2>
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-4 bg-red-50 rounded">
            <p className="text-3xl font-bold text-red-600">{scan.critical_count}</p>
            <p className="text-sm text-gray-600">Critical</p>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded">
            <p className="text-3xl font-bold text-orange-600">{scan.high_count}</p>
            <p className="text-sm text-gray-600">High</p>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded">
            <p className="text-3xl font-bold text-yellow-600">{scan.medium_count}</p>
            <p className="text-sm text-gray-600">Medium</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded">
            <p className="text-3xl font-bold text-gray-600">{scan.low_count}</p>
            <p className="text-sm text-gray-600">Low</p>
          </div>
        </div>
      </div>

      {/* Detailed Findings */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Detaillierte Findings</h2>
        {findings && findings.length > 0 ? (
          <div className="space-y-4">
            {findings.map((finding) => (
              <div
                key={finding.id}
                className={`border-l-4 p-4 rounded ${getSeverityColor(finding.severity)}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg">{finding.title}</h3>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${getSeverityColor(finding.severity)}`}>
                    {finding.severity.toUpperCase()}
                  </span>
                </div>
                <p className="text-sm mb-2">{finding.description}</p>
                <div className="text-sm space-y-1">
                  <p>
                    <span className="font-medium">Betroffene URL:</span>{' '}
                    <code className="bg-white px-2 py-1 rounded text-xs">
                      {finding.affected_url}
                    </code>
                  </p>
                  {finding.affected_parameter && (
                    <p>
                      <span className="font-medium">Parameter:</span>{' '}
                      <code className="bg-white px-2 py-1 rounded text-xs">
                        {finding.affected_parameter}
                      </code>
                    </p>
                  )}
                  {finding.proof_of_concept && (
                    <div className="mt-2">
                      <p className="font-medium mb-1">Proof of Concept:</p>
                      <pre className="bg-white p-2 rounded text-xs overflow-x-auto">
                        {finding.proof_of_concept}
                      </pre>
                    </div>
                  )}
                  <div className="mt-3">
                    <p className="font-medium mb-1">Impact:</p>
                    <p className="text-sm">{finding.impact}</p>
                  </div>
                  <div className="mt-3">
                    <p className="font-medium mb-1">Empfehlung:</p>
                    <p className="text-sm">{finding.recommendation}</p>
                  </div>
                  {finding.owasp_category && (
                    <p className="text-xs text-gray-600 mt-2">
                      OWASP: {finding.owasp_category}
                      {finding.cwe_id && ` | CWE: ${finding.cwe_id}`}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600">Keine Findings gefunden.</p>
        )}
      </div>
    </div>
  )
}
