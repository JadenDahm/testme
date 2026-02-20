import { Resolver } from 'dns/promises';

export async function verifyDnsTxt(domain: string, expectedToken: string): Promise<boolean> {
  const resolver = new Resolver();
  resolver.setServers(['8.8.8.8', '1.1.1.1']);

  try {
    const records = await resolver.resolveTxt(domain);
    for (const record of records) {
      const joined = record.join('');
      if (joined === expectedToken) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}
