import { describe, expect, it } from "vitest";
import type { BoardCard, ReviewBoard, Status } from "../src/board/types.js";
import { loadBrandKit } from "../src/brand.js";
import { buildRequests, publish, resolveCaption } from "../src/commands/publish.js";
import { resolvePaths } from "../src/config.js";
import type { PostRecord } from "../src/post.js";
import { buildAyrsharePayload } from "../src/publish/ayrshare.js";
import { cloudinarySignature } from "../src/storage/cloudinary.js";
import type { Publisher, PublishRequest } from "../src/publish/types.js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const kit = loadBrandKit(resolvePaths(path.resolve(import.meta.dirname, "..")));

const post: PostRecord = {
  id: "w1-p1", version: 1,
  plan: {
    id: "w1-p1", date: "2026-09-14", channels: ["instagram", "tiktok"], pillar: "education", format: "carousel",
    template: "tip-carousel", topic: "T", cta: "freebie", approved_story: false, week: 1,
    scheduledAt: "2026-09-14T09:00:00+02:00", timezone: "Europe/Berlin",
  },
  copy: {
    hook: "Hook",
    captions: [{ channel: "instagram", text: "IG text" }, { channel: "tiktok", text: "TT text" }],
    hashtags: ["a", "b", "c", "d", "e", "f", "g"],
    alt_text: "alt",
    design: { headline: "H", subheadline: "S", cta: "C", slides: [{ title: "1", body: "b" }] },
    reviewer_note: "",
  },
  renders: [
    { label: "cover", file: "/r/01.png", url: "https://cdn/1.png", width: 1080, height: 1350 },
    { label: "slide-1", file: "/r/02.png", url: "https://cdn/2.png", width: 1080, height: 1350 },
  ],
  voiceWarnings: [], history: [], generatedAt: "", model: "stub",
};
const card: BoardCard = { ref: "x", postId: "w1-p1", status: "Ready to post", feedback: "", caption: "IG text" };

describe("resolveCaption", () => {
  it("uses per-channel captions when the card is untouched", () => {
    expect(resolveCaption(post, card, "tiktok")).toBe("TT text");
  });
  it("lets a reviewer edit on the card override every channel", () => {
    expect(resolveCaption(post, { ...card, caption: "Edited by Mediha" }, "tiktok")).toBe("Edited by Mediha");
  });
});

describe("buildRequests", () => {
  it("builds one request per channel with channel-specific hashtag counts and media urls", () => {
    const reqs = buildRequests(kit, post, card);
    expect(reqs.map((r) => r.channel)).toEqual(["instagram", "tiktok"]);
    expect(reqs[0].caption).toBe("IG text\n\n#a #b #c #d #e");
    expect(reqs[1].caption).toBe("TT text\n\n#a #b #c #d");
    expect(reqs[0].mediaUrls).toEqual(["https://cdn/1.png", "https://cdn/2.png"]);
  });
  it("respects channels removed on the card", () => {
    expect(buildRequests(kit, post, { ...card, channels: ["tiktok"] }).map((r) => r.channel)).toEqual(["tiktok"]);
  });
  it("truncates captions over the channel limit", () => {
    const long = { ...post, copy: { ...post.copy, captions: [{ channel: "instagram" as const, text: "x".repeat(3000) }] } };
    const [req] = buildRequests(kit, long, { ...card, caption: "" });
    expect(req.caption.length).toBeLessThanOrEqual(2200);
    expect(req.caption.endsWith("…")).toBe(true);
  });
});

class MemoryBoard implements ReviewBoard {
  readonly name = "memory";
  updates: Array<{ ref: string; status: Status; extra?: unknown }> = [];
  constructor(private cards: BoardCard[]) {}
  async upsert(): Promise<{ ref: string }> { throw new Error("not used"); }
  async list(filter?: { status?: Status }): Promise<BoardCard[]> { return this.cards.filter((c) => !filter?.status || c.status === filter.status); }
  async setStatus(ref: string, status: Status, extra?: unknown): Promise<void> { this.updates.push({ ref, status, extra }); }
}

