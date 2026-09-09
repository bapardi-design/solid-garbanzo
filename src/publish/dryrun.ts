import { log } from "../util/log.js";
import type { Publisher, PublishRequest, PublishResult } from "./types.js";

export class DryRunPublisher implements Publisher {
  readonly name = "dryrun";
  readonly needsPublicUrls = false;
  async publish(req: PublishRequest): Promise<PublishResult> {
    log.info(`  [dry-run] ${req.channel} ← ${req.postId} (${req.mediaFiles.length} image${req.mediaFiles.length === 1 ? "" : "s"})`);
    log.info(`  [dry-run] caption: ${req.caption.split("\n")[0]} …`);
    return { url: `dryrun://${req.channel}/${req.postId}`, externalId: `dryrun-${Date.now()}` };
  }
}
