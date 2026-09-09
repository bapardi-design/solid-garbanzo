import type { Channel } from "../brand.js";
import type { Publisher, PublishRequest, PublishResult } from "./types.js";

/** Ayrshare platform names differ slightly from ours. */
const PLATFORM: Record<Channel, string> = {
  instagram: "instagram", tiktok: "tiktok", linkedin: "linkedin", facebook: "facebook",
  pinterest: "pinterest", threads: "threads", x: "twitter", youtube: "youtube",
};

export function buildAyrsharePayload(req: PublishRequest, profileKey?: string): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    post: req.caption,
    platforms: [PLATFORM[req.channel]],
    mediaUrls: req.mediaUrls,
    isVideo: false,
    ...(profileKey ? { profileKey } : {}),
  };
  if (req.channel === "instagram" && req.format === "story") payload.instagramOptions = { stories: true };
  if (req.channel === "tiktok") payload.tikTokOptions = { autoAddMusic: true, title: req.caption.split("\n")[0].slice(0, 90) };
  if (req.altText) payload.altText = req.mediaUrls.map(() => req.altText);
  return payload;
}

export class AyrsharePublisher implements Publisher {
  readonly name = "ayrshare";
  readonly needsPublicUrls = true;
  constructor(private apiKey: string, private profileKey?: string) {}

  async publish(req: PublishRequest): Promise<PublishResult> {
    if (req.mediaUrls.length === 0) throw new Error("Ayrshare needs public media URLs. Set STORAGE=github or STORAGE=cloudinary.");
    const res = await fetch("https://api.ayrshare.com/api/post", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(buildAyrsharePayload(req, this.profileKey)),
    });
    const json = (await res.json().catch(() => ({}))) as {
      status?: string; id?: string; postIds?: Array<{ platform: string; id?: string; postUrl?: string; status?: string }>;
      errors?: Array<{ message?: string }>; message?: string;
    };
    if (!res.ok || json.status === "error") {
      const detail = json.errors?.map((e) => e.message).join("; ") ?? json.message ?? (await res.text().catch(() => ""));
      throw new Error(`Ayrshare rejected the post (${res.status}): ${detail}`);
    }
    const first = json.postIds?.[0];
    return { url: first?.postUrl, externalId: first?.id ?? json.id };
  }
}
