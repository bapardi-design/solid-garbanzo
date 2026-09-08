import { Client } from "@notionhq/client";
import type { Channel } from "../brand.js";
import { hashtagLine, primaryCaption, type PostRecord } from "../post.js";
import { STATUSES, type BoardCard, type ReviewBoard, type Status, type StatusUpdate } from "./types.js";

type Rich = { plain_text: string };
type Props = Record<string, any>;

export const NOTION_PROPERTIES = {
  Name: { title: {} },
  "Post ID": { rich_text: {} },
  Status: { select: { options: STATUSES.map((name) => ({ name, color: statusColor(name) })) } },
  Channels: { multi_select: { options: ["instagram", "tiktok", "linkedin", "facebook", "pinterest", "threads", "x", "youtube"].map((name) => ({ name })) } },
  Scheduled: { date: {} },
  Pillar: { select: {} },
  Format: { select: {} },
  Caption: { rich_text: {} },
  Hashtags: { rich_text: {} },
  Feedback: { rich_text: {} },
  Design: { files: {} },
  "Post URLs": { rich_text: {} },
  Version: { number: { format: "number" } },
  Error: { rich_text: {} },
} as const;

function statusColor(s: Status): "gray" | "blue" | "orange" | "green" | "yellow" | "purple" | "red" {
  return ({ Draft: "gray", "In review": "blue", "Needs changes": "orange", "Ready to post": "green", Posting: "yellow", Posted: "purple", Failed: "red" } as const)[s];
}

/** Notion allows 2000 characters per rich text item; split long text into several. */
export function richText(text: string): Array<{ type: "text"; text: { content: string } }> {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += 2000) chunks.push(text.slice(i, i + 2000));
  if (chunks.length === 0) chunks.push("");
  return chunks.map((content) => ({ type: "text", text: { content } }));
}

function plain(prop: { rich_text?: Rich[]; title?: Rich[] } | undefined): string {
  const items = prop?.rich_text ?? prop?.title ?? [];
  return items.map((r) => r.plain_text).join("");
}

export class NotionBoard implements ReviewBoard {
  readonly name = "notion";
  private client: Client;

  constructor(token: string, private dataSourceId: string) {
    this.client = new Client({ auth: token });
  }

  /** Create the review database under a parent page. Returns the data source id to put in .env. */
  static async setup(token: string, parentPageId: string, title: string): Promise<{ databaseId: string; dataSourceId: string; url?: string }> {
    const client = new Client({ auth: token });
    const db = await client.databases.create({
      parent: { type: "page_id", page_id: parentPageId },
      title: [{ type: "text", text: { content: title } }],
      icon: { type: "emoji", emoji: "📅" },
      initial_data_source: { properties: NOTION_PROPERTIES as any },
    });
    const full = db as any;
    const dataSourceId: string | undefined = full.data_sources?.[0]?.id;
    if (!dataSourceId) throw new Error("Notion did not return a data source id for the new database.");
    return { databaseId: db.id, dataSourceId, url: full.url };
  }

  private async findPage(postId: string): Promise<string | undefined> {
    const res = await this.client.dataSources.query({
      data_source_id: this.dataSourceId,
      filter: { property: "Post ID", rich_text: { equals: postId } },
      page_size: 1,
    });
    return res.results[0]?.id;
  }

  private properties(post: PostRecord, status: Status, keepReviewerFields: boolean): Props {
    const props: Props = {
      Name: { title: richText(`${post.id} · ${post.copy.design.headline}`) },
      "Post ID": { rich_text: richText(post.id) },
      Status: { select: { name: status } },
      Pillar: { select: { name: post.plan.pillar } },
      Format: { select: { name: post.plan.format } },
      Caption: { rich_text: richText(primaryCaption(post)) },
      Hashtags: { rich_text: richText(hashtagLine(post)) },
      Feedback: { rich_text: richText("") },
      Version: { number: post.version },
      Error: { rich_text: richText("") },
      Design: {
        files: post.renders
          .filter((r) => r.url)
          .map((r) => ({ type: "external", name: `${r.label}.png`, external: { url: r.url! } })),
      },
    };
    if (!keepReviewerFields) {
      props.Channels = { multi_select: post.plan.channels.map((name) => ({ name })) };
      props.Scheduled = { date: { start: post.plan.scheduledAt } };
    }
    return props;
  }

