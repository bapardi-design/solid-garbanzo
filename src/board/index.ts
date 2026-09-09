import { requireEnv, type Env, type Paths } from "../config.js";
import { LocalBoard } from "./local.js";
import { NotionBoard } from "./notion.js";
import type { ReviewBoard } from "./types.js";
export * from "./types.js";

export function createBoard(env: Env, paths: Paths): ReviewBoard {
  switch (env.BOARD) {
    case "local": return new LocalBoard(paths.boardDir);
    case "notion": return new NotionBoard(
      requireEnv(env, "NOTION_TOKEN", "Create an internal integration at notion.so/my-integrations."),
      requireEnv(env, "NOTION_DATA_SOURCE_ID", "Run `autopilot notion:setup` first."),
    );
  }
}
