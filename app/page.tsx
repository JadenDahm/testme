import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  const user = await getCurrentUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      {/* Navigation */}
      <nav className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary-700">Security Scanner</h1>
          <div className="space-x-4">
            <Link
              href="/login"
              className="text-primary-700 hover:text-primary-900 font-medium"
            >
              Anmelden
            </Link>
            <Link
              href="/register"
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition"
            >
              Registrieren
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Professionelle Security-Scans für Ihre Websites
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Scannen Sie Ihre eigenen Websites auf Sicherheitslücken mit unserer
            professionellen SaaS-Lösung. Nur für verifizierte Domains.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/register"
              className="bg-primary-600 text-white px-8 py-3 rounded-lg hover:bg-primary-700 transition text-lg font-medium"
            >
              Jetzt starten
            </Link>
            <Link
              href="/login"
              className="bg-white text-primary-700 px-8 py-3 rounded-lg border-2 border-primary-600 hover:bg-primary-50 transition text-lg font-medium"
            >
              Anmelden
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mt-20 grid md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-3">Domain-Verifizierung</h3>
            <p className="text-gray-600">
              Verifizieren Sie Ihre Domain-Besitzerschaft via DNS oder HTML-Datei,
              bevor Sie Scans durchführen können.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-3">Umfassende Scans</h3>
            <p className="text-gray-600">
              Entdecken Sie Schwachstellen mit passiven und aktiven Scans,
              einschließlich SQL Injection, XSS und mehr.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-3">Detaillierte Reports</h3>
            <p className="text-gray-600">
              Erhalten Sie detaillierte Sicherheitsberichte mit konkreten
              Empfehlungen und PDF-Export.
            </p>
          </div>
        </div>

        {/* Legal Notice */}
        <div className="mt-20 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-900 mb-2">
            Rechtliche Hinweise
          </h3>
          <p className="text-yellow-800 text-sm">
            Diese Plattform erlaubt ausschließlich das Scannen Ihrer eigenen Websites.
            Sie müssen die Domain-Besitzerschaft verifizieren, bevor Sie Scans durchführen können.
            Das Scannen von Websites, die Ihnen nicht gehören, ist strengstens untersagt und
            kann rechtliche Konsequenzen haben.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t mt-20">
        <p className="text-center text-gray-600 text-sm">
          © 2024 Security Scanner SaaS. Alle Rechte vorbehalten.
        </p>
      </footer>
    </div>
  )
}
