'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function DeleteDomainButton({ domainId }: { domainId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/domains/${domainId}`, { method: 'DELETE' });
      if (response.ok) {
        router.push('/dashboard/domains');
        router.refresh();
      }
    } catch {
      setLoading(false);
    }
  };

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-red-600">Wirklich löschen?</span>
        <Button variant="danger" size="sm" onClick={handleDelete} loading={loading}>
          Ja, löschen
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
          Abbrechen
        </Button>
      </div>
    );
  }

  return (
    <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
      <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-500" />
    </Button>
  );
}
