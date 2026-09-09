import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import type { Channel } from "../brand.js";
import { hashtagLine, primaryCaption, type PostRecord } from "../post.js";
import { STATUSES, type BoardCard, type ReviewBoard, type Status, type StatusUpdate } from "./types.js";

interface Frontmatter {
  id: string;
  status: Status;
  version: number;
  scheduled: string;
  channels: Channel[];
  feedback: string;
  post_urls: string[];
  error?: string;
}

export function splitFrontmatter(md: string): { fm: Record<string, unknown>; body: string } {
  const m = md.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error("Card has no frontmatter");
  return { fm: (YAML.parse(m[1]) ?? {}) as Record<string, unknown>, body: m[2] };
}

export function extractSection(body: string, heading: string): string {
  const re = new RegExp(`^## ${heading}\\s*\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, "m");
  const m = body.match(re);
  return m ? m[1].trim() : "";
}

export class LocalBoard implements ReviewBoard {
  readonly name = "local";
  constructor(private dir: string) {}

  private file(postId: string): string { return path.join(this.dir, `${postId}.md`); }

  async upsert(post: PostRecord, status: Status): Promise<{ ref: string; url?: string }> {
    fs.mkdirSync(this.dir, { recursive: true });
    const file = this.file(post.id);
    const existing = fs.existsSync(file) ? splitFrontmatter(fs.readFileSync(file, "utf8")).fm as Partial<Frontmatter> : {};
    const fm: Frontmatter = {
      id: post.id,
      status,
      version: post.version,
      scheduled: (existing.scheduled as string) ?? post.plan.scheduledAt,
      channels: (existing.channels as Channel[]) ?? post.plan.channels,
      feedback: "",
      post_urls: (existing.post_urls as string[]) ?? [],
    };
    const renders = post.renders.map((r) => `![${r.label}](${r.url ?? path.relative(this.dir, r.file).split(path.sep).join("/")})`).join("\n");
    const otherCaptions = post.copy.captions
      .map((c) => `### ${c.channel}\n\n${c.text}`)
      .join("\n\n");
    const body = [
      `---\n${YAML.stringify(fm).trim()}\n---`,
      `# ${post.plan.topic}`,
      "",
      `> **How to review:** edit \`status\` above to \`Needs changes\` (and write under *Feedback*) or \`Ready to post\`.`,
      `> You may edit the *Caption* section directly, move \`scheduled\`, or remove a channel. Then run \`autopilot revise\` / \`autopilot publish\`.`,
      "",
      "## Caption",
      "",
      primaryCaption(post),
      "",
      hashtagLine(post),
      "",
      "## Feedback",
      "",
      "",
      "## Design",
      "",
      renders,
      "",
      `Alt text: ${post.copy.alt_text}`,
      "",
      "## Captions per channel",
      "",
      otherCaptions,
      "",
      "## AI notes",
      "",
      post.copy.reviewer_note,
      post.voiceWarnings.length ? `\nVoice check flagged: ${post.voiceWarnings.join(", ")}` : "",
      "",
      "## History",
      "",
      post.history.length ? post.history.map((h) => `- v${h.version} (${h.at}): ${h.feedback}`).join("\n") : "- v1: first draft",
      "",
    ].join("\n");
    fs.writeFileSync(file, body);
    return { ref: file, url: file };
  }

  async list(filter?: { status?: Status }): Promise<BoardCard[]> {
    if (!fs.existsSync(this.dir)) return [];
    const cards: BoardCard[] = [];
    for (const f of fs.readdirSync(this.dir).filter((f) => f.endsWith(".md")).sort()) {
      const file = path.join(this.dir, f);
      const { fm, body } = splitFrontmatter(fs.readFileSync(file, "utf8"));
      const status = String(fm.status ?? "Draft") as Status;
      if (!STATUSES.includes(status)) throw new Error(`${f}: unknown status "${status}". Use one of: ${STATUSES.join(", ")}`);
      if (filter?.status && status !== filter.status) continue;
      const feedbackFm = typeof fm.feedback === "string" ? fm.feedback.trim() : "";
      const feedbackBody = extractSection(body, "Feedback");
      const captionSection = extractSection(body, "Caption");
      // The caption section ends with the hashtag line; strip it so edits to the caption text are what we read.
      const caption = captionSection.replace(/\n+(#[^\n]*)$/, "").trim();
      cards.push({
        ref: file,
        postId: String(fm.id),
        status,
        feedback: [feedbackFm, feedbackBody].filter(Boolean).join("\n"),
        caption,
        scheduledAt: fm.scheduled ? String(fm.scheduled) : undefined,
        channels: Array.isArray(fm.channels) ? (fm.channels as Channel[]) : undefined,
        version: typeof fm.version === "number" ? fm.version : undefined,
        postUrls: Array.isArray(fm.post_urls) ? (fm.post_urls as string[]) : [],
        url: file,
      });
    }
    return cards;
  }

  async setStatus(ref: string, status: Status, update: StatusUpdate = {}): Promise<void> {
    const md = fs.readFileSync(ref, "utf8");
    const { fm, body } = splitFrontmatter(md);
    fm.status = status;
    if (update.postUrls) fm.post_urls = update.postUrls;
    if (update.error !== undefined) fm.error = update.error;
    if (update.clearFeedback) fm.feedback = "";
    fs.writeFileSync(ref, `---\n${YAML.stringify(fm).trim()}\n---\n${body}`);
  }
}
