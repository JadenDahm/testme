import { notFound, redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
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

  if (!user) redirect('/auth/login');

  const serviceClient = await createServiceClient();

  const { data: domain } = await serviceClient
    .from('domains')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!domain) notFound();

  const { data: scans } = await serviceClient
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
          className="text-sm text-text-muted hover:text-text-secondary flex items-center gap-1 mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zu Domains
        </Link>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-accent-500/10 border border-accent-500/15 rounded-xl">
              <Globe className="h-6 w-6 text-accent-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">{typedDomain.domain_name}</h1>
              <p className="text-text-muted text-sm">
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
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/15 rounded-xl">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
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
          <h2 className="text-lg font-semibold text-text-primary mb-4">Scan-Verlauf</h2>
          <div className="space-y-3">
            {typedScans.map((scan) => (
              <Link key={scan.id} href={`/dashboard/scans/${scan.id}`}>
                <Card className="hover:border-border-strong hover:bg-surface-200/50 transition-all duration-200 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Search className="h-5 w-5 text-text-faint" />
                      <div>
                        <p className="font-medium text-text-primary text-sm">
                          Scan vom {formatDate(scan.created_at)}
                        </p>
                        <p className="text-xs text-text-muted">{scan.current_step || scan.status}</p>
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
