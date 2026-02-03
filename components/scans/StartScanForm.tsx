'use client'

import { useState } from 'react'
import { startScan } from '@/app/actions/scans'
import { useRouter } from 'next/navigation'

interface Domain {
  id: string
  domain: string
  is_verified: boolean
}

interface StartScanFormProps {
  domains: Domain[]
}

export default function StartScanForm({ domains }: StartScanFormProps) {
  const [selectedDomain, setSelectedDomain] = useState('')
  const [scanType, setScanType] = useState<'full' | 'passive' | 'active'>('full')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const verifiedDomains = domains.filter(d => d.is_verified)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!selectedDomain) {
      setError('Bitte wählen Sie eine Domain aus')
      setLoading(false)
      return
    }

    const result = await startScan(selectedDomain, scanType)

    if (result.error) {
      setError(result.error)
    } else {
      router.push('/dashboard/scans')
      router.refresh()
    }

    setLoading(false)
  }

  if (verifiedDomains.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800">
          Sie haben keine verifizierten Domains. Bitte verifizieren Sie zuerst eine Domain, bevor Sie Scans durchführen können.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="domain" className="block text-sm font-medium text-gray-700 mb-2">
          Domain auswählen
        </label>
        <select
          id="domain"
          value={selectedDomain}
          onChange={(e) => setSelectedDomain(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="">-- Domain auswählen --</option>
          {verifiedDomains.map((domain) => (
            <option key={domain.id} value={domain.id}>
              {domain.domain}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Scan-Typ
        </label>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="radio"
              value="full"
              checked={scanType === 'full'}
              onChange={(e) => setScanType(e.target.value as 'full')}
              className="mr-2"
            />
            <div>
              <span className="font-medium">Vollständiger Scan</span>
              <p className="text-sm text-gray-600">Discovery + Passive + Active Scans</p>
            </div>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="passive"
              checked={scanType === 'passive'}
              onChange={(e) => setScanType(e.target.value as 'passive')}
              className="mr-2"
            />
            <div>
              <span className="font-medium">Passiver Scan</span>
              <p className="text-sm text-gray-600">Nur sichere, nicht-invasive Analysen</p>
            </div>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="active"
              checked={scanType === 'active'}
              onChange={(e) => setScanType(e.target.value as 'active')}
              className="mr-2"
            />
            <div>
              <span className="font-medium">Aktiver Scan</span>
              <p className="text-sm text-gray-600">Read-only Vulnerability Tests</p>
            </div>
          </label>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Hinweis:</strong> Alle Scans sind sicher und nicht-destruktiv. 
          Es werden keine Daten modifiziert oder schädliche Payloads ausgeführt.
        </p>
      </div>

      <button
        type="submit"
        disabled={loading || !selectedDomain}
        className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Scan wird gestartet...' : 'Scan starten'}
      </button>
    </form>
  )
}
