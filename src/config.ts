import "dotenv/config";
import { z } from "zod";
import path from "node:path";

const EnvSchema = z.object({
  ANTHROPIC_API_KEY: z.string().optional(),
  AUTOPILOT_MODEL: z.string().default("claude-opus-5"),
  BOARD: z.enum(["local", "notion"]).default("local"),
  NOTION_TOKEN: z.string().optional(),
  NOTION_DATA_SOURCE_ID: z.string().optional(),
  NOTION_PARENT_PAGE_ID: z.string().optional(),
  STORAGE: z.enum(["local", "github", "cloudinary"]).default("local"),
  GITHUB_REPOSITORY: z.string().optional(),
  GITHUB_REF_NAME: z.string().default("main"),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_FOLDER: z.string().default("autopilot"),
  PUBLISHER: z.enum(["dryrun", "ayrshare"]).default("dryrun"),
  AYRSHARE_API_KEY: z.string().optional(),
  AYRSHARE_PROFILE_KEY: z.string().optional(),
  AUTOPILOT_TZ: z.string().default("Europe/Berlin"),
  AUTOPILOT_PUBLISH_WINDOW_MINUTES: z.coerce.number().default(30),
});

export type Env = z.infer<typeof EnvSchema>;

export interface Paths {
  root: string;
  brandDir: string;
  brandFile: string;
  strategyFile: string;
  planFile: string;
  templatesDir: string;
  templatesFile: string;
  outDir: string;
  postsDir: string;
  rendersDir: string;
  boardDir: string;
}

/** GitHub Actions exports unset `vars.*` as empty strings; treat those as unset so the defaults apply. */
export function stripEmpty(env: Record<string, string | undefined>): Record<string, string> {
  return Object.fromEntries(Object.entries(env).filter((e): e is [string, string] => typeof e[1] === "string" && e[1].trim() !== ""));
}

export function loadEnv(overrides: Partial<Env> = {}): Env {
  const parsed = EnvSchema.safeParse({ ...stripEmpty(process.env), ...overrides });
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
  }
  return parsed.data;
}

export function resolvePaths(root = process.cwd()): Paths {
  const brandDir = path.join(root, "brand");
  return {
    root,
    brandDir,
    brandFile: path.join(brandDir, "brand.yaml"),
    strategyFile: path.join(brandDir, "strategy.md"),
    planFile: path.join(brandDir, "content-plan.yaml"),
    templatesDir: path.join(brandDir, "templates"),
    templatesFile: path.join(brandDir, "templates", "templates.yaml"),
    outDir: path.join(root, "out"),
    postsDir: path.join(root, "out", "posts"),
    rendersDir: path.join(root, "out", "renders"),
    boardDir: path.join(root, "board"),
  };
}

export function requireEnv(env: Env, key: keyof Env, hint: string): string {
  const v = env[key];
  if (!v) throw new Error(`Missing ${key}. ${hint}`);
  return String(v);
}
