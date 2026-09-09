import type { Channel, Format } from "../brand.js";

export interface PublishRequest {
  postId: string;
  channel: Channel;
  format: Format;
  caption: string;        // final caption incl. hashtags
  mediaUrls: string[];    // public URLs, in order
  mediaFiles: string[];   // local paths (for dry runs / logging)
  altText: string;
}

export interface PublishResult {
  url?: string;
  externalId?: string;
}

export interface Publisher {
  readonly name: string;
  /** True if the publisher needs public media URLs (local storage won't do). */
  readonly needsPublicUrls: boolean;
  publish(req: PublishRequest): Promise<PublishResult>;
}
