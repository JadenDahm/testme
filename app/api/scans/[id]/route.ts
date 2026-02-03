import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { data: scan, error: scanError } = await supabase
      .from('scans')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (scanError || !scan) {
      return NextResponse.json(
        { error: 'Scan nicht gefunden' },
        { status: 404 }
      );
    }

    // Lade Vulnerabilities
    const { data: vulnerabilities } = await supabase
      .from('vulnerabilities')
      .select('*')
      .eq('scan_id', scan.id)
      .order('created_at', { ascending: false });

    // Berechne Summary
    const summary = {
      total: vulnerabilities?.length || 0,
      critical: vulnerabilities?.filter((v) => v.severity === 'critical').length || 0,
      high: vulnerabilities?.filter((v) => v.severity === 'high').length || 0,
      medium: vulnerabilities?.filter((v) => v.severity === 'medium').length || 0,
      low: vulnerabilities?.filter((v) => v.severity === 'low').length || 0,
      info: vulnerabilities?.filter((v) => v.severity === 'info').length || 0,
      security_score: 0,
    };

    // Berechne Security Score (0-100, höher ist besser)
    const maxScore = 100;
    const criticalPenalty = summary.critical * 20;
    const highPenalty = summary.high * 10;
    const mediumPenalty = summary.medium * 5;
    const lowPenalty = summary.low * 2;
    summary.security_score = Math.max(
      0,
      maxScore - criticalPenalty - highPenalty - mediumPenalty - lowPenalty
    );

    return NextResponse.json({
      scan,
      vulnerabilities: vulnerabilities || [],
      summary,
    });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error.message || 'Ein Fehler ist aufgetreten' },
      { status: 500 }
    );
  }
}
