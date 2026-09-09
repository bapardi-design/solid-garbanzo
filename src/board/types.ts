import type { Channel } from "../brand.js";
import type { PostRecord } from "../post.js";

export const STATUSES = ["Draft", "In review", "Needs changes", "Ready to post", "Posting", "Posted", "Failed"] as const;
export type Status = (typeof STATUSES)[number];

export interface BoardCard {
  ref: string;            // page id (Notion) or file path (local)
  postId: string;
  status: Status;
  feedback: string;       // reviewer's feedback text (may be empty)
  caption: string;        // caption currently on the card (reviewer may have edited it)
  scheduledAt?: string;   // reviewer may move the date
  channels?: Channel[];   // reviewer may drop a channel
  version?: number;
  postUrls?: string[];
  url?: string;           // link to open the card
}

export interface StatusUpdate {
  postUrls?: string[];
  error?: string;
  clearFeedback?: boolean;
}

export interface ReviewBoard {
  readonly name: string;
  /** Create the card, or update it in place when the post already has a card. Returns the card ref. */
  upsert(post: PostRecord, status: Status): Promise<{ ref: string; url?: string }>;
  list(filter?: { status?: Status }): Promise<BoardCard[]>;
  setStatus(ref: string, status: Status, update?: StatusUpdate): Promise<void>;
}
