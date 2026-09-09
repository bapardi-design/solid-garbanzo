import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient, currentUser } from '@/lib/supabase/server';
import { limitsFor } from '@/lib/entitlements';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const supabase = await createClient();
  const { data, error } = await supabase.from('careers').select('*').eq('id', id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ career: data, plan: user.plan, limits: limitsFor(user.plan) });
}

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = (await request.json()) as { season?: number; day?: number; summary?: Record<string, unknown>; state?: unknown; name?: string };
  if (!body.state) return NextResponse.json({ error: 'invalid' }, { status: 400 });
  const supabase = await createClient();
  const { data: owned } = await supabase.from('careers').select('id').eq('id', id).maybeSingle();
  if (!owned) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const limits = limitsFor(user.plan);
  const season = Number(body.season ?? 1);
  if (season > limits.maxSeasons) {
    return NextResponse.json({ error: 'season_cap', message: `Free careers stop after season ${limits.maxSeasons}. Upgrade to Pro to keep going.` }, { status: 402 });
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from('careers')
    .update({ season, day: Number(body.day ?? 0), summary: body.summary ?? {}, state: body.state, ...(body.name ? { name: String(body.name).slice(0, 80) } : {}) })
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const supabase = await createClient();
  const { error } = await supabase.from('careers').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
