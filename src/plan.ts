import fs from "node:fs";
import YAML from "yaml";
import { z } from "zod";
import { CHANNELS, FORMATS, type BrandKit } from "./brand.js";
import type { Paths } from "./config.js";
import { zonedToIso } from "./util/time.js";

const PlanPostSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/i, "ids may only contain letters, numbers and dashes"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  channels: z.array(z.enum(CHANNELS)).min(1),
  pillar: z.string(),
  format: z.enum(FORMATS),
  template: z.string(),
  topic: z.string(),
  angle: z.string().optional(),
  cta: z.string().default("freebie"),
  notes: z.string().optional(),
  approved_story: z.boolean().default(false),
});

export const PlanSchema = z.object({
  timezone: z.string().optional(),
  default_time: z.string().regex(/^\d{2}:\d{2}$/).default("09:00"),
  weeks: z.array(z.object({
    week: z.number(),
    theme: z.string().optional(),
    posts: z.array(PlanPostSchema),
  })),
});

export type PlanPost = z.infer<typeof PlanPostSchema> & {
  week: number;
  theme?: string;
  scheduledAt: string;
  timezone: string;
};

export function loadPlan(paths: Paths, kit: BrandKit, fallbackTz: string): PlanPost[] {
  const plan = PlanSchema.parse(YAML.parse(fs.readFileSync(paths.planFile, "utf8")));
  const tz = plan.timezone ?? fallbackTz;
  const posts: PlanPost[] = [];
  const seen = new Set<string>();
  const problems: string[] = [];
  for (const week of plan.weeks) {
    for (const p of week.posts) {
      if (seen.has(p.id)) problems.push(`duplicate post id "${p.id}"`);
      seen.add(p.id);
      if (!kit.brand.pillars.some((pl) => pl.key === p.pillar)) problems.push(`${p.id}: unknown pillar "${p.pillar}"`);
      if (!kit.templates[p.template]) problems.push(`${p.id}: unknown template "${p.template}"`);
      if (!kit.brand.offers[p.cta] && p.cta !== "engagement") problems.push(`${p.id}: unknown cta "${p.cta}" (use an offer key or "engagement")`);
      const tpl = kit.templates[p.template];
      if (tpl && ((tpl.kind === "carousel") !== (p.format === "carousel"))) {
        problems.push(`${p.id}: format "${p.format}" does not match template kind "${tpl.kind}"`);
      }
      for (const ch of p.channels) {
        const cfg = kit.brand.channels[ch];
        if (!cfg || !cfg.enabled) problems.push(`${p.id}: channel "${ch}" is not enabled in brand.yaml`);
        else if (!cfg.formats.includes(p.format)) problems.push(`${p.id}: channel "${ch}" does not support format "${p.format}"`);
      }
      posts.push({
        ...p,
        week: week.week,
        theme: week.theme,
        timezone: tz,
        scheduledAt: zonedToIso(p.date, p.time ?? plan.default_time, tz),
      });
    }
  }
  if (problems.length) throw new Error(`Content plan problems:\n  - ${problems.join("\n  - ")}`);
  return posts.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
}
