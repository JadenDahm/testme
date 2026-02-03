import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ScanDetailsClient from './client'

export default async function ScanDetailsPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <ScanDetailsClient scanId={params.id} userId={user.id} />
}
