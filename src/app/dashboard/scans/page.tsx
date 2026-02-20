import { createClient, createServiceClient } from '@/lib/supabase/server';
import { enrichScansWithDomain } from '@/lib/supabase/helpers';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

  const { data: rawScans } = await serviceClient
    .from('scans')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const scans = await enrichScansWithDomain(serviceClient, rawScans || []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-medium text-text-primary">Scans</h1>
        <p className="text-text-muted mt-1">Übersicht aller durchgeführten Sicherheitsscans</p>
      </div>

      {(!scans || scans.length === 0) ? (
        <Card className="text-center py-12">
          <h3 className="text-lg font-medium text-text-primary mb-2">Keine Scans</h3>
          <p className="text-text-secondary">
            Füge eine Domain hinzu und starte deinen ersten Scan.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {(scans as Scan[]).map((scan) => (
            <Card key={scan.id} className="hover:border-border-default transition-colors duration-200">
              <div className="flex items-center justify-between">
                <Link href={`/dashboard/scans/${scan.id}`} className="flex-1 cursor-pointer">
                  <div>
                    <p className="font-medium text-text-primary">
                      {scan.domains?.domain_name || 'Unbekannt'}
                    </p>
                    <p className="text-sm text-text-secondary mt-1">
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
                      <p className={`text-xl font-medium ${scoreColor(scan.score)}`}>
                        {scan.score}
                      </p>
                      <p className={`text-xs text-text-secondary ${scoreColor(scan.score)}`}>
                        {scoreLabel(scan.score)}
                      </p>
                    </div>
                  )}
                  {scan.status === 'running' && (
                    <div className="w-24">
                      <div className="bg-surface-200 rounded h-2 overflow-hidden">
                        <div
                          className="bg-accent-500 rounded h-2 transition-all duration-500"
                          style={{ width: `${scan.progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-text-secondary text-center mt-1">{scan.progress}%</p>
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
