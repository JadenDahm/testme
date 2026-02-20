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
    <div className="min-h-screen flex flex-col bg-surface-0">
      <Navbar user={user} />

      {/* Hero */}
      <section className="relative py-24 lg:py-36 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Radial gradient from center top */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.12)_0%,transparent_70%)]" />
          {/* Horizon glow line */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-px bg-gradient-to-r from-transparent via-accent-400/40 to-transparent" />
          {/* Side accents */}
          <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-accent-500/5 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full bg-accent-500/3 blur-3xl" />
          {/* Grid overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-accent-500/10 text-accent-400 rounded-full px-4 py-1.5 text-sm font-medium mb-8 border border-accent-500/20 backdrop-blur-sm">
            <Shield className="h-4 w-4" />
            Professionelle Website-Sicherheitsanalyse
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold text-text-primary max-w-4xl mx-auto leading-[1.1] tracking-tight">
            Finde Sicherheitslücken,{' '}
            <span className="text-gradient-accent">bevor es andere tun</span>
          </h1>

          <p className="text-lg md:text-xl text-text-secondary mt-6 max-w-2xl mx-auto leading-relaxed">
            TestMe prüft deine Website automatisch auf bekannte Schwachstellen und gibt dir
            verständliche Empfehlungen, wie du sie beheben kannst.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
            <Link href={user ? '/dashboard' : '/auth/register'}>
              <Button size="lg" className="text-base">
                Jetzt kostenlos prüfen
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="#how-it-works">
              <Button variant="outline" size="lg" className="text-base">
                So funktioniert&apos;s
              </Button>
            </Link>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center gap-8 mt-16 text-sm text-text-muted">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              Nicht-destruktiv
            </div>
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-emerald-400" />
              DSGVO-konform
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-400" />
              80+ Sicherheitschecks
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-emerald-400" />
              Detaillierte Berichte
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="relative py-24 overflow-hidden">
        {/* Subtle section separator */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border-default to-transparent" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary">So funktioniert&apos;s</h2>
            <p className="text-text-muted mt-3 max-w-xl mx-auto">
              In drei einfachen Schritten zu deinem Sicherheitsbericht
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connector line (desktop only) */}
            <div className="hidden md:block absolute top-14 left-[20%] right-[20%] h-px bg-gradient-to-r from-accent-500/20 via-accent-400/40 to-accent-500/20" />

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
              <div key={item.step} className="text-center p-6 relative group">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent-500/10 border border-accent-500/20 text-accent-400 mb-5 relative z-10 transition-all duration-300 group-hover:shadow-[0_0_25px_rgba(6,182,212,0.15)] group-hover:bg-accent-500/15">
                  <item.icon className="h-7 w-7" />
                </div>
                <div className="text-xs font-bold text-accent-400 uppercase tracking-wider mb-2">
                  Schritt {item.step}
                </div>
                <h3 className="text-xl font-semibold text-text-primary mb-2">{item.title}</h3>
                <p className="text-text-muted text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative py-24">
        {/* Section separator */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border-default to-transparent" />
        {/* Subtle background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.04)_0%,transparent_70%)] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-surface-200 text-text-muted rounded-full px-4 py-1.5 text-xs font-medium mb-4 uppercase tracking-wider border border-border-subtle">
              Umfassende Analyse
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary">Was wird geprüft?</h2>
            <p className="text-text-muted mt-3 max-w-xl mx-auto">
              Über 80 Sicherheitschecks in 8 Kategorien für einen vollständigen Überblick
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                className="bg-surface-100/60 rounded-2xl border border-border-subtle p-5 hover:border-accent-500/20 hover:bg-surface-100 transition-all duration-300 group hover:shadow-[0_0_30px_rgba(6,182,212,0.05)]"
              >
                <div className="p-2.5 rounded-xl bg-accent-500/8 border border-accent-500/10 w-fit mb-4 group-hover:bg-accent-500/12 group-hover:shadow-[0_0_15px_rgba(6,182,212,0.1)] transition-all duration-300">
                  <feature.icon className="h-5 w-5 text-accent-400" />
                </div>
                <h3 className="font-semibold text-text-primary mb-1.5">{feature.title}</h3>
                <p className="text-xs text-text-muted leading-relaxed">{feature.desc}</p>
                <p className="text-[10px] font-semibold text-accent-400 uppercase tracking-wider mt-3">{feature.count}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Legal Notice */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-amber-500/8 border border-amber-500/15 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
            <div className="flex gap-4">
              <AlertTriangle className="h-6 w-6 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-amber-300 mb-2">
                  Wichtiger rechtlicher Hinweis
                </h3>
                <div className="text-sm text-amber-200/70 space-y-2">
                  <p>
                    TestMe führt ausschließlich <strong className="text-amber-200">nicht-destruktive</strong> Sicherheitstests durch.
                    Es werden keine Daten verändert, gelöscht oder manipuliert.
                  </p>
                  <p>
                    Scans dürfen <strong className="text-amber-200">nur auf eigenen Domains</strong> durchgeführt werden.
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
      <section className="relative py-24 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.12)_0%,transparent_70%)]" />
        </div>
        {/* Top separator */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-accent-500/30 to-transparent" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
            Bereit, deine Website zu prüfen?
          </h2>
          <p className="text-text-muted text-lg mb-10">
            Erstelle jetzt ein kostenloses Konto und starte deinen ersten Sicherheitsscan.
          </p>
          <Link href={user ? '/dashboard' : '/auth/register'}>
            <Button size="lg" className="text-base">
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