  private children(post: PostRecord): any[] {
    const blocks: any[] = [
      { object: "block", type: "heading_2", heading_2: { rich_text: richText(`Version ${post.version}`) } },
      { object: "block", type: "paragraph", paragraph: { rich_text: richText(`AI note: ${post.copy.reviewer_note}`) } },
    ];
    if (post.voiceWarnings.length) {
      blocks.push({ object: "block", type: "callout", callout: { rich_text: richText(`Voice check flagged: ${post.voiceWarnings.join(", ")}`), icon: { type: "emoji", emoji: "⚠️" } } });
    }
    for (const r of post.renders) {
      if (r.url) blocks.push({ object: "block", type: "image", image: { type: "external", external: { url: r.url } } });
      else blocks.push({ object: "block", type: "paragraph", paragraph: { rich_text: richText(`(${r.label}: ${r.file} — set STORAGE=github or cloudinary to see previews here)`) } });
    }
    blocks.push({ object: "block", type: "paragraph", paragraph: { rich_text: richText(`Alt text: ${post.copy.alt_text}`) } });
    for (const c of post.copy.captions) {
      blocks.push({ object: "block", type: "heading_3", heading_3: { rich_text: richText(`Caption · ${c.channel}`) } });
      blocks.push({ object: "block", type: "paragraph", paragraph: { rich_text: richText(c.text) } });
    }
    return blocks;
  }

  async upsert(post: PostRecord, status: Status): Promise<{ ref: string; url?: string }> {
    const existing = post.boardRef ?? (await this.findPage(post.id));
    if (existing) {
      const page = await this.client.pages.update({ page_id: existing, properties: this.properties(post, status, true) });
      await this.client.blocks.children.append({ block_id: existing, children: this.children(post) });
      return { ref: existing, url: (page as any).url };
    }
    const page = await this.client.pages.create({
      parent: { data_source_id: this.dataSourceId },
      properties: this.properties(post, status, false),
      children: this.children(post),
    });
    return { ref: page.id, url: (page as any).url };
  }

  async list(filter?: { status?: Status }): Promise<BoardCard[]> {
    const cards: BoardCard[] = [];
    let cursor: string | undefined;
    do {
      const res = await this.client.dataSources.query({
        data_source_id: this.dataSourceId,
        filter: filter?.status ? { property: "Status", select: { equals: filter.status } } : undefined,
        sorts: [{ property: "Scheduled", direction: "ascending" }],
        start_cursor: cursor,
        page_size: 100,
      });
      for (const page of res.results as any[]) {
        const p = page.properties ?? {};
        const status = (p.Status?.select?.name ?? "Draft") as Status;
        cards.push({
          ref: page.id,
          postId: plain(p["Post ID"]),
          status,
          feedback: plain(p.Feedback),
          caption: plain(p.Caption),
          scheduledAt: p.Scheduled?.date?.start ?? undefined,
          channels: (p.Channels?.multi_select ?? []).map((o: { name: string }) => o.name as Channel),
          version: p.Version?.number ?? undefined,
          postUrls: plain(p["Post URLs"]).split(/\s+/).filter(Boolean),
          url: page.url,
        });
      }
      cursor = res.has_more ? res.next_cursor ?? undefined : undefined;
    } while (cursor);
    return cards;
  }

  async setStatus(ref: string, status: Status, update: StatusUpdate = {}): Promise<void> {
    const properties: Props = { Status: { select: { name: status } } };
    if (update.postUrls) properties["Post URLs"] = { rich_text: richText(update.postUrls.join("\n")) };
    if (update.error !== undefined) properties.Error = { rich_text: richText(update.error) };
    if (update.clearFeedback) properties.Feedback = { rich_text: richText("") };
    await this.client.pages.update({ page_id: ref, properties });
  }
}
