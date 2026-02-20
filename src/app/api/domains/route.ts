import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { normalizeDomain, isValidDomain, generateVerificationToken } from '@/lib/utils';
import { z } from 'zod';

const addDomainSchema = z.object({
  domain: z.string().min(1, 'Domain darf nicht leer sein'),
});

// GET: List all domains for the current user
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('domains')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// POST: Add a new domain
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = addDomainSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Ungültige Eingabe' }, { status: 400 });
  }

  const domain = normalizeDomain(parsed.data.domain);

  if (!isValidDomain(domain)) {
    return NextResponse.json({ error: 'Ungültiges Domain-Format' }, { status: 400 });
  }

  // Check if domain already exists for this user
  const { data: existing } = await supabase
    .from('domains')
    .select('id')
    .eq('user_id', user.id)
    .eq('domain_name', domain)
    .single();

  if (existing) {
    return NextResponse.json({ error: 'Domain bereits hinzugefügt' }, { status: 409 });
  }

  const verificationToken = generateVerificationToken();

  const { data, error } = await supabase
    .from('domains')
    .insert({
      user_id: user.id,
      domain_name: domain,
      verification_token: verificationToken,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
