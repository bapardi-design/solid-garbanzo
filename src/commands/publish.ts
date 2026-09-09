import type { ReviewBoard, BoardCard } from "../board/index.js";
import type { BrandKit } from "../brand.js";
import type { Paths } from "../config.js";
import { captionFor, hashtagLine, loadPost, primaryCaption, savePost, type PostRecord } from "../post.js";
import type { Publisher, PublishRequest } from "../publish/index.js";
import { isDue } from "../util/time.js";
import { log } from "../util/log.js";

export interface PublishDeps {
  kit: BrandKit;
  paths: Paths;
  board: ReviewBoard;
  publisher: Publisher;
  now: Date;
  windowMinutes: number;
}

/** Reviewer edits on the card win: if the card's caption differs from what we generated, use it for every channel. */
export function resolveCaption(post: PostRecord, card: BoardCard, channel: string): string {
  const generated = primaryCaption(post).trim();
  const onCard = card.caption.trim();
  return onCard && onCard !== generated ? onCard : captionFor(post, channel);
}

/** One request per channel still to be posted. Channels recorded in `post.published` are skipped, so a retry after a partial failure never double-posts. */
export function buildRequests(kit: BrandKit, post: PostRecord, card: BoardCard): PublishRequest[] {
  const channels = (card.channels?.length ? card.channels : post.plan.channels).filter((c) => !post.published?.[c]);
  return channels.map((channel) => {
    const cfg = kit.brand.channels[channel];
    const caption = resolveCaption(post, card, channel);
    const tags = hashtagLine(post, cfg?.hashtags);
    const full = tags ? `${caption}\n\n${tags}` : caption;
    const limit = cfg?.caption_max ?? 2200;
    return {
      postId: post.id,
      channel,
      format: post.plan.format,
      caption: full.length > limit ? full.slice(0, limit - 1).trimEnd() + "…" : full,
      mediaUrls: post.renders.map((r) => r.url).filter((u): u is string => Boolean(u)),
      mediaFiles: post.renders.map((r) => r.file),
      altText: post.copy.alt_text,
    };
  });
}

export async function publish(deps: PublishDeps, opts: { all?: boolean; ids?: string[] } = {}): Promise<{ posted: string[]; failed: string[]; waiting: string[] }> {
  const cards = await deps.board.list({ status: "Ready to post" });
  const posted: string[] = [];
  const failed: string[] = [];
  const waiting: string[] = [];
  if (cards.length === 0) {
    log.info("Nothing in 'Ready to post'.");
    return { posted, failed, waiting };
  }
  for (const card of cards) {
    if (opts.ids?.length && !opts.ids.includes(card.postId)) continue;
    const post = loadPost(deps.paths, card.postId);
    if (!post) {
      log.warn(`${card.postId}: no post record in out/posts — skipping`);
      failed.push(card.postId);
      continue;
    }
    const when = card.scheduledAt ?? post.plan.scheduledAt;
    if (!opts.all && !isDue(when, deps.now, deps.windowMinutes)) {
      waiting.push(card.postId);
      continue;
    }
    log.step(`Publishing ${card.postId} (scheduled ${when})`);
    const requests = buildRequests(deps.kit, post, card);
    const alreadyPosted = Object.keys(post.published ?? {});
    if (alreadyPosted.length) log.info(`  already posted to ${alreadyPosted.join(", ")} — retrying the rest only`);
    if (deps.publisher.needsPublicUrls && requests.some((r) => r.mediaUrls.length === 0)) {
      const msg = "No public image URLs. Set STORAGE=github (public repo) or STORAGE=cloudinary and regenerate with --force.";
      log.error(`${card.postId}: ${msg}`);
      await deps.board.setStatus(card.ref, "Failed", { error: msg });
      failed.push(card.postId);
      continue;
    }
    await deps.board.setStatus(card.ref, "Posting");
    post.published = { ...(post.published ?? {}) };
    const errors: string[] = [];
    for (const req of requests) {
      try {
        const res = await deps.publisher.publish(req);
        const url = res.url ?? `${req.channel}:${res.externalId ?? "ok"}`;
        post.published[req.channel] = { url, at: deps.now.toISOString() };
        savePost(deps.paths, post); // persist immediately so a crash mid-loop can't cause a repost
        log.ok(`${req.channel}: ${url}`);
      } catch (err) {
        errors.push(`${req.channel}: ${(err as Error).message}`);
        log.error(`${req.channel}: ${(err as Error).message}`);
      }
    }
    const urls = Object.values(post.published).map((p) => p.url);
    if (errors.length === 0) {
      await deps.board.setStatus(card.ref, "Posted", { postUrls: urls, error: "" });
      posted.push(card.postId);
    } else {
      await deps.board.setStatus(card.ref, "Failed", { postUrls: urls, error: errors.join(" | ") });
      failed.push(card.postId);
    }
  }
  if (waiting.length) log.info(`Waiting for their slot: ${waiting.join(", ")}`);
  return { posted, failed, waiting };
}
