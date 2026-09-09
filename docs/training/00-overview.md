# Module 0 · How the Autopilot works

*Reading time: 10 minutes. This is the module to send a client before the kick-off call.*

## The promise

You spend one afternoon telling the system who you are. After that, every week:

- Monday morning: finished posts appear on your board. Captions written in your voice, designs in your colours, one caption per channel.
- You spend 20 minutes reviewing. Thumbs up → *Ready to post*. Not quite → write one sentence of feedback, a corrected version comes back within the hour.
- The posts go out on schedule. Instagram, TikTok, LinkedIn. You never open a scheduling tool.

You stay in control of every single post. The AI does the drafting, the rendering and the posting. You do the judging.

## The five parts

```
 ┌─────────────┐    ┌──────────────┐    ┌──────────────┐    ┌─────────────┐    ┌────────────┐
 │ 1 BRAND KIT │ ─▶ │ 2 GENERATE   │ ─▶ │ 3 REVIEW     │ ─▶ │ 4 PUBLISH   │ ─▶ │ 5 CHANNELS │
 │ voice,      │    │ Claude writes│    │ Notion board │    │ every 30 min│    │ Instagram  │
 │ strategy,   │    │ Chrome       │    │ feedback or  │    │ only what   │    │ TikTok     │
 │ plan,       │    │ renders      │    │ "Ready to    │    │ you approved│    │ LinkedIn … │
 │ templates   │    │              │    │  post"       │    │ and is due  │    │            │
 └─────────────┘    └──────────────┘    └──────────────┘    └─────────────┘    └────────────┘
                            ▲                  │
                            └── "Needs changes" + feedback → new version ──┘
```

**1. Brand kit** (you, once). Three files: who you are and how you sound (`brand.yaml`), why you post (`strategy.md`), what goes out when (`content-plan.yaml`). Plus design templates in your colours and fonts.

**2. Generate** (automatic, weekly). For every planned post the AI gets your whole brand kit plus the brief for that post and returns structured copy: hook, a caption per channel, hashtags, alt text, and the words for the design. A headless browser turns the design template into 1080px images. Carousels get a cover, one slide per point, and a closing slide with your call to action.

**3. Review** (you, 20 minutes a week). Every post becomes a card on a board. You see the images, the caption, and a short note from the AI on the choices it made. You set the status:
- *Ready to post* → it will go out at the planned time.
- *Needs changes* + a sentence of feedback → a new version comes back, marked v2.
- Or edit the caption right on the card. Your edit wins.

**4. Publish** (automatic, every 30 minutes). Anything that is *Ready to post* and whose time has come is posted through a publishing API connected to your accounts. The post URLs are written back on the card. If something fails, the card turns *Failed* with the reason.

**5. Channels.** Instagram (feed carousels, singles, stories), TikTok (photo carousels), LinkedIn, and optionally Facebook, Pinterest, Threads, X, YouTube.

## What the AI knows and doesn't know

It knows exactly what is in the brand kit and the strategy, nothing else. That is the point: if a post sounds off, the fix is almost always one more line in `brand.yaml` (a phrase you never use, an example of your tone, a fact about your audience). Module 2 is about writing a brand kit the AI can't misread.

It will not invent client names or revenue numbers. If a post needs a number, it goes into the content plan's `notes` field and the AI may use it. Everything else is phrased as "one of our founders".

## What you need

| Thing | Why | Cost |
|---|---|---|
| A GitHub account | Runs the automation on a schedule, stores everything | Free |
| An Anthropic API key | The writing | Pay per use, roughly €0.05–0.15 per post |
| Notion (optional but recommended) | The review board | Free plan is enough |
| Ayrshare | Connects the social accounts and posts | From ~$20/month for one brand; Business plan for agencies with several clients |
| Cloudinary (only if the repo is private) | Hosts the images the publisher needs | Free tier |

Next: [Module 1 · Setup](01-setup.md)
