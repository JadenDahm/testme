'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import AddDomainModal from './AddDomainModal';

export default function AddDomainButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
      >
        <Plus className="h-5 w-5" />
        Domain hinzufügen
      </button>
      {isOpen && <AddDomainModal onClose={() => setIsOpen(false)} />}
    </>
  );
}
