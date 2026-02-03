import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import StartScanForm from '@/components/scans/StartScanForm'

export default async function NewScanPage() {
  const { user, supabase } = await requireAuth()

  const { data: domains } = await supabase
    .from('domains')
    .select('id, domain, is_verified')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Neuen Scan starten</h1>
      <div className="bg-white p-6 rounded-lg shadow">
        <StartScanForm domains={domains || []} />
      </div>
    </div>
  )
}
