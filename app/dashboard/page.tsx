import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function DashboardPage() {
  const { user, supabase } = await requireAuth()

  // Get user stats
  const { data: domains } = await supabase
    .from('domains')
    .select('id, is_verified')
    .eq('user_id', user.id)

  const { data: scans } = await supabase
    .from('scans')
    .select('id, status, security_score')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  const verifiedDomains = domains?.filter(d => d.is_verified).length || 0
  const totalScans = scans?.length || 0
  const completedScans = scans?.filter(s => s.status === 'completed').length || 0
  const avgScore = scans
    ?.filter(s => s.security_score !== null)
    .reduce((sum, s) => sum + (s.security_score || 0), 0) / (scans?.filter(s => s.security_score !== null).length || 1) || 0

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        Dashboard
      </h1>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Domains</h3>
          <p className="text-3xl font-bold text-gray-900">{domains?.length || 0}</p>
          <p className="text-sm text-gray-600 mt-1">{verifiedDomains} verifiziert</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Scans</h3>
          <p className="text-3xl font-bold text-gray-900">{totalScans}</p>
          <p className="text-sm text-gray-600 mt-1">{completedScans} abgeschlossen</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Durchschnittlicher Score</h3>
          <p className="text-3xl font-bold text-gray-900">{Math.round(avgScore)}</p>
          <p className="text-sm text-gray-600 mt-1">von 100</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Verifizierte Domains</h3>
          <p className="text-3xl font-bold text-primary-600">{verifiedDomains}</p>
          <p className="text-sm text-gray-600 mt-1">bereit zum Scannen</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-xl font-semibold mb-4">Schnellaktionen</h2>
        <div className="flex gap-4">
          <Link
            href="/dashboard/domains"
            className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition"
          >
            Domain hinzufügen
          </Link>
          <Link
            href="/dashboard/scans"
            className="bg-gray-200 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-300 transition"
          >
            Scans anzeigen
          </Link>
        </div>
      </div>

      {/* Recent Scans */}
      {scans && scans.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Letzte Scans</h2>
          <div className="space-y-3">
            {scans.map((scan) => (
              <Link
                key={scan.id}
                href={`/dashboard/scans/${scan.id}`}
                className="block p-4 border rounded-lg hover:bg-gray-50 transition"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{scan.id.substring(0, 8)}...</p>
                    <p className="text-sm text-gray-600">Status: {scan.status}</p>
                  </div>
                  {scan.security_score !== null && (
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary-600">
                        {scan.security_score}
                      </p>
                      <p className="text-xs text-gray-500">Score</p>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
