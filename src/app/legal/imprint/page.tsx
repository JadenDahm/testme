export const dynamic = 'force-dynamic';

import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { createClient } from '@/lib/supabase/server';

export default async function ImprintPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} />
      <main className="flex-1 max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-6">Impressum</h1>
        <div className="prose prose-gray max-w-none space-y-4 text-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 mt-8">Angaben gemäß § 5 TMG</h2>
          <p>
            [Dein Name oder Firmenname]<br />
            [Straße und Hausnummer]<br />
            [PLZ und Ort]<br />
            [Land]
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">Kontakt</h2>
          <p>
            E-Mail: [deine@email.de]<br />
            Telefon: [Telefonnummer]
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">Verantwortlich für den Inhalt</h2>
          <p>
            [Name des Verantwortlichen]<br />
            [Adresse]
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-8">
            <p className="text-sm text-amber-800">
              <strong>Hinweis:</strong> Bitte ersetze die Platzhalter durch deine echten Angaben
              bevor du die Website veröffentlichst. Ein vollständiges Impressum ist in Deutschland
              gesetzlich vorgeschrieben.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
