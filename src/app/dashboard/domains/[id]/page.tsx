import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle, Globe, Search, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { formatDate, scoreColor, scoreLabel } from '@/lib/utils';
import { DomainVerification } from '@/components/domain/domain-verification';
import { StartScanButton } from '@/components/scan/start-scan-button';
import { DeleteDomainButton } from '@/components/domain/delete-domain-button';
import type { Domain, Scan } from '@/types';

export default async function DomainDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: domain } = await supabase
    .from('domains')
    .select('*')
    .eq('id', id)
    .eq('user_id', user!.id)
    .single();

  if (!domain) notFound();

  const { data: scans } = await supabase
    .from('scans')
    .select('*')
    .eq('domain_id', id)
    .order('created_at', { ascending: false })
    .limit(10);

  const typedDomain = domain as Domain;
  const typedScans = (scans || []) as Scan[];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <Link
          href="/dashboard/domains"
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zu Domains
        </Link>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary-50 rounded-xl">
              <Globe className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{typedDomain.domain_name}</h1>
              <p className="text-gray-500 text-sm">
                Hinzugefügt am {formatDate(typedDomain.created_at)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={typedDomain.is_verified ? 'success' : 'warning'} className="text-sm py-1 px-3">
              {typedDomain.is_verified ? 'Verifiziert' : 'Nicht verifiziert'}
            </Badge>
            <DeleteDomainButton domainId={typedDomain.id} />
          </div>
        </div>
      </div>

      {/* Verification Section */}
      {!typedDomain.is_verified && (
        <DomainVerification domain={typedDomain} />
      )}

      {/* Start Scan */}
      {typedDomain.is_verified && (
        <Card>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-green-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-base">Domain ist verifiziert</CardTitle>
                <CardDescription>Du kannst jetzt einen Sicherheitsscan starten.</CardDescription>
              </div>
            </div>
            <StartScanButton domainId={typedDomain.id} domainName={typedDomain.domain_name} />
          </div>
        </Card>
      )}

      {/* Scans History */}
      {typedScans.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Scan-Verlauf</h2>
          <div className="space-y-3">
            {typedScans.map((scan) => (
              <Link key={scan.id} href={`/dashboard/scans/${scan.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Search className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          Scan vom {formatDate(scan.created_at)}
                        </p>
                        <p className="text-xs text-gray-500">{scan.current_step || scan.status}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {scan.score !== null && (
                        <span className={`text-sm font-bold ${scoreColor(scan.score)}`}>
                          {scan.score}/100
                        </span>
                      )}
                      <Badge
                        variant={
                          scan.status === 'completed' ? 'success' :
                          scan.status === 'running' ? 'info' :
                          scan.status === 'failed' ? 'danger' :
                          scan.status === 'cancelled' ? 'warning' : 'default'
                        }
                      >
                        {scan.status === 'completed' ? 'Abgeschlossen' :
                         scan.status === 'running' ? `${scan.progress}%` :
                         scan.status === 'failed' ? 'Fehlgeschlagen' :
                         scan.status === 'cancelled' ? 'Abgebrochen' : 'Ausstehend'}
                      </Badge>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
