'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getScanFindings } from '@/app/actions/scan'
import { generatePDFReport } from '@/lib/utils/report'

interface Finding {
  id: string
  finding_type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  affected_url: string | null
  affected_parameter: string | null
  proof_of_concept: string | null
  impact: string
  remediation: string
  owasp_category: string | null
  cwe_id: string | null
}

export default function ScanDetailsClient({
  scanId,
  userId,
}: {
  scanId: string
  userId: string
}) {
  const router = useRouter()
  const [findings, setFindings] = useState<Finding[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadFindings()
  }, [])

  const loadFindings = async () => {
    try {
      const result = await getScanFindings(scanId)
      if (result.success) {
        setFindings(result.data)
      }
    } catch (err) {
      console.error('Error loading findings:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPDF = () => {
    const reportData = {
      scanId,
      domain: 'example.com', // TODO: Load from scan
      scanDate: new Date().toISOString(),
      securityScore: 85, // TODO: Load from scan
      totalFindings: findings.length,
      findings: findings.map((f) => ({
        severity: f.severity,
        title: f.title,
        description: f.description,
        affected_url: f.affected_url || undefined,
        remediation: f.remediation,
        owasp_category: f.owasp_category || undefined,
      })),
    }

    const blob = generatePDFReport(reportData)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `security-report-${scanId}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  const severityColors = {
    critical: 'bg-red-100 text-red-800',
    high: 'bg-orange-100 text-orange-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-green-100 text-green-800',
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Lädt...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Scan Details</h1>
          <div className="flex gap-2">
            <button
              onClick={() => router.back()}
              className="rounded-md bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
            >
              Zurück
            </button>
            <button
              onClick={handleDownloadPDF}
              className="rounded-md bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
            >
              PDF herunterladen
            </button>
          </div>
        </div>

        {findings.length === 0 ? (
          <div className="rounded-lg bg-white p-6 shadow">
            <p className="text-gray-500">Keine Findings gefunden</p>
          </div>
        ) : (
          <div className="space-y-4">
            {findings.map((finding) => (
              <div
                key={finding.id}
                className="rounded-lg bg-white p-6 shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          severityColors[finding.severity]
                        }`}
                      >
                        {finding.severity.toUpperCase()}
                      </span>
                      <h3 className="text-lg font-semibold">{finding.title}</h3>
                    </div>
                    <p className="text-gray-600">{finding.description}</p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {finding.affected_url && (
                    <p>
                      <span className="font-semibold">Betroffene URL:</span>{' '}
                      <code className="bg-gray-100 px-2 py-1 rounded">
                        {finding.affected_url}
                      </code>
                    </p>
                  )}
                  {finding.affected_parameter && (
                    <p>
                      <span className="font-semibold">Betroffener Parameter:</span>{' '}
                      <code className="bg-gray-100 px-2 py-1 rounded">
                        {finding.affected_parameter}
                      </code>
                    </p>
                  )}
                  {finding.proof_of_concept && (
                    <div>
                      <span className="font-semibold">Proof of Concept:</span>
                      <pre className="mt-1 bg-gray-100 p-2 rounded overflow-x-auto">
                        {finding.proof_of_concept}
                      </pre>
                    </div>
                  )}
                  <div>
                    <span className="font-semibold">Impact:</span>
                    <p className="mt-1 text-gray-700">{finding.impact}</p>
                  </div>
                  <div>
                    <span className="font-semibold">Remediation:</span>
                    <p className="mt-1 text-gray-700">{finding.remediation}</p>
                  </div>
                  {finding.owasp_category && (
                    <p>
                      <span className="font-semibold">OWASP:</span>{' '}
                      {finding.owasp_category}
                    </p>
                  )}
                  {finding.cwe_id && (
                    <p>
                      <span className="font-semibold">CWE:</span> {finding.cwe_id}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
