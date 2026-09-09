# Module 4 · Design templates

*For whoever owns the look. No coding needed to change colours, fonts, layout margins; basic HTML for new layouts.*

## How rendering works

A template is a plain HTML file in `brand/templates/`. The pipeline fills in placeholders, opens the file in a headless Chrome at the exact pixel size (1080×1350 feed, 1080×1920 story) and takes a screenshot. What you see in a browser at that size is what gets posted.

`brand/templates/templates.yaml` lists the templates:

```yaml
tip-carousel:
  kind: carousel          # cover + one image per slide + closing
  cover: carousel-cover.html
  slide: carousel-slide.html
  closing: carousel-closing.html
  width: 1080
  height: 1350
  slides: { min: 3, max: 6 }   # how many body slides the AI may write
statement:
  kind: single
  file: statement.html
  width: 1080
  height: 1350
```

## Placeholders

| Placeholder | Comes from |
|---|---|
| `{{brand.visual.colors.accent}}`, `{{brand.tagline}}`, `{{brand.handles.instagram}}` … | anything in `brand.yaml` |
| `{{design.headline}}` `{{design.subheadline}}` `{{design.cta}}` | written by the AI per post |
| `{{slide.title}}` `{{slide.body}}` `{{slide.index}}` `{{slide.total}}` | carousel slides only |
| `{{post.pillar}}` `{{post.id}}` | the plan |

Double braces are HTML-escaped; triple braces `{{{ }}}` insert raw text (used for font stacks).

The AI is told the word limits (headline ≤ 9 words, slide title ≤ 8, slide body ≤ 30) so copy fits. If a client's font is wider, tighten the limits in `src/post.ts` or reduce the font size in the template.

## Changing the look

- **Colours and fonts**: edit `visual` in `brand.yaml`. All templates use the CSS variables `--primary`, `--secondary`, `--accent`, `--heading`, `--body`.
- **Logo**: `visual.logo_text` renders as the wordmark. For an image logo, add `<img src="data:image/png;base64,…">` to the template header (inline it as base64 so no hosting is needed).
- **Layout**: the templates are ~40 lines of CSS each. Spacing, sizes and alignment are inline styles you can tweak.
- **New template**: copy an existing file, add it to `templates.yaml`, reference it in the content plan.

Preview any change without an API key:

```bash
npm run autopilot -- preview                 # every template
npm run autopilot -- preview -t statement    # one template
```

The PNGs land in `out/preview/<template>/`.

## Formats and channels

| Format | Template kind | Instagram | TikTok | LinkedIn |
|---|---|---|---|---|
| carousel | carousel | feed carousel | photo-mode carousel | document-style carousel |
| single | single 1080×1350 | feed post | — | image post |
| story | single 1080×1920 | story | — | — |

Which channel accepts which format is declared per channel in `brand.yaml`; `autopilot check` refuses a plan entry that sends a story to LinkedIn.

Video (Reels, TikTok video) is not in this version. The most-requested next step is a "slideshow" renderer that turns the carousel PNGs into a 15-second MP4 with music via ffmpeg; the publisher already supports video URLs.

Next: [Module 5 · Operations](05-operations.md)
