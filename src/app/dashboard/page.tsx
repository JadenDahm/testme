import { createClient } from '@/lib/supabase/server';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Globe, Search, Shield, ArrowRight, Plus } from 'lucide-react';
import Link from 'next/link';
import { formatDate, scoreColor, scoreLabel } from '@/lib/utils';
import type { Domain, Scan } from '@/types';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: domains } = await supabase
    .from('domains')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(5);

  const { data: scans } = await supabase
    .from('scans')
    .select('*, domains(domain_name)')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(5);

  const totalDomains = (domains as Domain[] | null)?.length ?? 0;
  const verifiedDomains = (domains as Domain[] | null)?.filter((d) => d.is_verified).length ?? 0;
  const totalScans = (scans as Scan[] | null)?.length ?? 0;

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Willkommen zurück! Hier ist deine Übersicht.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary-50 rounded-xl">
              <Globe className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalDomains}</p>
              <p className="text-sm text-gray-500">Domains</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-50 rounded-xl">
              <Shield className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{verifiedDomains}</p>
              <p className="text-sm text-gray-500">Verifiziert</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-xl">
              <Search className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalScans}</p>
              <p className="text-sm text-gray-500">Scans</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      {totalDomains === 0 && (
        <Card className="bg-primary-50 border-primary-200">
          <div className="text-center py-4">
            <Shield className="h-12 w-12 text-primary-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Los geht&apos;s!</h3>
            <p className="text-gray-600 mb-4">
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
            <h2 className="text-lg font-semibold text-gray-900">Letzte Scans</h2>
            <Link href="/dashboard/scans" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
              Alle anzeigen <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {(scans as Scan[]).map((scan) => (
              <Link key={scan.id} href={`/dashboard/scans/${scan.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium text-gray-900">
                          {scan.domains?.domain_name || 'Unbekannt'}
                        </p>
                        <p className="text-sm text-gray-500">{formatDate(scan.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {scan.score !== null && (
                        <span className={`text-lg font-bold ${scoreColor(scan.score)}`}>
                          {scan.score}/100
                          <span className="text-xs font-normal ml-1">{scoreLabel(scan.score)}</span>
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
            <h2 className="text-lg font-semibold text-gray-900">Deine Domains</h2>
            <Link href="/dashboard/domains" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
              Alle anzeigen <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {(domains as Domain[]).map((domain) => (
              <Link key={domain.id} href={`/dashboard/domains/${domain.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
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
