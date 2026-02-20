export const dynamic = 'force-dynamic';

import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { createClient } from '@/lib/supabase/server';

export default async function PrivacyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen flex flex-col bg-surface-0">
      <Navbar user={user} />
      <main className="flex-1 max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8 text-text-primary">Datenschutzerklärung</h1>
        <div className="prose-dark max-w-none space-y-4">
          <h2 className="text-xl font-semibold text-text-primary mt-8">1. Verantwortlicher</h2>
          <p className="text-text-secondary leading-relaxed">
            Verantwortlich für die Datenverarbeitung auf dieser Website ist der Betreiber der TestMe Security Plattform.
          </p>

          <h2 className="text-xl font-semibold text-text-primary mt-8">2. Welche Daten erfassen wir?</h2>
          <p className="text-text-secondary">Wir erfassen folgende Daten:</p>
          <ul className="list-disc pl-6 space-y-1 text-text-secondary">
            <li>E-Mail-Adresse bei der Registrierung</li>
            <li>Von dir eingegebene Domains</li>
            <li>Scan-Ergebnisse und -protokolle</li>
            <li>Technische Zugriffsdaten (IP-Adresse, Browser, Zeitpunkt)</li>
          </ul>

          <h2 className="text-xl font-semibold text-text-primary mt-8">3. Zweck der Datenverarbeitung</h2>
          <p className="text-text-secondary leading-relaxed">
            Deine Daten werden ausschließlich zur Bereitstellung unserer Sicherheitsanalyse-Dienste verarbeitet.
            Dazu gehören die Nutzer-Authentifizierung, Domain-Verifizierung, Durchführung von Sicherheitsscans
            und die Erstellung von Berichten.
          </p>

          <h2 className="text-xl font-semibold text-text-primary mt-8">4. Hosting & Drittanbieter</h2>
          <p className="text-text-secondary leading-relaxed">
            Unsere Anwendung wird über Vercel (USA) gehostet. Die Datenbank wird über Supabase betrieben.
            Beide Anbieter unterliegen ihren jeweiligen Datenschutzrichtlinien.
          </p>

          <h2 className="text-xl font-semibold text-text-primary mt-8">5. Scan-Daten</h2>
          <p className="text-text-secondary leading-relaxed">
            Alle Scan-Ergebnisse sind deinem Nutzerkonto zugeordnet und nur für dich sichtbar.
            Wir geben keine Scan-Ergebnisse an Dritte weiter. Scan-Protokolle werden zu Nachweiszwecken gespeichert.
          </p>

          <h2 className="text-xl font-semibold text-text-primary mt-8">6. Deine Rechte</h2>
          <p className="text-text-secondary leading-relaxed">
            Du hast das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der Verarbeitung deiner Daten.
            Du kannst dein Konto jederzeit löschen, wodurch alle deine Daten entfernt werden.
          </p>

          <h2 className="text-xl font-semibold text-text-primary mt-8">7. Kontakt</h2>
          <p className="text-text-secondary leading-relaxed">
            Bei Fragen zum Datenschutz wende dich bitte an den Betreiber dieser Plattform.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
