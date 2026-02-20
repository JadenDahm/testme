import { Shield } from 'lucide-react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary-600" />
            <span className="text-sm font-semibold text-gray-900">
              Test<span className="text-primary-600">Me</span> Security
            </span>
          </div>
          <div className="flex gap-6 text-sm text-gray-500">
            <Link href="/legal/privacy" className="hover:text-gray-900">
              Datenschutz
            </Link>
            <Link href="/legal/terms" className="hover:text-gray-900">
              Nutzungsbedingungen
            </Link>
            <Link href="/legal/imprint" className="hover:text-gray-900">
              Impressum
            </Link>
          </div>
          <p className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} TestMe Security. Alle Rechte vorbehalten.
          </p>
        </div>
      </div>
    </footer>
  );
}