describe("publish", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pub-"));
  const paths = resolvePaths(tmp);
  fs.mkdirSync(paths.postsDir, { recursive: true });
  fs.writeFileSync(path.join(paths.postsDir, "w1-p1.json"), JSON.stringify(post));

  const okPublisher: Publisher = { name: "ok", needsPublicUrls: true, publish: async (r: PublishRequest) => ({ url: `https://${r.channel}/p` }) };

  it("skips posts that are not due yet", async () => {
    const board = new MemoryBoard([card]);
    const r = await publish({ kit, paths, board, publisher: okPublisher, now: new Date("2026-09-01T00:00:00Z"), windowMinutes: 30 });
    expect(r).toEqual({ posted: [], failed: [], waiting: ["w1-p1"] });
    expect(board.updates).toEqual([]);
  });

  it("posts due cards and records urls", async () => {
    const board = new MemoryBoard([card]);
    const r = await publish({ kit, paths, board, publisher: okPublisher, now: new Date("2026-09-14T06:50:00Z"), windowMinutes: 30 });
    expect(r.posted).toEqual(["w1-p1"]);
    expect(board.updates.map((u) => u.status)).toEqual(["Posting", "Posted"]);
    expect((board.updates[1].extra as { postUrls: string[] }).postUrls).toEqual(["https://instagram/p", "https://tiktok/p"]);
  });

  it("marks Failed when a channel errors, keeping successful urls", async () => {
    const board = new MemoryBoard([card]);
    const flaky: Publisher = { name: "flaky", needsPublicUrls: true, publish: async (r) => { if (r.channel === "tiktok") throw new Error("TikTok down"); return { url: "https://ig/p" }; } };
    const r = await publish({ kit, paths, board, publisher: flaky, now: new Date(), windowMinutes: 30 }, { all: true });
    expect(r.failed).toEqual(["w1-p1"]);
    const last = board.updates.at(-1)!;
    expect(last.status).toBe("Failed");
    expect((last.extra as { error: string }).error).toContain("tiktok: TikTok down");
  });

  it("fails fast when the publisher needs public urls and there are none", async () => {
    fs.writeFileSync(path.join(paths.postsDir, "w1-p1.json"), JSON.stringify({ ...post, renders: post.renders.map((x) => ({ ...x, url: undefined })) }));
    const board = new MemoryBoard([card]);
    const r = await publish({ kit, paths, board, publisher: okPublisher, now: new Date(), windowMinutes: 30 }, { all: true });
    expect(r.failed).toEqual(["w1-p1"]);
    expect(board.updates[0].status).toBe("Failed");
  });
});

describe("adapters", () => {
  it("builds an Ayrshare payload with platform mapping and story/tiktok options", () => {
    const base: PublishRequest = { postId: "p", channel: "x", format: "single", caption: "Hi\nthere", mediaUrls: ["https://m/1.png"], mediaFiles: [], altText: "alt" };
    expect(buildAyrsharePayload(base, "pk")).toMatchObject({ post: "Hi\nthere", platforms: ["twitter"], mediaUrls: ["https://m/1.png"], profileKey: "pk", altText: ["alt"] });
    expect(buildAyrsharePayload({ ...base, channel: "instagram", format: "story" })).toMatchObject({ instagramOptions: { stories: true } });
    expect(buildAyrsharePayload({ ...base, channel: "tiktok" })).toMatchObject({ tikTokOptions: { title: "Hi" } });
  });
  it("signs Cloudinary uploads with sorted params", () => {
    // sha1("folder=f&public_id=p&timestamp=1" + "secret")
    expect(cloudinarySignature({ timestamp: 1, public_id: "p", folder: "f" }, "secret")).toBe(
      cloudinarySignature({ folder: "f", public_id: "p", timestamp: 1 }, "secret"),
    );
    expect(cloudinarySignature({ folder: "f", public_id: "p", timestamp: 1 }, "secret")).toMatch(/^[a-f0-9]{40}$/);
  });
});
