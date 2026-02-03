import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DomainsList from '@/components/dashboard/DomainsList';
import AddDomainButton from '@/components/dashboard/AddDomainButton';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const { data: domains } = await supabase
    .from('domains')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Verwalten Sie Ihre Domains und Scans</p>
        </div>
        <AddDomainButton />
      </div>
      <DomainsList domains={domains || []} />
    </div>
  );
}
