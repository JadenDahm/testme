import Link from 'next/link';
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import type { Domain } from '@/lib/types';

export default function DomainsList({ domains }: { domains: Domain[] }) {
  if (domains.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Noch keine Domains</h3>
        <p className="text-gray-600 mb-6">
          Fügen Sie Ihre erste Domain hinzu, um mit der Sicherheitsprüfung zu beginnen.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {domains.map((domain) => (
        <Link
          key={domain.id}
          href={`/dashboard/domains/${domain.id}`}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-xl font-semibold text-gray-900">{domain.domain}</h3>
                {domain.verified ? (
                  <span className="flex items-center gap-1 text-sm text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    Verifiziert
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-sm text-amber-600">
                    <Clock className="h-4 w-4" />
                    Ausstehend
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">
                Verifizierungsmethode: {domain.verification_method === 'dns_txt' ? 'DNS-TXT' : 'HTML-Datei'}
              </p>
              {domain.verified_at && (
                <p className="text-xs text-gray-500 mt-1">
                  Verifiziert am: {new Date(domain.verified_at).toLocaleDateString('de-DE')}
                </p>
              )}
            </div>
            <div className="text-right">
              {domain.verified ? (
                <span className="inline-block px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium">
                  Bereit für Scans
                </span>
              ) : (
                <span className="inline-block px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-sm font-medium">
                  Verifizierung erforderlich
                </span>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
