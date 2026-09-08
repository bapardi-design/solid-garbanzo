import { requireEnv, type Env } from "../config.js";
import { AyrsharePublisher } from "./ayrshare.js";
import { DryRunPublisher } from "./dryrun.js";
import type { Publisher } from "./types.js";
export * from "./types.js";

export function createPublisher(env: Env): Publisher {
  switch (env.PUBLISHER) {
    case "dryrun": return new DryRunPublisher();
    case "ayrshare": return new AyrsharePublisher(requireEnv(env, "AYRSHARE_API_KEY", "From app.ayrshare.com → API Key."), env.AYRSHARE_PROFILE_KEY);
  }
}
