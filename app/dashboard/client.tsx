'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { addDomain, getDomains, verifyDomainHTML } from '@/app/actions/domain'
import { startScan, getScans } from '@/app/actions/scan'
import Link from 'next/link'

interface Domain {
  id: string
  domain: string
  normalized_domain: string
  verification_status: 'pending' | 'verified' | 'failed' | 'expired'
  verification_method: 'dns_txt' | 'html_file' | null
  verification_token: string | null
}

interface Scan {
  id: string
  domain_id: string
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
  scan_type: 'passive' | 'active' | 'full'
  progress: number
  security_score: number | null
  total_findings: number
  created_at: string
}

export default function DashboardClient({ userId }: { userId: string }) {
  const router = useRouter()
  const [domains, setDomains] = useState<Domain[]>([])
  const [scans, setScans] = useState<Scan[]>([])
  const [newDomain, setNewDomain] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [verifyingDomain, setVerifyingDomain] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const [domainsResult, scansResult] = await Promise.all([
      getDomains(),
      getScans(),
    ])

    if (domainsResult.success) {
      setDomains(domainsResult.data)
    }
    if (scansResult.success) {
      setScans(scansResult.data)
    }
  }

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await addDomain(newDomain)
      if (result.success) {
        setNewDomain('')
        await loadData()
      } else {
        setError(result.error || 'Fehler beim Hinzufügen der Domain')
      }
    } catch (err) {
      setError('Ein Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyDNS = async (domainId: string) => {
    setVerifyingDomain(domainId)
    try {
      // Verwende API-Route direkt
      const response = await fetch('/api/verify-dns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ domainId }),
      })
      
      const result = await response.json()
      if (result.success && result.verified) {
        await loadData()
        alert('Domain erfolgreich verifiziert!')
      } else {
        alert('Verifizierung fehlgeschlagen. Bitte prüfe den DNS TXT Record.')
      }
    } catch (err) {
      alert('Fehler bei der Verifizierung')
    } finally {
      setVerifyingDomain(null)
    }
  }

  const handleVerifyHTML = async (domainId: string) => {
    setVerifyingDomain(domainId)
    try {
      const result = await verifyDomainHTML(domainId)
      if (result.success && result.verified) {
        await loadData()
        alert('Domain erfolgreich verifiziert!')
      } else {
        alert('Verifizierung fehlgeschlagen. Bitte prüfe die HTML-Datei.')
      }
    } catch (err) {
      alert('Fehler bei der Verifizierung')
    } finally {
      setVerifyingDomain(null)
    }
  }

  const handleStartScan = async (domainId: string, scanType: 'passive' | 'active' | 'full' = 'full') => {
    setLoading(true)
    try {
      const result = await startScan(domainId, scanType)
      if (result.success) {
        await loadData()
        alert('Scan gestartet!')
      } else {
        alert(result.error || 'Fehler beim Starten des Scans')
      }
    } catch (err) {
      alert('Ein Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const getDomainById = (domainId: string) => {
    return domains.find((d) => d.id === domainId)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <h1 className="text-xl font-bold text-primary-600">Dashboard</h1>
            <button
              onClick={handleLogout}
              className="text-gray-600 hover:text-gray-900"
            >
              Abmelden
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Add Domain */}
        <div className="mb-8 rounded-lg bg-white p-6 shadow">
          <h2 className="text-lg font-semibold mb-4">Domain hinzufügen</h2>
          <form onSubmit={handleAddDomain} className="flex gap-4">
            <input
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="example.com"
              className="flex-1 rounded-md border border-gray-300 px-3 py-2"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Wird hinzugefügt...' : 'Hinzufügen'}
            </button>
          </form>
        </div>

        {/* Domains */}
        <div className="mb-8 rounded-lg bg-white p-6 shadow">
          <h2 className="text-lg font-semibold mb-4">Meine Domains</h2>
          {domains.length === 0 ? (
            <p className="text-gray-500">Noch keine Domains hinzugefügt</p>
          ) : (
            <div className="space-y-4">
              {domains.map((domain) => (
                <div
                  key={domain.id}
                  className="flex items-center justify-between border-b border-gray-200 pb-4"
                >
                  <div>
                    <p className="font-medium">{domain.domain}</p>
                    <p className="text-sm text-gray-500">
                      Status:{' '}
                      <span
                        className={
                          domain.verification_status === 'verified'
                            ? 'text-green-600'
                            : 'text-yellow-600'
                        }
                      >
                        {domain.verification_status === 'verified'
                          ? 'Verifiziert'
                          : 'Nicht verifiziert'}
                      </span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {domain.verification_status !== 'verified' && (
                      <>
                        <button
                          onClick={() => handleVerifyDNS(domain.id)}
                          disabled={verifyingDomain === domain.id}
                          className="rounded-md bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          DNS prüfen
                        </button>
                        <button
                          onClick={() => handleVerifyHTML(domain.id)}
                          disabled={verifyingDomain === domain.id}
                          className="rounded-md bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          HTML prüfen
                        </button>
                      </>
                    )}
                    {domain.verification_status === 'verified' && (
                      <button
                        onClick={() => handleStartScan(domain.id)}
                        disabled={loading}
                        className="rounded-md bg-primary-600 px-3 py-1 text-sm text-white hover:bg-primary-700 disabled:opacity-50"
                      >
                        Scan starten
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Scans */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-lg font-semibold mb-4">Meine Scans</h2>
          {scans.length === 0 ? (
            <p className="text-gray-500">Noch keine Scans durchgeführt</p>
          ) : (
            <div className="space-y-4">
              {scans.map((scan) => {
                const domain = getDomainById(scan.domain_id)
                return (
                  <div
                    key={scan.id}
                    className="flex items-center justify-between border-b border-gray-200 pb-4"
                  >
                    <div>
                      <p className="font-medium">
                        {domain?.domain || 'Unbekannte Domain'}
                      </p>
                      <p className="text-sm text-gray-500">
                        Status: {scan.status} | Progress: {scan.progress}%
                        {scan.security_score !== null && (
                          <> | Score: {scan.security_score}/100</>
                        )}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href={`/dashboard/scan/${scan.id}`}
                        className="rounded-md bg-primary-600 px-3 py-1 text-sm text-white hover:bg-primary-700"
                      >
                        Details
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
