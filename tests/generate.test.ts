import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { CopyGenerator } from "../src/ai/copy.js";
import { StubCopyGenerator } from "../src/ai/copy.js";
import type { ReviewBoard, Status } from "../src/board/types.js";
import { loadBrandKit } from "../src/brand.js";
import { generate } from "../src/commands/generate.js";
import { resolvePaths } from "../src/config.js";
import type { PlanPost } from "../src/plan.js";
import type { PostRecord } from "../src/post.js";
import { Renderer } from "../src/render/renderer.js";
import { LocalStorage } from "../src/storage/local.js";

const repo = path.resolve(import.meta.dirname, "..");
const kit = loadBrandKit(resolvePaths(repo));

/** Renderer stand-in: writes empty files instead of launching Chromium. */
class FakeRenderer extends Renderer {
  override async start(): Promise<void> {}
  override async stop(): Promise<void> {}
  override async render(_dir: string, jobs: { label: string; width: number; height: number }[], outDir: string) {
    fs.mkdirSync(outDir, { recursive: true });
    return jobs.map((j, i) => { const file = path.join(outDir, `${i + 1}-${j.label}.png`); fs.writeFileSync(file, ""); return { label: j.label, file, width: j.width, height: j.height }; });
  }
}
class NullBoard implements ReviewBoard {
  readonly name = "null";
  async upsert(post: PostRecord): Promise<{ ref: string }> { return { ref: post.id }; }
  async list(): Promise<[]> { return []; }
  async setStatus(_r: string, _s: Status): Promise<void> {}
}

function deps(generator: CopyGenerator) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gen-"));
  fs.cpSync(path.join(repo, "brand"), path.join(tmp, "brand"), { recursive: true });
  return { kit, paths: resolvePaths(tmp), generator, renderer: new FakeRenderer(), storage: new LocalStorage(), board: new NullBoard(), model: "stub" };
}

describe("generate", () => {
  it("reports API/render failures separately from already-generated skips", async () => {
    const failing: CopyGenerator = {
      generate: async (post: PlanPost) => { if (post.id === "w1-p2") throw new Error("API down"); return new StubCopyGenerator().generate(post, kit.templates[post.template]); },
      revise: async () => { throw new Error("unused"); },
    };
    const d = deps(failing);
    const first = await generate(d, { ids: ["w1-p1", "w1-p2"], timezone: "UTC" });
    expect(first).toEqual({ generated: ["w1-p1"], skipped: [], failed: ["w1-p2"] });

    const second = await generate(d, { ids: ["w1-p1"], timezone: "UTC" });
    expect(second).toEqual({ generated: [], skipped: ["w1-p1"], failed: [] });
  });
});
