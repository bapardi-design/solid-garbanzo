import { NotionBoard } from "../board/notion.js";

export async function notionSetup(token: string, parentPageId: string, title: string): Promise<string> {
  const { dataSourceId, url } = await NotionBoard.setup(token, parentPageId, title);
  return [
    `Created the review board${url ? `: ${url}` : ""}`,
    "",
    "Add this to your .env (or as a GitHub secret):",
    `  NOTION_DATA_SOURCE_ID=${dataSourceId}`,
  ].join("\n");
}
