export const dynamic = 'force-dynamic';

import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { createClient } from '@/lib/supabase/server';

export default async function TermsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} />
      <main className="flex-1 max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-6">Nutzungsbedingungen</h1>
        <div className="prose prose-gray max-w-none space-y-4 text-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 mt-8">1. Geltungsbereich</h2>
          <p>
            Diese Nutzungsbedingungen gelten für die Nutzung der TestMe Security Plattform.
            Mit der Registrierung und Nutzung stimmst du diesen Bedingungen zu.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">2. Erlaubte Nutzung</h2>
          <p>
            Die Plattform darf ausschließlich zum Testen <strong>eigener Websites und Domains</strong> verwendet werden.
            Du musst vor jedem Scan nachweisen, dass die Domain dir gehört (Domain-Verifizierung).
          </p>
          <p>
            Das Scannen von Websites Dritter ohne ausdrückliche Genehmigung ist untersagt und kann
            strafrechtliche Konsequenzen nach sich ziehen.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">3. Art der Scans</h2>
          <p>
            TestMe führt ausschließlich nicht-destruktive Sicherheitstests durch. Es werden keine Daten
            auf den getesteten Websites verändert, gelöscht oder manipuliert. Die Scans umfassen:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Analyse von HTTP-Security-Headern</li>
            <li>Prüfung auf exponierte sensible Dateien</li>
            <li>Suche nach öffentlich sichtbaren Secrets und API-Keys</li>
            <li>Grundlegende Schwachstellen-Tests (XSS, CSRF, etc.)</li>
            <li>SSL/TLS-Konfigurationsprüfung</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">4. Zustimmung</h2>
          <p>
            Vor jedem Scan musst du explizit bestätigen, dass du der Eigentümer der Domain bist
            und dem Scan zustimmst. Diese Zustimmung wird zusammen mit dem Scan-Protokoll gespeichert.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">5. Protokollierung</h2>
          <p>
            Alle Scan-Aktionen werden mit Zeitstempel und Nutzer-ID protokolliert.
            Dies dient der Nachvollziehbarkeit und dem Schutz aller Beteiligten.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">6. Haftungsausschluss</h2>
          <p>
            Die Scan-Ergebnisse dienen als Hinweis und ersetzen kein professionelles Security-Audit.
            TestMe übernimmt keine Gewähr für die Vollständigkeit oder Richtigkeit der Ergebnisse.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">7. Kündigung</h2>
          <p>
            Du kannst dein Konto jederzeit löschen. Wir behalten uns das Recht vor, Konten bei
            Verstößen gegen diese Bedingungen zu sperren.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
