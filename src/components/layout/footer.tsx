import { Shield } from 'lucide-react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-border-subtle mt-auto bg-surface-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2.5">
            <Shield className="h-5 w-5 text-accent-500" />
            <span className="text-sm font-semibold text-text-primary">
              Test<span className="text-gradient-accent">Me</span> Security
            </span>
          </div>
          <div className="flex gap-8 text-sm text-text-muted">
            <Link href="/legal/privacy" className="hover:text-accent-400 transition-colors duration-200">
              Datenschutz
            </Link>
            <Link href="/legal/terms" className="hover:text-accent-400 transition-colors duration-200">
              Nutzungsbedingungen
            </Link>
            <Link href="/legal/imprint" className="hover:text-accent-400 transition-colors duration-200">
              Impressum
            </Link>
          </div>
          <p className="text-xs text-text-faint">
            &copy; {new Date().getFullYear()} TestMe Security. Alle Rechte vorbehalten.
          </p>
        </div>
      </div>
    </footer>
  );
}
