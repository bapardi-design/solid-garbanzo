# Module 3 · The review workflow (the client's 20 minutes)

*This is the only module the client has to master. Do it with them on a screen share.*

## The board

Every post is a card. On Notion it's a database row with the images in the page; locally it's a markdown file in `board/`. Either way a card has:

- **Status** — the only field you must touch.
- **Caption** — the caption for the first channel; the page body shows every channel's version.
- **Design** — the images, in posting order (cover, slides, closing).
- **Feedback** — where you tell the AI what to change.
- **Scheduled** and **Channels** — move the date, remove a channel; both are respected.
- **AI notes** — one or two sentences from the AI on what it chose and what to double-check, plus any banned phrases the voice check found.
- **Version** and history — v1, v2 … with the feedback that led to each.

## The statuses

| Status | Meaning | Who sets it |
|---|---|---|
| In review | New version waiting for you | pipeline |
| Needs changes | You wrote feedback; a new version is coming | you |
| Ready to post | Approved; will go out at the scheduled time | you |
| Posting | Being sent right now | pipeline |
| Posted | Done; post URLs are on the card | pipeline |
| Failed | Something went wrong; the error is on the card | pipeline |

## The three moves

**1. Approve.** Read caption, swipe through the images, set *Ready to post*. Done.

**2. Ask for changes.** Set *Needs changes* and write feedback the way you'd brief a person:

> Hook is too soft, make it a question about ad costs. Slide 3 repeats slide 2, merge them. Drop "untapped", I say that too often.

Within the hour a v2 appears back in *In review*, with your feedback logged in the history. Feedback with no text is ignored (the card stays in *Needs changes* and the run log says why), so always write something.

**3. Edit directly.** Small fix? Change the caption text on the card and set *Ready to post*. The pipeline notices the caption differs from what it generated and uses **your** text for every channel. Use this for a word or a sentence; use feedback for anything structural, so the design gets re-rendered too.

## Things to check in review

- Does the hook stand on its own in the first line? (That's all most people see.)
- Is the CTA the one planned for this post?
- Numbers and names: only what was in the plan?
- Does the design read at phone size? Long headlines wrap into three lines; ask for a shorter one.
- Voice check warnings on the card: usually a quick feedback line.

## Timing

- Approve before the scheduled time. The publisher runs every 30 minutes and posts anything due within the next 30 minutes.
- Approved late? It goes out on the next run. Nothing is ever posted without *Ready to post*.
- Want it out now? Set *Ready to post* and run the *Publish due posts* workflow manually with "all" ticked, or locally `npm run autopilot -- publish --all --id w1-p1`.

## When a post fails

The card goes to *Failed* with the error text. The common ones:

- *No public image URLs* — storage is set to local. Fix the storage setting and regenerate with `--force`.
- Ayrshare errors mention the platform: usually the social account needs re-linking in Ayrshare, or TikTok/Instagram rejected a format (stories need an Instagram Business account).

Fix the cause, set the card back to *Ready to post*, it retries on the next run. Channels that already went out are remembered and are not posted a second time; only the failed ones are retried.

Next: [Module 4 · Design templates](04-templates.md)
