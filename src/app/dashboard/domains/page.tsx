import { createClient, createServiceClient } from '@/lib/supabase/server';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { formatDate } from '@/lib/utils';
import { DeleteDomainWrapper } from '@/components/domain/delete-domain-wrapper';
import type { Domain } from '@/types';

export default async function DomainsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const serviceClient = await createServiceClient();

  const { data: domains } = await serviceClient
    .from('domains')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Domains</h1>
          <p className="text-text-muted mt-1">Verwalte deine Domains und starte Scans</p>
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
          <h3 className="text-lg font-medium text-text-primary mb-2">Keine Domains</h3>
          <p className="text-text-secondary mb-6">Füge deine erste Domain hinzu, um sie zu prüfen.</p>
          <Link href="/dashboard/domains/add">
            <Button>Domain hinzufügen</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-3">
          {(domains as Domain[]).map((domain) => (
            <Card key={domain.id} className="hover:border-border-default transition-colors duration-200">
              <div className="flex items-center justify-between">
                <Link href={`/dashboard/domains/${domain.id}`} className="flex-1 cursor-pointer">
                  <div>
                    <CardTitle className="text-base">{domain.domain_name}</CardTitle>
                    <CardDescription>
                      Hinzugefügt am {formatDate(domain.created_at)}
                      {domain.last_verified_at && ` · Verifiziert am ${formatDate(domain.last_verified_at)}`}
                    </CardDescription>
                  </div>
                </Link>
                <div className="flex items-center gap-3">
                  <Badge variant={domain.is_verified ? 'success' : 'warning'}>
                    {domain.is_verified ? 'Verifiziert' : 'Nicht verifiziert'}
                  </Badge>
                  <DeleteDomainWrapper domainId={domain.id} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
