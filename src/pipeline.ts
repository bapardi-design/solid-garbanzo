import path from "node:path";
import { checkVoice, type BrandKit } from "./brand.js";
import type { ReviewBoard } from "./board/index.js";
import type { Paths } from "./config.js";
import type { CopyGenerator } from "./ai/copy.js";
import type { PlanPost } from "./plan.js";
import { savePost, type Copy, type PostRecord } from "./post.js";
import { planRenders, Renderer } from "./render/renderer.js";
import type { Storage } from "./storage/index.js";
import { log } from "./util/log.js";

export interface PipelineDeps {
  kit: BrandKit;
  paths: Paths;
  generator: CopyGenerator;
  renderer: Renderer;
  storage: Storage;
  board: ReviewBoard;
  model: string;
}

/** Copy → render → upload → save → board card. Shared by `generate` and `revise`. */
export async function producePost(
  deps: PipelineDeps,
  plan: PlanPost,
  copy: Copy,
  previous?: PostRecord,
  feedback?: string,
): Promise<PostRecord> {
  const { kit, paths, renderer, storage, board } = deps;
  const template = kit.templates[plan.template];
  const version = previous ? previous.version + 1 : 1;

  const voiceWarnings = [...new Set(copy.captions.flatMap((c) => checkVoice(kit.brand, c.text)))];
  if (voiceWarnings.length) log.warn(`${plan.id}: voice check flagged "${voiceWarnings.join('", "')}"`);

  const jobs = planRenders(kit, plan, copy, template);
  const outDir = path.join(paths.rendersDir, plan.id, `v${version}`);
  const renders = await renderer.render(kit.templatesDir, jobs, outDir);
  log.ok(`${plan.id}: rendered ${renders.length} image${renders.length === 1 ? "" : "s"} → ${path.relative(paths.root, outDir)}`);

  for (const r of renders) {
    r.url = await storage.upload(r.file, `${plan.id}/v${version}/${path.basename(r.file)}`);
  }
  if (storage.name !== "local") log.ok(`${plan.id}: uploaded to ${storage.name}`);

  const post: PostRecord = {
    id: plan.id,
    version,
    plan,
    copy,
    renders,
    voiceWarnings,
    boardRef: previous?.boardRef,
    history: [
      ...(previous?.history ?? []),
      ...(feedback ? [{ version, feedback, at: new Date().toISOString() }] : []),
    ],
    generatedAt: new Date().toISOString(),
    model: deps.model,
  };

  const card = await board.upsert(post, "In review");
  post.boardRef = card.ref;
  savePost(paths, post);
  log.ok(`${plan.id}: v${version} on the ${board.name} board${card.url ? ` → ${card.url}` : ""}`);
  return post;
}
