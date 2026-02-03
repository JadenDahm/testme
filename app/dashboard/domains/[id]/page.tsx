import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DomainDetails from '@/components/dashboard/DomainDetails';

export default async function DomainPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const { data: domain } = await supabase
    .from('domains')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (!domain) {
    redirect('/dashboard');
  }

  const { data: scans } = await supabase
    .from('scans')
    .select('*')
    .eq('domain_id', domain.id)
    .order('created_at', { ascending: false })
    .limit(10);

  return <DomainDetails domain={domain} scans={scans || []} />;
}
