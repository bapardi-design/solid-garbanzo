import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { z } from "zod";
import type { Paths } from "./config.js";

export const CHANNELS = ["instagram", "tiktok", "linkedin", "facebook", "pinterest", "threads", "x", "youtube"] as const;
export type Channel = (typeof CHANNELS)[number];
export const FORMATS = ["carousel", "single", "story"] as const;
export type Format = (typeof FORMATS)[number];

const ChannelConfig = z.object({
  enabled: z.boolean().default(true),
  formats: z.array(z.enum(FORMATS)).default(["carousel", "single"]),
  caption_max: z.number().default(2200),
  hashtags: z.number().default(5),
  notes: z.string().optional(),
});

export const BrandSchema = z.object({
  name: z.string(),
  short_name: z.string().optional(),
  owner: z.string(),
  website: z.string().optional(),
  handles: z.record(z.string(), z.string()).default({}),
  tagline: z.string(),
  one_liner: z.string(),
  audience: z.object({
    primary: z.string(),
    pains: z.array(z.string()).default([]),
    desires: z.array(z.string()).default([]),
  }),
  positioning: z.string(),
  offers: z.record(z.string(), z.object({
    name: z.string(),
    url: z.string().optional(),
    cta_short: z.string(),
    cta_long: z.string(),
  })),
  voice: z.object({
    summary: z.string(),
    tone_words: z.array(z.string()).default([]),
    we_say: z.array(z.string()).default([]),
    we_avoid: z.array(z.string()).default([]),
    language: z.string().default("en"),
    formality: z.string().optional(),
    emoji_policy: z.string().optional(),
    signature_signoff: z.string().optional(),
  }),
  pillars: z.array(z.object({
    key: z.string(),
    name: z.string(),
    share: z.number().optional(),
    description: z.string(),
  })).min(1),
  visual: z.object({
    colors: z.record(z.string(), z.string()),
    fonts: z.record(z.string(), z.string()),
    logo_text: z.string(),
    style_notes: z.string().optional(),
  }),
  channels: z.partialRecord(z.enum(CHANNELS), ChannelConfig),
  compliance: z.array(z.string()).default([]),
});
export type Brand = z.infer<typeof BrandSchema>;

const TemplateSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("carousel"),
    cover: z.string(),
    slide: z.string(),
    closing: z.string().optional(),
    width: z.number(),
    height: z.number(),
    slides: z.object({ min: z.number().default(3), max: z.number().default(6) }).default({ min: 3, max: 6 }),
  }),
  z.object({
    kind: z.literal("single"),
    file: z.string(),
    width: z.number(),
    height: z.number(),
  }),
]);
export type TemplateDef = z.infer<typeof TemplateSchema>;
export const TemplatesSchema = z.object({ templates: z.record(z.string(), TemplateSchema) });

export interface BrandKit {
  brand: Brand;
  strategy: string;
  templates: Record<string, TemplateDef>;
  templatesDir: string;
}

export function loadBrandKit(paths: Paths): BrandKit {
  const brandRaw = YAML.parse(fs.readFileSync(paths.brandFile, "utf8"));
  const brand = BrandSchema.parse(brandRaw);
  const strategy = fs.existsSync(paths.strategyFile) ? fs.readFileSync(paths.strategyFile, "utf8") : "";
  const templates = TemplatesSchema.parse(YAML.parse(fs.readFileSync(paths.templatesFile, "utf8"))).templates;
  for (const [name, t] of Object.entries(templates)) {
    const files = t.kind === "carousel" ? [t.cover, t.slide, t.closing].filter(Boolean) : [t.file];
    for (const f of files) {
      if (!fs.existsSync(path.join(paths.templatesDir, f as string))) {
        throw new Error(`Template "${name}" references missing file ${f}`);
      }
    }
  }
  return { brand, strategy, templates, templatesDir: paths.templatesDir };
}

/** Words/phrases the brand never uses (first token before any parenthetical note). */
export function bannedPhrases(brand: Brand): string[] {
  return brand.voice.we_avoid
    .map((s) => s.replace(/\(.*?\)/g, "").trim().toLowerCase())
    .filter((s) => s.length > 0 && !/^(excessive|exclamation|max\b|no |never)/.test(s));
}

/** Returns the banned phrases found in `text` (case-insensitive, whole-word where possible). */
export function checkVoice(brand: Brand, text: string): string[] {
  const lower = text.toLowerCase();
  return bannedPhrases(brand).filter((phrase) => {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i");
    return re.test(lower);
  });
}
