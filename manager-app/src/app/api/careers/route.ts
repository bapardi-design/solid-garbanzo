import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient, currentUser } from '@/lib/supabase/server';
import { limitsFor } from '@/lib/entitlements';

export const runtime = 'nodejs';

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('careers')
    .select('id, name, manager_name, club_id, club_name, seed, season, day, summary, updated_at')
    .order('updated_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ careers: data, plan: user.plan, limits: limitsFor(user.plan) });
}

interface CreateBody {
  name: string;
  managerName: string;
  clubId: string;
  clubName: string;
  seed: string;
  season: number;
  day: number;
  summary: Record<string, unknown>;
  state: unknown;
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = (await request.json()) as Partial<CreateBody>;
  if (!body.state || !body.clubId || !body.seed) return NextResponse.json({ error: 'invalid' }, { status: 400 });
  const limits = limitsFor(user.plan);
  const supabase = await createClient();
  const { count } = await supabase.from('careers').select('id', { count: 'exact', head: true });
  if ((count ?? 0) >= limits.maxCareers) {
    return NextResponse.json({ error: 'career_cap', message: `Your plan allows ${limits.maxCareers} cloud career${limits.maxCareers === 1 ? '' : 's'}.` }, { status: 402 });
  }
  const season = Number(body.season ?? 1);
  if (season > limits.maxSeasons) return NextResponse.json({ error: 'season_cap' }, { status: 402 });
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('careers')
    .insert({
      user_id: user.id,
      name: String(body.name ?? 'Career').slice(0, 80),
      manager_name: String(body.managerName ?? 'Manager').slice(0, 60),
      club_id: body.clubId,
      club_name: String(body.clubName ?? '').slice(0, 80),
      seed: String(body.seed).slice(0, 60),
      season,
      day: Number(body.day ?? 0),
      summary: body.summary ?? {},
      state: body.state,
    })
    .select('id')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
