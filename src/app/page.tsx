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
  BarChart3,
  Mail,
  Radar,
  Bug,
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
      <section className="relative bg-gradient-to-br from-primary-50 via-white to-primary-50 py-20 lg:py-28 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-primary-100/30 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-primary-100/20 blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-primary-100 text-primary-700 rounded-full px-4 py-1.5 text-sm font-medium mb-6 shadow-sm">
            <Shield className="h-4 w-4" />
            Professionelle Website-Sicherheitsanalyse
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 max-w-4xl mx-auto leading-tight">
            Finde Sicherheitslücken,{' '}
            <span className="bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent">bevor es andere tun</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 mt-6 max-w-2xl mx-auto leading-relaxed">
            TestMe prüft deine Website automatisch auf bekannte Schwachstellen und gibt dir
            verständliche Empfehlungen, wie du sie beheben kannst.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
            <Link href={user ? '/dashboard' : '/auth/register'}>
              <Button size="lg" className="shadow-lg shadow-primary-200/50">
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

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center gap-8 mt-14 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Nicht-destruktiv
            </div>
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-green-500" />
              DSGVO-konform
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-500" />
              80+ Sicherheitschecks
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-green-500" />
              Detaillierte Berichte
            </div>
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

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connector line (desktop only) */}
            <div className="hidden md:block absolute top-12 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-primary-200 via-primary-300 to-primary-200" />

            {[
              {
                icon: Globe,
                step: '1',
                title: 'Domain hinzufügen',
                desc: 'Gib die Domain ein, die du prüfen möchtest, und verifiziere, dass sie dir gehört – per DNS oder HTML-Datei.',
              },
              {
                icon: Search,
                step: '2',
                title: 'Scan starten',
                desc: 'Bestätige den Scan und lass TestMe über 80 Sicherheitschecks automatisch durchführen – nicht-destruktiv.',
              },
              {
                icon: BarChart3,
                step: '3',
                title: 'Bericht analysieren',
                desc: 'Erhalte einen detaillierten Bericht mit Score, Graphen, priorisierten Schwachstellen und konkreten Lösungen.',
              },
            ].map((item) => (
              <div key={item.step} className="text-center p-6 relative">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-100 text-primary-600 mb-5 relative z-10 shadow-sm">
                  <item.icon className="h-7 w-7" />
                </div>
                <div className="text-xs font-bold text-primary-600 uppercase tracking-wider mb-2">
                  Schritt {item.step}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-gray-200 text-gray-600 rounded-full px-3 py-1 text-xs font-medium mb-4 uppercase tracking-wider">
              Umfassende Analyse
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Was wird geprüft?</h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto">
              Über 80 Sicherheitschecks in 8 Kategorien für einen vollständigen Überblick
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: Lock,
                title: 'HTTP Security Headers',
                desc: 'HSTS, CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy und mehr.',
                count: '10+ Checks',
              },
              {
                icon: AlertTriangle,
                title: 'Schwachstellen',
                desc: 'XSS, SQL Injection, CSRF, Open Redirects, Clickjacking, Mixed Content.',
                count: '12+ Tests',
              },
              {
                icon: Search,
                title: 'Sensible Dateien',
                desc: '.env, .git, Backups, Debug-Endpunkte, Admin-Panels und Konfigdateien.',
                count: '80+ Pfade',
              },
              {
                icon: Zap,
                title: 'API Keys & Secrets',
                desc: 'AWS-Keys, Stripe-Keys, Tokens, Passwörter in HTML, Scripts und CSS.',
                count: '30+ Patterns',
              },
              {
                icon: Globe,
                title: 'SSL/TLS & Zertifikate',
                desc: 'Zertifikatskette, TLS-Versionen, CAA-Records, HSTS-Preload und Redirects.',
                count: '8+ Checks',
              },
              {
                icon: Mail,
                title: 'E-Mail-Sicherheit',
                desc: 'SPF, DKIM, DMARC, DNSSEC und BIMI – Schutz vor E-Mail-Spoofing.',
                count: '6+ Checks',
              },
              {
                icon: Radar,
                title: 'CORS & Cookies',
                desc: 'CORS-Fehlkonfigurationen, Cookie-Flags, Secure-Präfixe und SameSite.',
                count: '8+ Checks',
              },
              {
                icon: Bug,
                title: 'Technologie-Erkennung',
                desc: 'CMS, Frameworks, Webserver, CDNs, Analytics und bekannte Bibliotheken.',
                count: '25+ Signaturen',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all group"
              >
                <div className="p-2 rounded-lg bg-primary-50 w-fit mb-3 group-hover:bg-primary-100 transition-colors">
                  <feature.icon className="h-5 w-5 text-primary-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{feature.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{feature.desc}</p>
                <p className="text-[10px] font-semibold text-primary-600 uppercase tracking-wider mt-3">{feature.count}</p>
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
