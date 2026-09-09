import { requireEnv, type Env } from "../config.js";
import { CloudinaryStorage } from "./cloudinary.js";
import { GithubRawStorage } from "./github.js";
import { LocalStorage } from "./local.js";
import type { Storage } from "./types.js";
export type { Storage } from "./types.js";

export function createStorage(env: Env, root: string): Storage {
  switch (env.STORAGE) {
    case "local": return new LocalStorage();
    case "github": return new GithubRawStorage(requireEnv(env, "GITHUB_REPOSITORY", "Set it to owner/repo."), env.GITHUB_REF_NAME, root);
    case "cloudinary": return new CloudinaryStorage(
      requireEnv(env, "CLOUDINARY_CLOUD_NAME", "From your Cloudinary dashboard."),
      requireEnv(env, "CLOUDINARY_API_KEY", "From your Cloudinary dashboard."),
      requireEnv(env, "CLOUDINARY_API_SECRET", "From your Cloudinary dashboard."),
      env.CLOUDINARY_FOLDER,
    );
  }
}
