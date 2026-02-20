import { createClient, createServiceClient } from '@/lib/supabase/server';
import { enrichScansWithDomain } from '@/lib/supabase/helpers';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, Plus } from 'lucide-react';
import Link from 'next/link';
import { formatDate, scoreColor, scoreLabel } from '@/lib/utils';
import { redirect } from 'next/navigation';
import type { Domain, Scan } from '@/types';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const serviceClient = await createServiceClient();

  const { data: domains } = await serviceClient
    .from('domains')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5);

  const { data: rawScans } = await serviceClient
    .from('scans')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5);

  const scans = await enrichScansWithDomain(serviceClient, rawScans || []);

  const totalDomains = (domains as Domain[] | null)?.length ?? 0;
  const verifiedDomains = (domains as Domain[] | null)?.filter((d) => d.is_verified).length ?? 0;
  const totalScans = (scans as Scan[] | null)?.length ?? 0;

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-medium text-text-primary">Dashboard</h1>
        <p className="text-text-muted mt-1">Willkommen zurück! Hier ist deine Übersicht.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <div>
            <p className="text-3xl font-medium text-text-primary">{totalDomains}</p>
            <p className="text-sm text-text-secondary mt-1">Domains</p>
          </div>
        </Card>
        <Card>
          <div>
            <p className="text-3xl font-bold text-text-primary">{verifiedDomains}</p>
            <p className="text-sm text-text-secondary mt-1">Verifiziert</p>
          </div>
        </Card>
        <Card>
          <div>
            <p className="text-3xl font-bold text-text-primary">{totalScans}</p>
            <p className="text-sm text-text-secondary mt-1">Scans</p>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      {totalDomains === 0 && (
        <Card>
          <div className="text-center py-8">
            <h3 className="text-lg font-medium text-text-primary mb-2">Los geht&apos;s!</h3>
            <p className="text-text-secondary mb-6">
              Füge deine erste Domain hinzu und starte deinen ersten Sicherheitsscan.
            </p>
            <Link href="/dashboard/domains/add">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Domain hinzufügen
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Recent Scans */}
      {scans && scans.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-text-primary">Letzte Scans</h2>
            <Link href="/dashboard/scans" className="text-sm text-accent-400 hover:text-accent-300 flex items-center gap-1 transition-colors">
              Alle anzeigen <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {(scans as Scan[]).map((scan) => (
              <Link key={scan.id} href={`/dashboard/scans/${scan.id}`}>
                <Card className="hover:border-border-strong hover:bg-surface-200/50 transition-all duration-200 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium text-text-primary">
                          {scan.domains?.domain_name || 'Unbekannt'}
                        </p>
                        <p className="text-sm text-text-muted">{formatDate(scan.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {scan.score !== null && (
                        <span className={`text-lg font-medium ${scoreColor(scan.score)}`}>
                          {scan.score}/100
                          <span className="text-xs font-normal ml-1.5 text-text-muted">{scoreLabel(scan.score)}</span>
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
                         scan.status === 'running' ? 'Läuft' :
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

      {/* Recent Domains */}
      {domains && domains.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-text-primary">Deine Domains</h2>
            <Link href="/dashboard/domains" className="text-sm text-accent-400 hover:text-accent-300 flex items-center gap-1 transition-colors">
              Alle anzeigen <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {(domains as Domain[]).map((domain) => (
              <Link key={domain.id} href={`/dashboard/domains/${domain.id}`}>
                <Card className="hover:border-border-strong hover:bg-surface-200/50 transition-all duration-200 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{domain.domain_name}</CardTitle>
                      <CardDescription>{formatDate(domain.created_at)}</CardDescription>
                    </div>
                    <Badge variant={domain.is_verified ? 'success' : 'warning'}>
                      {domain.is_verified ? 'Verifiziert' : 'Nicht verifiziert'}
                    </Badge>
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
