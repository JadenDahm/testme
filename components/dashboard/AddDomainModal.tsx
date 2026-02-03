'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { normalizeDomain, isValidUrl } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function AddDomainModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [domain, setDomain] = useState('');
  const [verificationMethod, setVerificationMethod] = useState<'dns_txt' | 'html_file'>('dns_txt');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const normalized = normalizeDomain(domain);
    if (!normalized) {
      setError('Bitte geben Sie eine gültige Domain ein');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: normalized,
          verification_method: verificationMethod,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Hinzufügen der Domain');
      }

      router.refresh();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Domain hinzufügen</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="domain" className="block text-sm font-medium text-gray-700 mb-2">
              Domain oder URL
            </label>
            <input
              id="domain"
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="example.com oder https://example.com"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Verifizierungsmethode
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="verification"
                  value="dns_txt"
                  checked={verificationMethod === 'dns_txt'}
                  onChange={() => setVerificationMethod('dns_txt')}
                  className="w-4 h-4 text-blue-600"
                />
                <div>
                  <div className="font-medium">DNS-TXT-Eintrag</div>
                  <div className="text-sm text-gray-600">
                    Fügen Sie einen TXT-Eintrag zu Ihrer DNS-Konfiguration hinzu
                  </div>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="verification"
                  value="html_file"
                  checked={verificationMethod === 'html_file'}
                  onChange={() => setVerificationMethod('html_file')}
                  className="w-4 h-4 text-blue-600"
                />
                <div>
                  <div className="font-medium">HTML-Datei</div>
                  <div className="text-sm text-gray-600">
                    Laden Sie eine HTML-Datei unter /.well-known/ hoch
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Wird hinzugefügt...' : 'Hinzufügen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
