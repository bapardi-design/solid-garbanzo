import { loadPost } from "../post.js";
import { producePost, type PipelineDeps } from "../pipeline.js";
import { log } from "../util/log.js";

/** Pick up every card in "Needs changes", apply the reviewer's feedback, put a new version back "In review". */
export async function revise(deps: PipelineDeps): Promise<{ revised: string[]; skipped: string[]; failed: string[] }> {
  const cards = await deps.board.list({ status: "Needs changes" });
  const revised: string[] = [];
  const skipped: string[] = [];
  const failed: string[] = [];
  if (cards.length === 0) {
    log.info("Nothing in 'Needs changes'.");
    return { revised, skipped, failed };
  }
  log.step(`Revising ${cards.length} post${cards.length === 1 ? "" : "s"}`);
  for (const card of cards) {
    const previous = loadPost(deps.paths, card.postId);
    if (!previous) {
      log.warn(`${card.postId}: card exists but no post record in out/posts — skipping`);
      skipped.push(card.postId);
      continue;
    }
    if (!card.feedback.trim()) {
      log.warn(`${card.postId}: marked 'Needs changes' but the Feedback field is empty — tell the AI what to change`);
      skipped.push(card.postId);
      continue;
    }
    try {
      const plan = { ...previous.plan };
      if (card.scheduledAt) plan.scheduledAt = card.scheduledAt;
      if (card.channels?.length) plan.channels = card.channels;
      const copy = await deps.generator.revise(plan, deps.kit.templates[plan.template], previous.copy, card.feedback);
      await producePost(deps, plan, copy, { ...previous, boardRef: card.ref }, card.feedback);
      await deps.board.setStatus(card.ref, "In review", { clearFeedback: true });
      revised.push(card.postId);
    } catch (err) {
      log.error(`${card.postId}: ${(err as Error).message}`);
      failed.push(card.postId);
    }
  }
  return { revised, skipped, failed };
}
