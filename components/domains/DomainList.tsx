'use client'

import { useState } from 'react'
import { createDomainVerification, verifyDomainOwnership, deleteDomain } from '@/app/actions/domains'
import { useRouter } from 'next/navigation'

interface Domain {
  id: string
  domain: string
  is_verified: boolean
  verification_method: string | null
  verified_at: string | null
  created_at: string
}

interface DomainListProps {
  domains: Domain[]
}

export default function DomainList({ domains }: DomainListProps) {
  const router = useRouter()
  const [verifying, setVerifying] = useState<string | null>(null)
  const [verificationData, setVerificationData] = useState<Record<string, { token: string; method: string; verificationId: string }>>({})

  const handleVerify = async (domainId: string, method: 'dns_txt' | 'html_file') => {
    setVerifying(domainId)
    const result = await createDomainVerification(domainId, method)
    
    if (result.error) {
      alert(result.error)
    } else if (result.success && result.token && result.verificationId) {
      setVerificationData(prev => ({
        ...prev,
        [domainId]: { token: result.token!, method, verificationId: result.verificationId }
      }))
    }
    
    setVerifying(null)
  }

  const handleCheckVerification = async (domainId: string, verificationId: string) => {
    setVerifying(domainId)
    const result = await verifyDomainOwnership(domainId, verificationId)
    
    if (result.verified) {
      alert('Domain erfolgreich verifiziert!')
      setVerificationData(prev => {
        const newData = { ...prev }
        delete newData[domainId]
        return newData
      })
      router.refresh()
    } else {
      alert(result.error || 'Verifizierung fehlgeschlagen')
    }
    
    setVerifying(null)
  }

  const handleDelete = async (domainId: string) => {
    if (!confirm('Möchten Sie diese Domain wirklich löschen?')) return
    
    const result = await deleteDomain(domainId)
    if (result.error) {
      alert(result.error)
    } else {
      router.refresh()
    }
  }

  if (domains.length === 0) {
    return <p className="text-gray-600">Noch keine Domains hinzugefügt.</p>
  }

  return (
    <div className="space-y-4">
      {domains.map((domain) => (
        <div key={domain.id} className="border rounded-lg p-4">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{domain.domain}</h3>
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-sm ${
                    domain.is_verified
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {domain.is_verified ? '✓ Verifiziert' : '⚠ Nicht verifiziert'}
                  </span>
                  {domain.verified_at && (
                    <span className="text-sm text-gray-600">
                      Verifiziert am: {new Date(domain.verified_at).toLocaleDateString('de-DE')}
                    </span>
                  )}
                </div>

                {!domain.is_verified && !verificationData[domain.id] && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleVerify(domain.id, 'dns_txt')}
                      disabled={verifying === domain.id}
                      className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 disabled:opacity-50"
                    >
                      {verifying === domain.id ? 'Wird erstellt...' : 'DNS TXT verifizieren'}
                    </button>
                    <button
                      onClick={() => handleVerify(domain.id, 'html_file')}
                      disabled={verifying === domain.id}
                      className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 disabled:opacity-50"
                    >
                      {verifying === domain.id ? 'Wird erstellt...' : 'HTML Datei verifizieren'}
                    </button>
                  </div>
                )}

                {verificationData[domain.id] && (
                  <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                    <p className="text-sm font-medium mb-2">Verifizierungsschritte:</p>
                    {verificationData[domain.id].method === 'dns_txt' ? (
                      <div className="text-sm space-y-1">
                        <p>1. Fügen Sie einen TXT-Record zu Ihrer DNS-Konfiguration hinzu:</p>
                        <code className="block bg-white p-2 rounded text-xs">
                          security-scanner-verification={verificationData[domain.id].token}
                        </code>
                        <p>2. Warten Sie einige Minuten, bis der DNS-Propagierung abgeschlossen ist.</p>
                        <p>3. Klicken Sie auf "Verifizierung prüfen".</p>
                      </div>
                    ) : (
                      <div className="text-sm space-y-1">
                        <p>1. Erstellen Sie eine Datei unter:</p>
                        <code className="block bg-white p-2 rounded text-xs">
                          /.well-known/security-scanner-verification.txt
                        </code>
                        <p>2. Fügen Sie folgenden Inhalt ein:</p>
                        <code className="block bg-white p-2 rounded text-xs">
                          {verificationData[domain.id].token}
                        </code>
                        <p>3. Stellen Sie sicher, dass die Datei öffentlich zugänglich ist.</p>
                        <p>4. Klicken Sie auf "Verifizierung prüfen".</p>
                      </div>
                    )}
                    <button
                      onClick={() => {
                        const verificationId = verificationData[domain.id]?.verificationId
                        if (verificationId) {
                          handleCheckVerification(domain.id, verificationId)
                        } else {
                          alert('Bitte erstellen Sie zuerst eine Verifizierung.')
                        }
                      }}
                      className="mt-2 text-sm bg-primary-600 text-white px-3 py-1 rounded hover:bg-primary-700"
                    >
                      Verifizierung prüfen
                    </button>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => handleDelete(domain.id)}
              className="text-red-600 hover:text-red-800 text-sm"
            >
              Löschen
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
