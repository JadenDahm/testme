import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-primary-600">
                Security Scanner SaaS
              </h1>
            </div>
            <nav className="flex items-center space-x-4">
              <Link
                href="/login"
                className="text-gray-600 hover:text-gray-900"
              >
                Anmelden
              </Link>
              <Link
                href="/signup"
                className="rounded-md bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
              >
                Registrieren
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 sm:text-6xl">
            Scanne deine Website auf
            <span className="text-primary-600"> Sicherheitslücken</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600 max-w-2xl mx-auto">
            Professionelle Security-Scans für deine Website. Finde Schwachstellen
            bevor Angreifer es tun. Nur für deine eigenen, verifizierten Domains.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link
              href="/signup"
              className="rounded-md bg-primary-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-primary-700"
            >
              Kostenlos starten
            </Link>
            <Link
              href="/login"
              className="text-base font-semibold leading-6 text-gray-900"
            >
              Bereits Kunde? <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mt-32">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Professionelle Security-Scans
            </h2>
            <p className="mt-2 text-lg leading-8 text-gray-600">
              Alles was du brauchst, um deine Website sicher zu halten
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
              <div className="flex flex-col">
                <dt className="text-base font-semibold leading-7 text-gray-900">
                  Domain-Verifizierung
                </dt>
                <dd className="mt-1 flex flex-auto flex-col text-base leading-7 text-gray-600">
                  <p className="flex-auto">
                    Verifiziere deine Domain über DNS TXT Records oder HTML-Dateien.
                    Nur verifizierte Domains können gescannt werden.
                  </p>
                </dd>
              </div>
              <div className="flex flex-col">
                <dt className="text-base font-semibold leading-7 text-gray-900">
                  Modulares Scanning
                </dt>
                <dd className="mt-1 flex flex-auto flex-col text-base leading-7 text-gray-600">
                  <p className="flex-auto">
                    Passive und aktive Scans. Finde SQL Injection, XSS, Exposed Secrets
                    und mehr. Non-destructive, sicher für Production.
                  </p>
                </dd>
              </div>
              <div className="flex flex-col">
                <dt className="text-base font-semibold leading-7 text-gray-900">
                  Detaillierte Reports
                </dt>
                <dd className="mt-1 flex flex-auto flex-col text-base leading-7 text-gray-600">
                  <p className="flex-auto">
                    Erhalte detaillierte Reports mit Severity, OWASP-Mapping,
                    Proof-of-Concept und konkreten Fix-Anweisungen.
                  </p>
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Legal Notice */}
        <div className="mt-32 rounded-lg bg-yellow-50 p-8 border border-yellow-200">
          <h3 className="text-lg font-semibold text-yellow-900 mb-4">
            ⚖️ Rechtliche Hinweise
          </h3>
          <p className="text-sm text-yellow-800">
            Diese Plattform ist ausschließlich für das Scannen deiner eigenen Websites
            gedacht. Du musst die Domain-Verifizierung durchführen, bevor Scans
            gestartet werden können. Das Scannen von Websites ohne ausdrückliche
            Erlaubnis ist illegal und wird nicht toleriert. Durch die Nutzung dieser
            Plattform erklärst du dich damit einverstanden, nur deine eigenen Domains
            zu scannen.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white mt-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <p className="text-center text-sm text-gray-500">
            © 2024 Security Scanner SaaS. Alle Rechte vorbehalten.
          </p>
        </div>
      </footer>
    </div>
  )
}
