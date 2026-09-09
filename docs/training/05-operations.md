# Module 5 · Operations, costs and troubleshooting

## What runs when

| Workflow | Schedule | Command | Commits |
|---|---|---|---|
| Generate posts | Mondays 06:00 UTC, manual | `autopilot generate` | `out/`, `board/` |
| Revise posts | hourly at :15 | `autopilot revise` | `out/`, `board/` |
| Publish due posts | every 30 minutes | `autopilot publish` | `out/` (per-channel outcomes), `board/` |

All three share one concurrency group, so they never overlap. The post records in `out/posts/*.json` are the source of truth; the board is the review layer. Both are versioned in git, so every caption ever generated, every feedback and every published URL is in the history.

Adjust schedules in `.github/workflows/*.yml` (cron is UTC). If you change the publish cadence, keep `AUTOPILOT_PUBLISH_WINDOW_MINUTES` ≥ the interval so no slot is missed.

## Monthly rhythm for an operator

1. **Plan** (1 hour): write next month's topics into `content-plan.yaml` following the pillar shares. `autopilot check`. Commit.
2. **Monday** (automatic): posts generated. The client reviews.
3. **Feedback loops** (automatic): hourly.
4. **Publishing** (automatic).
5. **Review the month** (30 minutes): open the Notion calendar view, look at which posts got feedback and why. Three similar feedbacks = one new line in `brand.yaml`.

## Costs per client per month (16 posts)

| Item | Estimate |
|---|---|
| Claude, generation + a revision on a third of posts | €2–5 |
| GitHub Actions | free tier covers it (roughly 60 minutes of runner time/month) |
| Ayrshare | $20–50 depending on plan; Business plan covers many profiles |
| Notion, Cloudinary | free tiers |

## Running locally instead of on GitHub

Everything works on a laptop: `npm run autopilot -- generate`, review, `revise`, `publish`. For a scheduled local run use cron or a launchd job calling `publish` every 30 minutes. The GitHub route is recommended because there's nothing to keep switched on.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Missing ANTHROPIC_API_KEY` | `.env` not filled / secret not set | add it, or use `--offline` for placeholder copy |
| `browserType.launch: Executable doesn't exist` | Chromium not installed | `npx playwright install chromium` or set `AUTOPILOT_CHROMIUM` to a Chrome binary |
| Card says *No public image URLs* | `STORAGE=local` with a real publisher | set `STORAGE=github` (public repo) or `cloudinary`, then `generate --force --id <id>` |
| `Content plan problems: unknown pillar …` | typo in the plan | `autopilot check` lists every problem |
| Voice check keeps flagging the same word | brand kit says avoid it, AI still uses it | add the replacement in brackets: `word (say other word)`; it helps the model more than the bare word |
| Notion: `Could not find data source` | integration not connected to the page/database | Notion page → Connections → add the integration |
| Notion card shows text instead of images | storage is local | see *No public image URLs* |
| Ayrshare `instagram: media must be a public URL` | private repo with `STORAGE=github` | switch to Cloudinary |
| Nothing posted although *Ready to post* | scheduled time is in the future, or the workflow is disabled after 60 days of repo inactivity | check *Scheduled*; re-enable the workflow in the Actions tab |
| A post is *Failed* | error text on the card | fix, set *Ready to post* again, it retries |

## Safety rails built in

- Nothing is ever posted without a human setting *Ready to post*.
- Every generation is a new version; nothing is overwritten.
- The AI cannot invent numbers or client names (system prompt + compliance rules); flagged phrases are shown on the card.
- Captions are hard-truncated to the channel limit rather than rejected at posting time.
- Secrets never enter the repo: `.env` is git-ignored, workflows read GitHub Secrets.

Next: [Module 6 · Selling it](06-selling-it.md)
