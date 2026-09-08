import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { checkVoice, loadBrandKit } from "../src/brand.js";
import { resolvePaths } from "../src/config.js";
import { loadPlan } from "../src/plan.js";

const root = path.resolve(import.meta.dirname, "..");
const paths = resolvePaths(root);
const kit = loadBrandKit(paths);

describe("brand kit", () => {
  it("loads the shipped brand kit", () => {
    expect(kit.brand.name).toContain("Female Signature");
    expect(Object.keys(kit.templates)).toEqual(expect.arrayContaining(["tip-carousel", "statement", "story"]));
  });
  it("flags banned phrases but ignores policy lines", () => {
    expect(checkVoice(kit.brand, "Time to hustle and 10x your brand, girlboss!")).toEqual(expect.arrayContaining(["girlboss", "hustle", "10x"]));
    expect(checkVoice(kit.brand, "Real recommendations that actually sell.")).toEqual([]);
    expect(checkVoice(kit.brand, "Influencer marketing is not what we do")).toEqual(["influencer marketing"]);
  });
});

describe("content plan", () => {
  it("loads and schedules every post in the brand timezone", () => {
    const posts = loadPlan(paths, kit, "UTC");
    expect(posts.length).toBe(16);
    expect(posts[0].id).toBe("w1-p1");
    expect(posts[0].scheduledAt).toBe("2026-09-14T09:00:00+02:00");
    expect(posts.every((p) => kit.templates[p.template])).toBe(true);
  });
  it("rejects unknown pillars, templates and format/template mismatches", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "plan-"));
    const bad = resolvePaths(dir);
    fs.mkdirSync(bad.brandDir, { recursive: true });
    fs.writeFileSync(bad.planFile, `
weeks:
  - week: 1
    posts:
      - { id: a, date: 2026-01-01, channels: [instagram], pillar: nope, format: single, template: statement, topic: t }
      - { id: a, date: 2026-01-02, channels: [instagram], pillar: education, format: carousel, template: statement, topic: t }
      - { id: b, date: 2026-01-03, channels: [tiktok], pillar: education, format: single, template: nothere, topic: t }
`);
    expect(() => loadPlan(bad, kit, "UTC")).toThrow(/unknown pillar "nope"[\s\S]*duplicate post id "a"[\s\S]*does not match template kind[\s\S]*unknown template "nothere"/);
  });
});
