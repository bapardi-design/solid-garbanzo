# Touchline

A hosted football manager game built on the `sim-engine` package: take over a
club, set tactics, work the transfer market, renew contracts, and survive the
board. The engine runs in the browser; accounts, cloud saves and subscriptions
run on Supabase and Stripe; the app deploys to Vercel.

## Plans

| | Free | Pro |
| --- | --- | --- |
| Seasons per career | 2 | unlimited |
| Saves | this device (IndexedDB), 1 cloud career when signed in | up to 50 cloud careers |
| Season reports | no | yes |

Limits live in `src/lib/entitlements.ts` and are enforced by the API routes
(`/api/careers`) as well as in the UI. Playing without an account works fully
with local saves.

## Local development

```bash
# 1. Build the engine once (the app depends on ../sim-engine via file:)
npm --prefix ../sim-engine ci && npm --prefix ../sim-engine run build

# 2. Install and run the app
npm ci
cp .env.example .env.local   # fill in Supabase and Stripe values, or leave empty for local-only play
npm run dev
```

Without Supabase variables the app runs in local-only mode: no sign-in, no
cloud saves, no payments, but the whole game is playable.

## Supabase

1. Create a project and run `supabase/migrations/0001_init.sql` in the SQL
   editor (or `supabase db push`). It creates `profiles` and `careers` with row
   level security, and a trigger that creates a profile for each new auth user.
2. Authentication -> Providers: enable Email (magic link). Set the Site URL to
   your deployment and add `https://<your-domain>/auth/callback` to the
   redirect allow list.
3. Copy the project URL, anon key and service role key into the environment.

## Stripe

1. Create a product "Touchline Pro" with a recurring monthly price; put the
   price id in `STRIPE_PRICE_ID_PRO`.
2. Add a webhook endpoint `https://<your-domain>/api/stripe/webhook` for
   `checkout.session.completed`, `customer.subscription.created`,
   `customer.subscription.updated`, `customer.subscription.deleted`; put the
   signing secret in `STRIPE_WEBHOOK_SECRET`.
3. Enable the customer portal in Stripe settings so "Manage subscription" works.

## Vercel

Import the repository, set **Root Directory** to `manager-app`, keep the
default build command (`npm run build`, which builds the engine first), and
add the environment variables from `.env.example`. Set
`NEXT_PUBLIC_APP_URL` to the deployed origin.

## Layout

| Path | What it does |
| --- | --- |
| `src/app/page.tsx`, `pricing/`, `login/`, `account/` | Marketing, plans, magic-link sign-in, subscription management |
| `src/app/play/` | Career list, new career (choose club), and the game itself |
| `src/app/api/careers/` | Cloud saves with plan limits enforced server-side |
| `src/app/api/stripe/` | Checkout, customer portal, webhook |
| `src/game/Game.tsx`, `panels.tsx` | The game shell and its tabs (overview, squad, transfers, tactics, fixtures, table, finances) |
| `src/game/store.ts` | Local (IndexedDB) and cloud persistence |
| `src/lib/` | Supabase clients, Stripe client, entitlements |
| `supabase/migrations/` | Database schema |
