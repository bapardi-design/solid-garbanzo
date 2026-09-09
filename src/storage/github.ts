import path from "node:path";
import type { Storage } from "./types.js";

/** No upload: the workflows commit ./out, and public repos serve files from raw.githubusercontent.com. */
export class GithubRawStorage implements Storage {
  readonly name = "github";
  constructor(private repo: string, private ref: string, private root: string) {}
  async upload(localFile: string): Promise<string> {
    const rel = path.relative(this.root, localFile).split(path.sep).map(encodeURIComponent).join("/");
    return `https://raw.githubusercontent.com/${this.repo}/${this.ref}/${rel}`;
  }
}
