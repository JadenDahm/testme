'use client';

import { DeleteDomainButton } from './delete-domain-button';

export function DeleteDomainWrapper({ domainId }: { domainId: string }) {
  return (
    <div onClick={(e) => e.stopPropagation()}>
      <DeleteDomainButton domainId={domainId} />
    </div>
  );
}
