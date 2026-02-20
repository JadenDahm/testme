'use client';

import { DeleteScanButton } from './delete-scan-button';

export function DeleteScanWrapper({ scanId }: { scanId: string }) {
  return (
    <div onClick={(e) => e.stopPropagation()}>
      <DeleteScanButton scanId={scanId} />
    </div>
  );
}
