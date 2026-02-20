import { createClient } from '@/lib/supabase/server';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Globe } from 'lucide-react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import type { Domain } from '@/types';

export default async function DomainsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: domains } = await supabase
    .from('domains')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Domains</h1>
          <p className="text-gray-500 mt-1">Verwalte deine Domains und starte Scans</p>
        </div>
        <Link href="/dashboard/domains/add">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Domain hinzufügen
          </Button>
        </Link>
      </div>

      {(!domains || domains.length === 0) ? (
        <Card className="text-center py-12">
          <Globe className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">Keine Domains</h3>
          <p className="text-gray-500 mb-4">Füge deine erste Domain hinzu, um sie zu prüfen.</p>
          <Link href="/dashboard/domains/add">
            <Button>Domain hinzufügen</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-4">
          {(domains as Domain[]).map((domain) => (
            <Link key={domain.id} href={`/dashboard/domains/${domain.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-gray-100 rounded-lg">
                      <Globe className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{domain.domain}</CardTitle>
                      <CardDescription>
                        Hinzugefügt am {formatDate(domain.created_at)}
                        {domain.verified_at && ` · Verifiziert am ${formatDate(domain.verified_at)}`}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant={domain.verified ? 'success' : 'warning'}>
                    {domain.verified ? 'Verifiziert' : 'Nicht verifiziert'}
                  </Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
