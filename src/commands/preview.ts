import path from "node:path";
import type { BrandKit } from "../brand.js";
import type { Paths } from "../config.js";
import { StubCopyGenerator } from "../ai/copy.js";
import { loadPlan } from "../plan.js";
import { planRenders, Renderer } from "../render/renderer.js";

/** Render every template with placeholder copy so designers can check the look without an API key. */
export async function preview(kit: BrandKit, paths: Paths, timezone: string, templateName?: string): Promise<string[]> {
  const plan = loadPlan(paths, kit, timezone);
  const renderer = new Renderer();
  const stub = new StubCopyGenerator();
  const files: string[] = [];
  try {
    for (const [name, template] of Object.entries(kit.templates)) {
      if (templateName && name !== templateName) continue;
      const sample = plan.find((p) => p.template === name) ?? { ...plan[0], template: name, format: template.kind === "carousel" ? "carousel" as const : "single" as const };
      const copy = await stub.generate(sample, template);
      const jobs = planRenders(kit, sample, copy, template);
      const out = await renderer.render(kit.templatesDir, jobs, path.join(paths.outDir, "preview", name));
      files.push(...out.map((f) => f.file));
    }
  } finally {
    await renderer.stop();
  }
  return files;
}
