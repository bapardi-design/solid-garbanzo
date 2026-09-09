import { loadPlan } from "../plan.js";
import { loadPost } from "../post.js";
import { producePost, type PipelineDeps } from "../pipeline.js";
import { log } from "../util/log.js";

export interface GenerateOptions {
  week?: number;
  ids?: string[];
  force?: boolean;
  limit?: number;
  timezone: string;
}

export async function generate(deps: PipelineDeps, opts: GenerateOptions): Promise<{ generated: string[]; skipped: string[]; failed: string[] }> {
  let posts = loadPlan(deps.paths, deps.kit, opts.timezone);
  if (opts.week !== undefined) posts = posts.filter((p) => p.week === opts.week);
  if (opts.ids?.length) posts = posts.filter((p) => opts.ids!.includes(p.id));
  if (opts.limit) posts = posts.slice(0, opts.limit);
  if (posts.length === 0) {
    log.warn("No posts matched. Check --week / --id against brand/content-plan.yaml.");
    return { generated: [], skipped: [], failed: [] };
  }

  const generated: string[] = [];
  const skipped: string[] = [];
  const failed: string[] = [];
  log.step(`Generating ${posts.length} post${posts.length === 1 ? "" : "s"} with ${deps.model}`);
  for (const plan of posts) {
    const existing = loadPost(deps.paths, plan.id);
    if (existing && !opts.force) {
      log.info(`  – ${plan.id}: already generated (v${existing.version}); use --force to redo`);
      skipped.push(plan.id);
      continue;
    }
    try {
      const copy = await deps.generator.generate(plan, deps.kit.templates[plan.template]);
      await producePost(deps, plan, copy, opts.force ? existing : undefined, opts.force ? "Regenerated with --force" : undefined);
      generated.push(plan.id);
    } catch (err) {
      log.error(`${plan.id}: ${(err as Error).message}`);
      failed.push(plan.id);
    }
  }
  return { generated, skipped, failed };
}
