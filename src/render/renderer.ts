import fs from "node:fs";
import path from "node:path";
import { chromium, type Browser } from "playwright";
import type { BrandKit, TemplateDef } from "../brand.js";
import type { PlanPost } from "../plan.js";
import type { Copy, RenderFile } from "../post.js";
import { renderTemplate } from "../util/template.js";
import { log } from "../util/log.js";

export interface RenderJob {
  label: string;
  templateFile: string;
  width: number;
  height: number;
  data: Record<string, unknown>;
}

/** Build the list of images a post needs, in publishing order. */
export function planRenders(kit: BrandKit, post: PlanPost, copy: Copy, template: TemplateDef): RenderJob[] {
  const pillarName = kit.brand.pillars.find((p) => p.key === post.pillar)?.name ?? post.pillar;
  const base = {
    brand: kit.brand,
    design: copy.design,
    post: { id: post.id, pillar: pillarName, format: post.format },
  };
  if (template.kind === "single") {
    return [{ label: "main", templateFile: template.file, width: template.width, height: template.height, data: { ...base, width: template.width, height: template.height } }];
  }
  const total = copy.design.slides.length;
  const jobs: RenderJob[] = [
    { label: "cover", templateFile: template.cover, width: template.width, height: template.height, data: { ...base, width: template.width, height: template.height } },
    ...copy.design.slides.map((slide, i) => ({
      label: `slide-${i + 1}`,
      templateFile: template.slide,
      width: template.width,
      height: template.height,
      data: { ...base, width: template.width, height: template.height, slide: { ...slide, index: i + 1, total } },
    })),
  ];
  if (template.closing) {
    jobs.push({ label: "closing", templateFile: template.closing, width: template.width, height: template.height, data: { ...base, width: template.width, height: template.height } });
  }
  return jobs;
}

export function renderHtml(templatesDir: string, job: RenderJob): string {
  const source = fs.readFileSync(path.join(templatesDir, job.templateFile), "utf8");
  const { html, missing } = renderTemplate(source, job.data);
  if (missing.length) log.warn(`${job.templateFile}: no value for ${missing.join(", ")}`);
  return html;
}

export class Renderer {
  private browser?: Browser;

  async start(): Promise<void> {
    // AUTOPILOT_CHROMIUM lets you point at an existing Chrome/Chromium binary
    // instead of running `npx playwright install chromium`.
    const executablePath = process.env.AUTOPILOT_CHROMIUM || undefined;
    this.browser = await chromium.launch({ executablePath });
  }

  async stop(): Promise<void> {
    await this.browser?.close();
    this.browser = undefined;
  }

  async render(templatesDir: string, jobs: RenderJob[], outDir: string): Promise<RenderFile[]> {
    if (!this.browser) await this.start();
    fs.mkdirSync(outDir, { recursive: true });
    const files: RenderFile[] = [];
    const page = await this.browser!.newPage();
    try {
      for (const [i, job] of jobs.entries()) {
        const html = renderHtml(templatesDir, job);
        await page.setViewportSize({ width: job.width, height: job.height });
        await page.setContent(html, { waitUntil: "load" });
        await page.evaluate(() => (document as unknown as { fonts: { ready: Promise<unknown> } }).fonts.ready).catch(() => undefined);
        await page.waitForTimeout(150);
        const file = path.join(outDir, `${String(i + 1).padStart(2, "0")}-${job.label}.png`);
        await page.screenshot({ path: file, type: "png", fullPage: false });
        files.push({ label: job.label, file, width: job.width, height: job.height });
      }
    } finally {
      await page.close();
    }
    return files;
  }
}
