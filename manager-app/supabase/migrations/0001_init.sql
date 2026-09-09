-- Touchline: profiles, careers, entitlements.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  stripe_customer_id text unique,
  stripe_subscription_id text,
  plan_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.careers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  manager_name text not null,
  club_id text not null,
  club_name text not null,
  seed text not null,
  season int not null default 1,
  day int not null default 0,
  summary jsonb not null default '{}'::jsonb,
  state jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists careers_user_id_idx on public.careers (user_id, updated_at desc);

-- Row level security: users read and delete their own rows; writes go through
-- the app's service role so plan limits are enforced server-side.
alter table public.profiles enable row level security;
alter table public.careers enable row level security;

drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "careers: read own" on public.careers;
create policy "careers: read own" on public.careers
  for select using (auth.uid() = user_id);

drop policy if exists "careers: delete own" on public.careers;
create policy "careers: delete own" on public.careers
  for delete using (auth.uid() = user_id);

-- Create a profile row for every new auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep updated_at fresh.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists careers_touch on public.careers;
create trigger careers_touch before update on public.careers
  for each row execute function public.touch_updated_at();

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
