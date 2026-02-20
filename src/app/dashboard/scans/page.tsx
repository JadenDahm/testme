import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';
import Link from 'next/link';
import { formatDate, scoreColor, scoreLabel } from '@/lib/utils';
import type { Scan } from '@/types';

export default async function ScansPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: scans } = await supabase
    .from('scans')
    .select('*, domains(domain_name)')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Scans</h1>
        <p className="text-gray-500 mt-1">Übersicht aller durchgeführten Sicherheitsscans</p>
      </div>

      {(!scans || scans.length === 0) ? (
        <Card className="text-center py-12">
          <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">Keine Scans</h3>
          <p className="text-gray-500">
            Füge eine Domain hinzu und starte deinen ersten Scan.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {(scans as Scan[]).map((scan) => (
            <Link key={scan.id} href={`/dashboard/scans/${scan.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-gray-100 rounded-lg">
                      <Search className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {scan.domains?.domain_name || 'Unbekannt'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDate(scan.created_at)}
                        {scan.current_step && scan.status === 'running' && (
                          <span className="ml-2 text-primary-600">· {scan.current_step}</span>
                        )}
                      </p>
                    </div>
                  </div>
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
                        <div className="bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary-500 rounded-full h-2 transition-all duration-500"
                            style={{ width: `${scan.progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 text-center mt-1">{scan.progress}%</p>
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
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
