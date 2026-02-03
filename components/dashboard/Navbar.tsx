'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function Navbar() {
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link href="/dashboard" className="text-xl font-bold text-primary-700">
            Security Scanner
          </Link>
          <div className="flex items-center space-x-6">
            <Link
              href="/dashboard/domains"
              className="text-gray-700 hover:text-primary-700 font-medium"
            >
              Domains
            </Link>
            <Link
              href="/dashboard/scans"
              className="text-gray-700 hover:text-primary-700 font-medium"
            >
              Scans
            </Link>
            <button
              onClick={handleLogout}
              className="text-gray-700 hover:text-primary-700 font-medium"
            >
              Abmelden
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
