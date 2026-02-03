import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import AddDomainForm from '@/components/domains/AddDomainForm'
import DomainList from '@/components/domains/DomainList'

export default async function DomainsPage() {
  const { user, supabase } = await requireAuth()

  const { data: domains } = await supabase
    .from('domains')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Domains</h1>
      </div>

      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-xl font-semibold mb-4">Neue Domain hinzufügen</h2>
        <AddDomainForm />
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Ihre Domains</h2>
        <DomainList domains={domains || []} />
      </div>
    </div>
  )
}
