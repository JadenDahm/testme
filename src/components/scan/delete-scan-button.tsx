'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function DeleteScanButton({ scanId }: { scanId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/scans/${scanId}`, { method: 'DELETE' });
      if (response.ok) {
        router.push('/dashboard/scans');
        router.refresh();
      } else {
        const data = await response.json();
        alert(data.error || 'Fehler beim Löschen des Scans');
        setLoading(false);
      }
    } catch (error) {
      alert('Fehler beim Löschen des Scans');
      setLoading(false);
    }
  };

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-rose-400">Wirklich löschen?</span>
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
      <Trash2 className="h-4 w-4 text-text-faint hover:text-rose-400 transition-colors" />
    </Button>
  );
}
