# Module 2 · The brand kit workshop

*Time: 2–3 hours with the client. This is the module that decides whether the posts sound like them.*

The AI reads three files before every post. Nothing else. If the posts are generic, one of these files is generic.

## `brand/brand.yaml` — how we sound

Go through it top to bottom with the client. The sections that do the most work:

### `voice`
- **summary**: two or three sentences, written as if explaining the person to a ghostwriter. "Talks like a founder friend who has done it, not like an agency" is worth more than "authentic and professional".
- **we_say**: the phrases they actually use. Steal them from their emails, their website, their voice notes.
- **we_avoid**: the phrases that make them cringe. The pipeline checks every caption against this list and flags hits on the card. Add a note in brackets to say what to use instead, e.g. `influencer marketing (say creator marketing)`.
- **emoji_policy** and **signature_signoff**: small things that make the reader feel "that's her".

### `audience`
Pains and desires in the audience's own words. The hooks come from here.

### `pillars`
Three to five themes with a rough percentage share. Every post in the plan is tagged with one. Keep the descriptions concrete: "Client wins, before/after numbers, founder stories" beats "Social proof".

### `offers`
Every CTA the posts can end with. `cta_long` is what the AI paraphrases at the end of a caption; `cta_short` goes on the closing slide. The content plan refers to these by key (`freebie`, `core`) or uses `engagement` for a question.

### `channels`
Which channels are on, which formats each supports, caption length, how many hashtags, and a one-line note on how that channel differs ("LinkedIn: no emoji in the first line"). The AI writes a separate caption per channel following these notes.

### `visual`
Colours, fonts, logo text. These flow straight into the templates. Change a hex code here, every design changes.

### `compliance`
Hard rules. Income claims, naming clients, legal wording. The AI treats these as non-negotiable.

## `brand/strategy.md` — why we post

Free-form markdown. The example in the repo has the sections that matter: the 90-day goal, the core message, the audience journey (which kind of post for which stage), channel roles, cadence, hooks that work, CTAs, KPIs, and a "never" list. Write it once with the client, revisit it quarterly.

## `brand/content-plan.yaml` — what goes out

One entry per post:

```yaml
- id: w2-p3
  date: 2026-09-24
  time: "09:00"            # optional, default_time otherwise
  channels: [instagram, tiktok, linkedin]
  pillar: education
  format: carousel          # carousel | single | story
  template: tip-carousel    # from brand/templates/templates.yaml
  topic: "What to pay partners: commission vs flat fee vs product."
  angle: "Practical, no jargon, end with the rule of thumb."   # optional
  cta: freebie              # offer key or "engagement"
  notes: "Typical commission 10–20%."                           # facts the AI may use verbatim
  approved_story: false     # true = real client details allowed
```

The `topic` is the brief. One or two sentences is enough; the AI has the strategy for context. Put every number you want to see in `notes`; the AI won't make numbers up.

A good planning rhythm: block a monthly hour, write 16 topics following the pillar shares, drop them in. `npm run autopilot -- check` tells you immediately if a pillar, template or channel is wrong.

## Test the kit

```bash
npm run autopilot -- generate --id w1-p1 --force
```

Read the caption on the card out loud in the client's voice. If it doesn't sound right, the fix is a line in `brand.yaml`, not an edit to the caption. Repeat until three posts in a row pass without edits. That usually takes two or three rounds.

## Swapping brands

Everything client-specific lives in `brand/`. To onboard the next client: new repo from the template, replace the four things in `brand/` (kit, strategy, plan, template colours), new `.env`. The pipeline doesn't change.

Next: [Module 3 · The review workflow](03-review-workflow.md)
