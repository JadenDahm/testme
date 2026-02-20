import { createClient, createServiceClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { formatDate, scoreColor, scoreLabel } from '@/lib/utils';
import { DeleteScanWrapper } from '@/components/scan/delete-scan-wrapper';
import type { Scan } from '@/types';

export default async function ScansPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const serviceClient = await createServiceClient();

  const { data: scans } = await serviceClient
    .from('scans')
    .select('*, domains(domain_name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Scans</h1>
        <p className="text-text-muted mt-1">Übersicht aller durchgeführten Sicherheitsscans</p>
      </div>

      {(!scans || scans.length === 0) ? (
        <Card className="text-center py-12">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-surface-200 border border-border-subtle mx-auto mb-4">
            <Search className="h-7 w-7 text-text-faint" />
          </div>
          <h3 className="text-lg font-medium text-text-primary mb-1">Keine Scans</h3>
          <p className="text-text-muted">
            Füge eine Domain hinzu und starte deinen ersten Scan.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {(scans as Scan[]).map((scan) => (
            <Card key={scan.id} className="hover:border-border-strong hover:bg-surface-200/50 transition-all duration-200">
              <div className="flex items-center justify-between">
                <Link href={`/dashboard/scans/${scan.id}`} className="flex-1 flex items-center gap-4 cursor-pointer">
                  <div className="p-2.5 bg-surface-200 border border-border-subtle rounded-xl">
                    <Search className="h-5 w-5 text-text-muted" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-text-primary">
                      {scan.domains?.domain_name || 'Unbekannt'}
                    </p>
                    <p className="text-sm text-text-muted">
                      {formatDate(scan.created_at)}
                      {scan.current_step && scan.status === 'running' && (
                        <span className="ml-2 text-accent-400">· {scan.current_step}</span>
                      )}
                    </p>
                  </div>
                </Link>
                <div className="flex items-center gap-4">
                  {scan.score !== null && (
                    <div className="text-right">
                      <p className={`text-xl font-bold ${scoreColor(scan.score)}`}>
                        {scan.score}
                      </p>
                      <p className={`text-xs ${scoreColor(scan.score)}`}>
                        {scoreLabel(scan.score)}
                      </p>
                    </div>
                  )}
                  {scan.status === 'running' && (
                    <div className="w-24">
                      <div className="bg-surface-300 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-accent-500 rounded-full h-2 transition-all duration-500 shadow-[0_0_8px_rgba(6,182,212,0.3)]"
                          style={{ width: `${scan.progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-text-muted text-center mt-1">{scan.progress}%</p>
                    </div>
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
                  {(scan.status === 'completed' || scan.status === 'failed' || scan.status === 'cancelled') && (
                    <DeleteScanWrapper scanId={scan.id} />
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
