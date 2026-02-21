export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { HeroAnimation } from '@/components/hero-animation';
import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen flex flex-col bg-surface-0">
      <Navbar user={user} />

      {/* Hero */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <HeroAnimation showGUI={false} />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="text-center lg:text-left pt-8 lg:pt-0">
              <h1 className="text-5xl md:text-6xl lg:text-8xl font-medium text-text-primary leading-[1.05] tracking-tight">
                Finde Sicherheitslücken,{' '}
                <span style={{ color: '#58b247' }}>bevor es andere tun</span>
              </h1>

              <p className="text-xl md:text-2xl text-text-secondary mt-8 leading-relaxed">
                TestMe prüft deine Website automatisch auf bekannte Schwachstellen und gibt dir
                verständliche Empfehlungen, wie du sie beheben kannst.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mt-12">
                <Link href={user ? '/dashboard' : '/auth/register'}>
                  <Button size="lg" className="text-base" style={{ backgroundColor: '#d61e3c', borderColor: '#d61e3c' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#b91c1c'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#d61e3c'}>
                    Jetzt kostenlos prüfen
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="#how-it-works">
                  <Button variant="outline" size="lg" className="text-base" style={{ borderColor: '#3eaad4', color: '#3eaad4' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#3eaad4'; e.currentTarget.style.color = 'white'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#3eaad4'; }}>
                    So funktioniert&apos;s
                  </Button>
                </Link>
              </div>
            </div>
            <div className="hidden lg:block relative h-full min-h-[400px]">
              {/* Platzhalter für rechten Bereich */}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="relative py-24 border-t border-border-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-medium text-text-primary">So funktioniert&apos;s</h2>
            <p className="text-text-muted mt-4 max-w-2xl mx-auto text-lg" style={{ color: '#dc9f27' }}>
              In drei einfachen Schritten zu deinem Sicherheitsbericht
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: 'Domain hinzufügen',
                desc: 'Gib die Domain ein, die du prüfen möchtest, und verifiziere, dass sie dir gehört – per DNS oder HTML-Datei.',
              },
              {
                step: '2',
                title: 'Scan starten',
                desc: 'Bestätige den Scan und lass TestMe über 80 Sicherheitschecks automatisch durchführen – nicht-destruktiv.',
              },
              {
                step: '3',
                title: 'Bericht analysieren',
                desc: 'Erhalte einen detaillierten Bericht mit Score, Graphen, priorisierten Schwachstellen und konkreten Lösungen.',
              },
            ].map((item, index) => {
              const colors = ['#d61e3c', '#58b247', '#3eaad4', '#ec5e24', '#dc9f27', '#9e237e', '#3b54a5'];
              const color = colors[index % colors.length];
              return (
                <div key={item.step} className="text-center">
                  <div className="text-sm font-medium uppercase tracking-wider mb-3" style={{ color }}>
                    Schritt {item.step}
                  </div>
                  <h3 className="text-2xl font-medium text-text-primary mb-4">{item.title}</h3>
                  <p className="text-text-secondary leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative py-24 border-t border-border-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-medium text-text-primary">Was wird geprüft?</h2>
            <p className="text-text-muted mt-4 max-w-2xl mx-auto text-lg" style={{ color: '#58b247' }}>
              Über 80 Sicherheitschecks in 8 Kategorien für einen vollständigen Überblick
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[
              {
                title: 'HTTP Security Headers',
                desc: 'HSTS, CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy und mehr.',
              },
              {
                title: 'Schwachstellen',
                desc: 'XSS, SQL Injection, CSRF, Open Redirects, Clickjacking, Mixed Content.',
              },
              {
                title: 'Sensible Dateien',
                desc: '.env, .git, Backups, Debug-Endpunkte, Admin-Panels und Konfigdateien.',
              },
              {
                title: 'API Keys & Secrets',
                desc: 'AWS-Keys, Stripe-Keys, Tokens, Passwörter in HTML, Scripts und CSS.',
              },
              {
                title: 'SSL/TLS & Zertifikate',
                desc: 'Zertifikatskette, TLS-Versionen, CAA-Records, HSTS-Preload und Redirects.',
              },
              {
                title: 'E-Mail-Sicherheit',
                desc: 'SPF, DKIM, DMARC, DNSSEC und BIMI – Schutz vor E-Mail-Spoofing.',
              },
              {
                title: 'CORS & Cookies',
                desc: 'CORS-Fehlkonfigurationen, Cookie-Flags, Secure-Präfixe und SameSite.',
              },
              {
                title: 'Technologie-Erkennung',
                desc: 'CMS, Frameworks, Webserver, CDNs, Analytics und bekannte Bibliotheken.',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="bg-surface-100 rounded border border-border-subtle p-6 hover:border-border-default transition-colors duration-200"
              >
                <h3 className="font-medium text-text-primary mb-2">{feature.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Legal Notice */}
      <section className="py-16 border-t border-border-subtle">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-surface-100 border border-border-default rounded p-8">
            <h3 className="text-lg font-medium text-text-primary mb-4">
              Wichtiger rechtlicher Hinweis
            </h3>
            <div className="text-sm text-text-secondary space-y-3 leading-relaxed">
              <p>
                TestMe führt ausschließlich <strong className="text-text-primary">nicht-destruktive</strong> Sicherheitstests durch.
                Es werden keine Daten verändert, gelöscht oder manipuliert.
              </p>
              <p>
                Scans dürfen <strong className="text-text-primary">nur auf eigenen Domains</strong> durchgeführt werden.
                Vor jedem Scan muss die Domain verifiziert und eine explizite Zustimmung gegeben werden.
              </p>
              <p>
                Das unbefugte Scannen fremder Websites ist illegal und kann strafrechtlich verfolgt werden.
                Jeder Scan wird protokolliert und ist dem jeweiligen Nutzer zugeordnet.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-24 border-t border-border-subtle">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-medium text-text-primary mb-6">
            Bereit, deine Website zu prüfen?
          </h2>
          <p className="text-text-secondary text-xl mb-10">
            Erstelle jetzt ein kostenloses Konto und starte deinen ersten Sicherheitsscan.
          </p>
          <Link href={user ? '/dashboard' : '/auth/register'}>
            <Button size="lg" className="text-base" style={{ backgroundColor: '#ec5e24', borderColor: '#ec5e24' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#c94e1e'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ec5e24'}>
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
