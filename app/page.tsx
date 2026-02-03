import Link from 'next/link';
import { Shield, CheckCircle, BarChart3, Lock } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">TestMyWebsite</span>
          </div>
          <nav className="flex gap-4">
            <Link
              href="/auth/login"
              className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
            >
              Anmelden
            </Link>
            <Link
              href="/auth/register"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Registrieren
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Sicherheitsprüfung für Ihre Website
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Prüfen Sie Ihre Website professionell auf Sicherheitslücken.
          Schnell, zuverlässig und verständlich.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/auth/register"
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            Jetzt starten
          </Link>
          <Link
            href="/auth/login"
            className="px-8 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
          >
            Anmelden
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200">
            <CheckCircle className="h-12 w-12 text-green-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Domain-Verifizierung</h3>
            <p className="text-gray-600">
              Nur Sie können Scans für Ihre eigenen Domains durchführen.
              Sicherheit durch Verifizierung.
            </p>
          </div>
          <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200">
            <BarChart3 className="h-12 w-12 text-blue-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Umfassende Analyse</h3>
            <p className="text-gray-600">
              Automatische Erkennung von Sicherheitslücken,
              fehlenden Headers und sensiblen Daten.
            </p>
          </div>
          <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200">
            <Lock className="h-12 w-12 text-purple-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Detaillierte Berichte</h3>
            <p className="text-gray-600">
              Verständliche Berichte mit konkreten Handlungsempfehlungen
              für jede gefundene Schwachstelle.
            </p>
          </div>
        </div>
      </section>

      {/* Legal Notice */}
      <section className="container mx-auto px-4 py-12 border-t">
        <div className="max-w-3xl mx-auto text-center text-gray-600">
          <h2 className="text-2xl font-semibold mb-4 text-gray-900">Rechtlicher Hinweis</h2>
          <p className="mb-4">
            Diese Anwendung dient ausschließlich der Sicherheitsprüfung von Websites,
            deren Eigentümer Sie sind oder für die Sie eine ausdrückliche schriftliche
            Berechtigung zur Durchführung von Sicherheitstests haben.
          </p>
          <p className="mb-4">
            Scans werden nur auf verifizierten Domains durchgeführt. Alle Tests sind
            nicht-destruktiv und respektieren Rate-Limits.
          </p>
          <p>
            Durch die Nutzung dieser Anwendung stimmen Sie zu, dass Sie nur Scans
            für Ihre eigenen Domains oder mit ausdrücklicher Genehmigung durchführen.
            Unbefugte Scans sind gesetzlich verboten.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-gray-50 py-8">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>&copy; 2024 TestMyWebsite. Alle Rechte vorbehalten.</p>
        </div>
      </footer>
    </div>
  );
}
