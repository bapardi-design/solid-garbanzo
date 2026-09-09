import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { LocalBoard, extractSection, splitFrontmatter } from "../src/board/local.js";
import type { PostRecord } from "../src/post.js";

function fakePost(overrides: Partial<PostRecord> = {}): PostRecord {
  return {
    id: "w1-p1",
    version: 1,
    plan: {
      id: "w1-p1", date: "2026-09-14", channels: ["instagram", "tiktok"], pillar: "education", format: "single",
      template: "statement", topic: "Topic", cta: "freebie", approved_story: false, week: 1,
      scheduledAt: "2026-09-14T09:00:00+02:00", timezone: "Europe/Berlin",
    },
    copy: {
      hook: "Hook",
      captions: [{ channel: "instagram", text: "Hook\n\nIG caption" }, { channel: "tiktok", text: "Hook\n\nTT caption" }],
      hashtags: ["one", "#two"],
      alt_text: "alt",
      design: { headline: "H", subheadline: "S", cta: "C", slides: [] },
      reviewer_note: "note",
    },
    renders: [{ label: "main", file: "/x/01-main.png", width: 1080, height: 1350 }],
    voiceWarnings: [],
    history: [],
    generatedAt: "now",
    model: "stub",
    ...overrides,
  };
}

describe("LocalBoard", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "board-"));
  const board = new LocalBoard(dir);

  it("creates a card, reads it back, and round-trips status + feedback + caption edits", async () => {
    const post = fakePost();
    const { ref } = await board.upsert(post, "In review");
    expect(fs.existsSync(ref)).toBe(true);

    let [card] = await board.list();
    expect(card.postId).toBe("w1-p1");
    expect(card.status).toBe("In review");
    expect(card.caption).toBe("Hook\n\nIG caption");
    expect(card.channels).toEqual(["instagram", "tiktok"]);
    expect(card.scheduledAt).toBe("2026-09-14T09:00:00+02:00");

    // Reviewer edits the file by hand.
    let md = fs.readFileSync(ref, "utf8");
    md = md.replace("status: In review", "status: Needs changes").replace("## Feedback\n\n", "## Feedback\n\nShorter hook please\n");
    md = md.replace("Hook\n\nIG caption", "Edited hook\n\nIG caption");
    fs.writeFileSync(ref, md);

    [card] = await board.list({ status: "Needs changes" });
    expect(card.feedback).toBe("Shorter hook please");
    expect(card.caption).toBe("Edited hook\n\nIG caption");
    expect(await board.list({ status: "Posted" })).toEqual([]);
  });

  it("preserves reviewer-controlled fields on upsert of a new version", async () => {
    const ref = path.join(dir, "w1-p1.md");
    let md = fs.readFileSync(ref, "utf8").replace("scheduled: 2026-09-14T09:00:00+02:00", "scheduled: 2026-09-16T10:00:00+02:00");
    fs.writeFileSync(ref, md);
    await board.upsert(fakePost({ version: 2, history: [{ version: 2, feedback: "Shorter hook please", at: "t" }] }), "In review");
    const [card] = await board.list();
    expect(card.version).toBe(2);
    expect(card.scheduledAt).toBe("2026-09-16T10:00:00+02:00");
    expect(card.status).toBe("In review");
    md = fs.readFileSync(ref, "utf8");
    expect(md).toContain("- v2 (t): Shorter hook please");
  });

  it("sets status with urls and errors", async () => {
    const ref = path.join(dir, "w1-p1.md");
    await board.setStatus(ref, "Failed", { error: "boom", postUrls: ["https://x/1"] });
    const [card] = await board.list();
    expect(card.status).toBe("Failed");
    expect(card.postUrls).toEqual(["https://x/1"]);
    expect(fs.readFileSync(ref, "utf8")).toContain("error: boom");
  });

  it("rejects unknown statuses", async () => {
    const ref = path.join(dir, "w1-p1.md");
    fs.writeFileSync(ref, fs.readFileSync(ref, "utf8").replace("status: Failed", "status: Whatever"));
    await expect(board.list()).rejects.toThrow(/unknown status "Whatever"/);
  });
});

describe("markdown helpers", () => {
  it("splits frontmatter and extracts sections", () => {
    const { fm, body } = splitFrontmatter("---\na: 1\n---\n## Caption\n\nhello\n\n## Feedback\n\nfix it\n");
    expect(fm).toEqual({ a: 1 });
    expect(extractSection(body, "Caption")).toBe("hello");
    expect(extractSection(body, "Feedback")).toBe("fix it");
    expect(extractSection(body, "Nope")).toBe("");
  });
});
