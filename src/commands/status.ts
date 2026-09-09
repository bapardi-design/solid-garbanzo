import type { ReviewBoard } from "../board/index.js";
import { formatLocal } from "../util/time.js";

export async function status(board: ReviewBoard, timezone: string): Promise<string> {
  const cards = await board.list();
  if (cards.length === 0) return "Board is empty. Run `autopilot generate --week 1`.";
  const rows = cards.map((c) => [
    c.postId,
    c.status,
    c.scheduledAt ? formatLocal(c.scheduledAt, timezone) : "—",
    (c.channels ?? []).join(","),
    c.version ? `v${c.version}` : "",
    c.feedback ? "feedback ✎" : "",
    c.postUrls?.length ? c.postUrls[0] : "",
  ]);
  const widths = rows[0].map((_, i) => Math.max(...rows.map((r) => r[i].length), 4));
  const line = (r: string[]) => r.map((cell, i) => cell.padEnd(widths[i])).join("  ").trimEnd();
  const header = ["post", "status", "scheduled", "channels", "ver", "", "url"];
  return [line(header), line(widths.map((w) => "-".repeat(w))), ...rows.map(line)].join("\n");
}
