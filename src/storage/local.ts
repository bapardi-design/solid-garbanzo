import type { Storage } from "./types.js";
export class LocalStorage implements Storage {
  readonly name = "local";
  async upload(): Promise<string | undefined> { return undefined; }
}
