import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { CHANNELS } from "./brand.js";
import type { Paths } from "./config.js";
import type { PlanPost } from "./plan.js";

export const CopySchema = z.object({
  hook: z.string().describe("The first line. Must stop the scroll. No emoji."),
  captions: z.array(z.object({
    channel: z.enum(CHANNELS),
    text: z.string().describe("Full caption for this channel, including the hook as first line and the CTA at the end. No hashtags here."),
  })).min(1),
  hashtags: z.array(z.string().regex(/^#?[\p{L}\p{N}_]+$/u)).describe("Without the # symbol is fine; lower-case; brand + topic tags."),
  alt_text: z.string().describe("One sentence describing the design for screen readers."),
  design: z.object({
    headline: z.string().describe("Cover / main headline. Max 9 words."),
    subheadline: z.string().describe("One supporting sentence. Max 18 words."),
    cta: z.string().describe("Short CTA for the closing slide or corner badge. Max 7 words."),
    slides: z.array(z.object({
      title: z.string().describe("Max 8 words."),
      body: z.string().describe("Max 30 words."),
    })).describe("Carousel body slides only (cover and closing are separate). Empty for single/story formats."),
  }),
  reviewer_note: z.string().describe("One or two sentences for the human reviewer: choices you made, anything to double-check."),
});
export type Copy = z.infer<typeof CopySchema>;

export interface RenderFile {
  label: string;      // "cover", "slide-1", "closing", "main"
  file: string;       // absolute path on disk
  url?: string;       // public URL after upload (undefined for local storage)
  width: number;
  height: number;
}

export interface PostRecord {
  id: string;
  version: number;
  plan: PlanPost;
  copy: Copy;
  renders: RenderFile[];
  voiceWarnings: string[];
  boardRef?: string;
  history: Array<{ version: number; feedback: string; at: string }>;
  generatedAt: string;
  model: string;
}

export function postFile(paths: Paths, id: string): string {
  return path.join(paths.postsDir, `${id}.json`);
}

export function loadPost(paths: Paths, id: string): PostRecord | undefined {
  const f = postFile(paths, id);
  if (!fs.existsSync(f)) return undefined;
  return JSON.parse(fs.readFileSync(f, "utf8")) as PostRecord;
}

export function savePost(paths: Paths, post: PostRecord): void {
  fs.mkdirSync(paths.postsDir, { recursive: true });
  fs.writeFileSync(postFile(paths, post.id), JSON.stringify(post, null, 2) + "\n");
}

export function listPosts(paths: Paths): PostRecord[] {
  if (!fs.existsSync(paths.postsDir)) return [];
  return fs.readdirSync(paths.postsDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(paths.postsDir, f), "utf8")) as PostRecord);
}

/** The caption shown on the review card: the first planned channel's caption. */
export function primaryCaption(post: PostRecord): string {
  const first = post.plan.channels[0];
  return post.copy.captions.find((c) => c.channel === first)?.text ?? post.copy.captions[0]?.text ?? "";
}

export function captionFor(post: PostRecord, channel: string): string {
  return post.copy.captions.find((c) => c.channel === channel)?.text ?? primaryCaption(post);
}

export function hashtagLine(post: PostRecord, max?: number): string {
  const tags = post.copy.hashtags.map((t) => (t.startsWith("#") ? t : `#${t}`));
  return (max ? tags.slice(0, max) : tags).join(" ");
}
