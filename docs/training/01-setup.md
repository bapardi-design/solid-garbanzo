# Module 1 · Setup

*Time: 45 minutes for the first brand, 15 for every next one.*

## 1. Get the code

Create a private copy of this repository for the client (GitHub → *Use this template* or fork), clone it, then:

```bash
npm install
npx playwright install chromium
cp .env.example .env
```

Run `npm run autopilot -- check`. It validates the example brand kit and prints which board, storage and publisher are configured. Everything starts in safe mode: local board, local images, dry-run publisher. Nothing leaves your machine until you change `.env`.

## 2. Anthropic API key (the writing)

1. Go to console.anthropic.com → API keys → create key.
2. Put it in `.env` as `ANTHROPIC_API_KEY`.
3. Test: `npm run autopilot -- generate --id w1-p1`. Read the caption in `board/w1-p1.md`. This is the moment you see whether the brand kit is good enough (Module 2).

The default model is `claude-opus-5`. Override with `AUTOPILOT_MODEL` if you want a cheaper model for drafts.

## 3. Notion review board (recommended)

1. notion.so/my-integrations → *New integration* → internal → copy the secret into `.env` as `NOTION_TOKEN`.
2. Create a Notion page called e.g. "Content Autopilot". Open the page menu (···) → *Connections* → add your integration.
3. Copy the page id from the URL (the 32 hex characters at the end) into `.env` as `NOTION_PARENT_PAGE_ID`.
4. Run `npm run autopilot -- notion:setup`. It creates the database with all properties and prints `NOTION_DATA_SOURCE_ID=…`. Put that in `.env` and set `BOARD=notion`.

Board properties that matter for reviewing: **Status**, **Feedback**, **Caption**, **Scheduled**, **Channels**. Everything else is filled by the pipeline. Add a *Board* view grouped by Status and a *Calendar* view on Scheduled; that's the client's whole interface.

If the client doesn't use Notion, keep `BOARD=local`: the cards are markdown files in `board/`, editable in any editor or straight on GitHub.

## 4. Image hosting

Publishers fetch images from a public URL. Two options:

- **`STORAGE=github`** — zero setup if the repo is public. The workflows commit `out/renders` and the raw GitHub URL is used. Set `GITHUB_REPOSITORY=owner/repo` locally (Actions sets it automatically).
- **`STORAGE=cloudinary`** — for private repos. Free Cloudinary account → dashboard → cloud name, API key, API secret into `.env`.

`STORAGE=local` is fine as long as `PUBLISHER=dryrun`.

## 5. Ayrshare (the posting)

1. Sign up at ayrshare.com, connect the client's Instagram (Business/Creator account linked to a Facebook page), TikTok, LinkedIn.
2. Dashboard → API Key → `.env` as `AYRSHARE_API_KEY`, set `PUBLISHER=ayrshare`.
3. Agencies: on the Business plan each client is a *profile*; put the client's profile key in `AYRSHARE_PROFILE_KEY`.

Test with one card: set it to *Ready to post* and run `npm run autopilot -- publish --all --id w1-p1`. Check the post, then delete it from the platform if it was a test.

## 6. Turn on the automation

In the GitHub repo → Settings → Secrets and variables → Actions:

**Secrets:** `ANTHROPIC_API_KEY`, `NOTION_TOKEN`, `NOTION_DATA_SOURCE_ID`, `AYRSHARE_API_KEY`, (`AYRSHARE_PROFILE_KEY`, `CLOUDINARY_*` if used).

**Variables:** `BOARD=notion`, `STORAGE=github` or `cloudinary`, `PUBLISHER=ayrshare`, `AUTOPILOT_TZ=Europe/Berlin`, optionally `AUTOPILOT_MODEL`.

Three workflows are now live (Actions tab):

| Workflow | When | What |
|---|---|---|
| Generate posts | Mondays 06:00 UTC + manual | Everything in the plan that doesn't exist yet |
| Revise posts | Every hour | Applies feedback on *Needs changes* cards |
| Publish due posts | Every 30 minutes | Posts *Ready to post* cards whose time has come |

Run *Generate posts* manually once (Actions → Generate posts → Run workflow, week = 1) and watch the board fill up.

## Checklist before handing over to a client

- [ ] `autopilot check` passes
- [ ] One real post generated, reviewed, revised once, and published to a test account
- [ ] Notion board has Board + Calendar views, the client is invited
- [ ] Secrets and variables set in GitHub, all three workflows ran green once
- [ ] Client has done Module 3 (20 minutes) with you on a call

Next: [Module 2 · The brand kit](02-brand-kit.md)
