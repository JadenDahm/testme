export const dynamic = 'force-dynamic';

import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { createClient } from '@/lib/supabase/server';

export default async function ImprintPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen flex flex-col bg-surface-0">
      <Navbar user={user} />
      <main className="flex-1 max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8 text-text-primary">Impressum</h1>
        <div className="prose-dark max-w-none space-y-4">
          <h2 className="text-xl font-semibold text-text-primary mt-8">Angaben gemäß § 5 TMG</h2>
          <p className="text-text-secondary leading-relaxed">
            [Dein Name oder Firmenname]<br />
            [Straße und Hausnummer]<br />
            [PLZ und Ort]<br />
            [Land]
          </p>

          <h2 className="text-xl font-semibold text-text-primary mt-8">Kontakt</h2>
          <p className="text-text-secondary leading-relaxed">
            E-Mail: [deine@email.de]<br />
            Telefon: [Telefonnummer]
          </p>

          <h2 className="text-xl font-semibold text-text-primary mt-8">Verantwortlich für den Inhalt</h2>
          <p className="text-text-secondary leading-relaxed">
            [Name des Verantwortlichen]<br />
            [Adresse]
          </p>

          <div className="bg-amber-500/8 border border-amber-500/15 rounded p-5 mt-8">
            <p className="text-sm text-amber-200/70">
              <strong className="text-amber-300">Hinweis:</strong> Bitte ersetze die Platzhalter durch deine echten Angaben
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
