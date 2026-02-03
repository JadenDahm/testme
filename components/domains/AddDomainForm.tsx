'use client'

import { useState } from 'react'
import { addDomain } from '@/app/actions/domains'
import { useRouter } from 'next/navigation'

export default function AddDomainForm() {
  const [domain, setDomain] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setLoading(true)

    const formData = new FormData()
    formData.append('domain', domain)

    const result = await addDomain(formData)

    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(true)
      setDomain('')
      router.refresh()
    }

    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          Domain erfolgreich hinzugefügt! Bitte verifizieren Sie die Domain, bevor Sie Scans durchführen können.
        </div>
      )}

      <div className="flex gap-4">
        <input
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="example.com"
          required
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Wird hinzugefügt...' : 'Hinzufügen'}
        </button>
      </div>
    </form>
  )
}
