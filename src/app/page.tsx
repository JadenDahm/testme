export const dynamic = 'force-dynamic';

import Link from 'next/link';
import {
  Shield,
  Search,
  CheckCircle,
  FileText,
  Lock,
  Globe,
  ArrowRight,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} />

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-50 via-white to-primary-50 py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-primary-100 text-primary-700 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <Shield className="h-4 w-4" />
            Website-Sicherheit einfach prüfen
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 max-w-4xl mx-auto leading-tight">
            Finde Sicherheitslücken,{' '}
            <span className="text-primary-600">bevor es andere tun</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 mt-6 max-w-2xl mx-auto">
            TestMe prüft deine Website automatisch auf bekannte Schwachstellen und gibt dir
            verständliche Empfehlungen, wie du sie beheben kannst.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
            <Link href={user ? '/dashboard' : '/auth/register'}>
              <Button size="lg">
                Jetzt kostenlos prüfen
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="#how-it-works">
              <Button variant="outline" size="lg">
                So funktioniert&apos;s
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">So funktioniert&apos;s</h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto">
              In drei einfachen Schritten zu deinem Sicherheitsbericht
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Globe,
                step: '1',
                title: 'Domain hinzufügen',
                desc: 'Gib die Domain ein, die du prüfen möchtest, und beweise, dass sie dir gehört.',
              },
              {
                icon: Search,
                step: '2',
                title: 'Scan starten',
                desc: 'Bestätige den Scan und lass TestMe deine Website automatisch analysieren.',
              },
              {
                icon: FileText,
                step: '3',
                title: 'Bericht erhalten',
                desc: 'Erhalte einen klaren Bericht mit Schwachstellen, Bewertung und Lösungshinweisen.',
              },
            ].map((item) => (
              <div key={item.step} className="text-center p-6">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-100 text-primary-600 mb-5">
                  <item.icon className="h-7 w-7" />
                </div>
                <div className="text-xs font-bold text-primary-600 uppercase tracking-wider mb-2">
                  Schritt {item.step}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">Was wird geprüft?</h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto">
              Unsere Scans decken die wichtigsten Sicherheitsbereiche ab
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Lock,
                title: 'HTTP Security Headers',
                desc: 'Prüfung auf fehlende oder falsch konfigurierte Sicherheits-Header wie CSP, HSTS und mehr.',
              },
              {
                icon: AlertTriangle,
                title: 'Bekannte Schwachstellen',
                desc: 'Tests auf typische Verwundbarkeiten wie XSS, SQL Injection und CSRF – ohne deine Daten zu verändern.',
              },
              {
                icon: Search,
                title: 'Sensible Dateien',
                desc: 'Erkennung von öffentlich zugänglichen Konfigurationsdateien, Backups oder Debug-Endpunkten.',
              },
              {
                icon: Zap,
                title: 'API Keys & Secrets',
                desc: 'Suche nach versehentlich exponierten API-Schlüsseln, Tokens und Zugangsdaten im Quellcode.',
              },
              {
                icon: Globe,
                title: 'SSL/TLS-Analyse',
                desc: 'Überprüfung der SSL-Konfiguration und Zertifikatsdetails deiner Website.',
              },
              {
                icon: CheckCircle,
                title: 'Seiten-Crawling',
                desc: 'Automatische Erkennung aller erreichbaren Seiten und Endpunkte für eine vollständige Analyse.',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <feature.icon className="h-6 w-6 text-primary-600 mb-3" />
                <h3 className="font-semibold text-gray-900 mb-1.5">{feature.title}</h3>
                <p className="text-sm text-gray-500">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Legal Notice */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 md:p-8">
            <div className="flex gap-4">
              <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-amber-900 mb-2">
                  Wichtiger rechtlicher Hinweis
                </h3>
                <div className="text-sm text-amber-800 space-y-2">
                  <p>
                    TestMe führt ausschließlich <strong>nicht-destruktive</strong> Sicherheitstests durch.
                    Es werden keine Daten verändert, gelöscht oder manipuliert.
                  </p>
                  <p>
                    Scans dürfen <strong>nur auf eigenen Domains</strong> durchgeführt werden.
                    Vor jedem Scan muss die Domain verifiziert und eine explizite Zustimmung gegeben werden.
                  </p>
                  <p>
                    Das unbefugte Scannen fremder Websites ist illegal und kann strafrechtlich verfolgt werden.
                    Jeder Scan wird protokolliert und ist dem jeweiligen Nutzer zugeordnet.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Bereit, deine Website zu prüfen?
          </h2>
          <p className="text-primary-100 text-lg mb-8">
            Erstelle jetzt ein kostenloses Konto und starte deinen ersten Sicherheitsscan.
          </p>
          <Link href={user ? '/dashboard' : '/auth/register'}>
            <Button
              size="lg"
              className="bg-white text-primary-600 hover:bg-primary-50 focus:ring-white"
            >
              Jetzt starten
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
