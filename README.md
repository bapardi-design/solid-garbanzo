# Signature Social Autopilot

**Brand in, posts out.** You put in the brand, the voice, the strategy, the content plan and the design templates. The AI writes the captions and renders the designs, drops everything on a review board, you give feedback or click *Ready to post*, and the scheduler posts to Instagram, TikTok, LinkedIn and more.

```
brand kit  ──▶  generate  ──▶  review board  ──▶  publish  ──▶  Instagram / TikTok / LinkedIn …
(you)           (Claude +      (Notion or        (every 30 min,
                 headless       markdown:         only "Ready to post"
                 Chrome)        feedback loop)     and due)
```

Built to be sold: one repo per client, a brand kit per client, the same workflow for all of them. The training course for buyers is in [`docs/training`](docs/training/00-overview.md).

## What it produces

Run `npm run autopilot -- preview` to render every template with placeholder copy; the PNGs land in `out/preview/`. Colours, fonts and wordmark come from `brand.yaml`; the words come from Claude.

## What's in the box

| Part | What it does |
|---|---|
| `brand/brand.yaml` | The brand kit: voice, audience, pillars, offers/CTAs, colours, fonts, channel rules, banned words |
| `brand/strategy.md` | The strategy the AI reads before writing anything |
| `brand/content-plan.yaml` | Which post goes out when, on which channel, about what (4 weeks included) |
| `brand/templates/*.html` | Design templates rendered to 1080px PNGs (carousel, statement, story) |
| `autopilot generate` | Claude writes a caption per channel + design copy, Chrome renders the images, the post lands on the board |
| Review board | **Notion** database or **markdown files** in `board/`. Statuses: In review → Needs changes → Ready to post → Posted |
| `autopilot revise` | Takes every card in *Needs changes*, applies your feedback, puts a new version back in review |
| `autopilot publish` | Posts every *Ready to post* card whose time has come, via **Ayrshare** (Instagram, TikTok, LinkedIn, Facebook, Pinterest, Threads, X, YouTube) |
| GitHub Actions | Generate weekly, revise hourly, publish every 30 minutes. No server needed |

## Quick start (10 minutes, no accounts needed)

```bash
npm install
npx playwright install chromium       # headless browser for rendering designs
cp .env.example .env                  # defaults: local board, local storage, dry-run publisher
npm run autopilot -- check            # validates brand kit + plan
npm run autopilot -- generate --offline --week 1   # placeholder copy, real renders
```

Open `board/w1-p1.md`, look at the images in `out/renders/w1-p1/v1/`, change `status: In review` to `status: Ready to post`, then:

```bash
npm run autopilot -- publish --all    # dry-run: prints what would be posted
npm run autopilot -- status
```

Now add your `ANTHROPIC_API_KEY` to `.env` and run `generate` without `--offline` for real copy.

## The real setup (per client)

1. **Brand kit** – fill in `brand/brand.yaml`, `brand/strategy.md`, `brand/content-plan.yaml`. See [Module 2](docs/training/02-brand-kit.md).
2. **Review board** – `BOARD=notion`, then `npm run autopilot -- notion:setup` creates the database. See [Module 3](docs/training/03-review-workflow.md).
3. **Image hosting** – `STORAGE=github` (public repo, zero setup) or `STORAGE=cloudinary`. Publishers need public image URLs.
4. **Publishing** – `PUBLISHER=ayrshare`, connect the client's social accounts in Ayrshare once.
5. **Automation** – put the same values into GitHub *Secrets* and *Variables*; the workflows in `.github/workflows` do the rest. See [Module 5](docs/training/05-operations.md).

## Commands

| Command | Purpose |
|---|---|
| `autopilot check` | Validate brand kit, templates, content plan and environment |
| `autopilot preview [-t name]` | Render every template with placeholder copy (no API key) |
| `autopilot generate [--week n] [--id a b] [--force] [--offline]` | Write + render + put on the board |
| `autopilot revise` | Apply feedback on every *Needs changes* card |
| `autopilot publish [--all] [--id a b]` | Post *Ready to post* cards that are due (`--all` ignores the schedule) |
| `autopilot status` | Table of every card on the board |
| `autopilot notion:setup` | Create the Notion review database |

Run them as `npm run autopilot -- <command>` or, after `npm link`, as `autopilot <command>`.

## How a post flows

1. `generate` reads the plan entry, sends the brand kit + strategy + brief to Claude and gets back structured copy: hook, one caption per channel, hashtags, alt text, design copy (headline, subheadline, slides, CTA) and a note for the reviewer.
2. The design copy is poured into the HTML template and screenshotted at 1080×1350 (or 1080×1920 for stories). Carousels get a cover, one slide per point and a closing CTA slide.
3. Images are uploaded (GitHub raw / Cloudinary) and the post record is saved to `out/posts/<id>.json` (the source of truth).
4. A card appears on the board with status **In review**, the caption, the images and the AI's note.
5. You either set **Ready to post**, or set **Needs changes** and write feedback. `revise` turns feedback into version 2.
6. Every 30 minutes `publish` posts due cards and writes the post URLs back on the card. Failures land in **Failed** with the error text.

Reviewer edits win: if you change the caption on the card, that caption is used for every channel. Move the date, drop a channel: also respected.

## Project layout

```
brand/            the client-facing input (brand kit, strategy, plan, templates)
src/              the pipeline (ai/, render/, board/, storage/, publish/, commands/)
board/            markdown review cards when BOARD=local
out/posts/        one JSON per post: what was generated, versions, renders
out/renders/      the PNGs, per post and version
docs/training/    the course that ships with the product
tests/            vitest suite (no network needed)
```

## Development

```bash
npm run typecheck
npm test
```

Rendering needs Chromium. Either `npx playwright install chromium` or point `AUTOPILOT_CHROMIUM` at an existing Chrome binary.

## Also in this repository

- [`sim-engine/`](sim-engine/README.md): a deterministic, event-sourced football club management simulation engine with its own package, tests, and CI workflow.
- [`manager-app/`](manager-app/README.md): Touchline, the hosted football manager game built on the engine (Next.js, Supabase, Stripe, Vercel).
