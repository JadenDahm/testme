import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Enriches scan records with domain_name by doing a separate domain lookup.
 * This avoids the PostgREST relationship join `domains(domain_name)` which
 * can fail if the schema cache doesn't recognize the foreign key.
 */
export async function enrichScansWithDomain(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: SupabaseClient<any, any, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  scans: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> {
  if (!scans || scans.length === 0) return scans;

  // Get unique domain IDs
  const domainIds = [...new Set(scans.map((s) => s.domain_id).filter(Boolean))];

  if (domainIds.length === 0) return scans;

  const { data: domains } = await client
    .from('domains')
    .select('id, domain_name')
    .in('id', domainIds);

  const domainMap = new Map(
    (domains || []).map((d: { id: string; domain_name: string }) => [d.id, d.domain_name])
  );

  return scans.map((scan) => ({
    ...scan,
    domains: { domain_name: domainMap.get(scan.domain_id) || 'Unbekannt' },
  }));
}

/**
 * Enriches a single scan record with domain_name.
 */
export async function enrichScanWithDomain(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: SupabaseClient<any, any, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  scan: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  if (!scan || !scan.domain_id) return scan;

  const { data: domain } = await client
    .from('domains')
    .select('domain_name')
    .eq('id', scan.domain_id)
    .single();

  return {
    ...scan,
    domains: { domain_name: domain?.domain_name || 'Unbekannt' },
  };
}
