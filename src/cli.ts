import { Command } from "commander";
import { ZodError } from "zod";
import { ClaudeCopyGenerator, StubCopyGenerator } from "./ai/copy.js";
import { createBoard } from "./board/index.js";
import { loadBrandKit } from "./brand.js";
import { loadEnv, requireEnv, resolvePaths } from "./config.js";
import { generate } from "./commands/generate.js";
import { notionSetup } from "./commands/notionSetup.js";
import { preview } from "./commands/preview.js";
import { publish } from "./commands/publish.js";
import { revise } from "./commands/revise.js";
import { status } from "./commands/status.js";
import { loadPlan } from "./plan.js";
import { createPublisher } from "./publish/index.js";
import { Renderer } from "./render/renderer.js";
import { createStorage } from "./storage/index.js";
import { log } from "./util/log.js";
import type { PipelineDeps } from "./pipeline.js";

const program = new Command();
program
  .name("autopilot")
  .description("Brand in, posts out. AI social media content with a human review gate and automated publishing.")
  .option("-C, --cwd <dir>", "project directory", process.cwd());

function boot(opts: { offline?: boolean } = {}) {
  const paths = resolvePaths(program.opts().cwd);
  const env = loadEnv();
  const kit = loadBrandKit(paths);
  return { paths, env, kit, offline: opts.offline ?? false };
}

async function pipelineDeps(offline: boolean): Promise<PipelineDeps & { stop: () => Promise<void> }> {
  const { paths, env, kit } = boot();
  const generator = offline
    ? new StubCopyGenerator()
    : new ClaudeCopyGenerator(kit, env.AUTOPILOT_MODEL, requireEnv(env, "ANTHROPIC_API_KEY", "Get one at console.anthropic.com, or pass --offline to use placeholder copy."));
  const renderer = new Renderer();
  await renderer.start();
  return {
    kit, paths, generator, renderer,
    storage: createStorage(env, paths.root),
    board: createBoard(env, paths),
    model: offline ? "stub" : env.AUTOPILOT_MODEL,
    stop: () => renderer.stop(),
  };
}

program.command("check")
  .description("Validate the brand kit, templates and content plan. Run this after every edit.")
  .action(() => {
    const { paths, env, kit } = boot();
    const posts = loadPlan(paths, kit, env.AUTOPILOT_TZ);
    log.ok(`brand kit: ${kit.brand.name} (${kit.brand.pillars.length} pillars, ${Object.keys(kit.templates).length} templates)`);
    log.ok(`content plan: ${posts.length} posts across ${new Set(posts.map((p) => p.week)).size} weeks`);
    log.ok(`board=${env.BOARD} storage=${env.STORAGE} publisher=${env.PUBLISHER} tz=${env.AUTOPILOT_TZ}`);
    if (env.PUBLISHER !== "dryrun" && env.STORAGE === "local") log.warn("PUBLISHER needs public image URLs; STORAGE=local will fail at publish time.");
  });

program.command("generate")
  .description("Write copy, render designs and put the posts on the review board.")
  .option("-w, --week <n>", "only this week of the content plan", (v) => Number(v))
  .option("-i, --id <ids...>", "only these post ids")
  .option("-n, --limit <n>", "stop after n posts", (v) => Number(v))
  .option("-f, --force", "regenerate posts that already exist (new version)")
  .option("--offline", "no API calls: placeholder copy, real renders (for testing the design)")
  .action(async (o) => {
    const deps = await pipelineDeps(Boolean(o.offline));
    try {
      const env = loadEnv();
      const r = await generate(deps, { week: o.week, ids: o.id, force: o.force, limit: o.limit, timezone: env.AUTOPILOT_TZ });
      log.info(`\nGenerated: ${r.generated.length}, skipped: ${r.skipped.length}`);
      if (r.generated.length) log.info(`Next: review the cards on the ${deps.board.name} board, then set them to "Ready to post".`);
    } finally {
      await deps.stop();
    }
  });

program.command("revise")
  .description("Apply reviewer feedback: regenerate every card marked 'Needs changes'.")
  .option("--offline", "no API calls (placeholder revision)")
  .action(async (o) => {
    const deps = await pipelineDeps(Boolean(o.offline));
    try {
      const r = await revise(deps);
      log.info(`\nRevised: ${r.revised.length}, skipped: ${r.skipped.length}`);
    } finally {
      await deps.stop();
    }
  });

program.command("publish")
  .description("Post everything that is 'Ready to post' and due.")
  .option("--all", "ignore the schedule and post every 'Ready to post' card now")
  .option("-i, --id <ids...>", "only these post ids")
  .action(async (o) => {
    const { paths, env, kit } = boot();
    const r = await publish({
      kit, paths,
      board: createBoard(env, paths),
      publisher: createPublisher(env),
      now: new Date(),
      windowMinutes: env.AUTOPILOT_PUBLISH_WINDOW_MINUTES,
    }, { all: o.all, ids: o.id });
    log.info(`\nPosted: ${r.posted.length}, failed: ${r.failed.length}, waiting: ${r.waiting.length}`);
    if (r.failed.length) process.exitCode = 1;
  });

program.command("status")
  .description("Show every card on the review board.")
  .action(async () => {
    const { paths, env } = boot();
    console.log(await status(createBoard(env, paths), env.AUTOPILOT_TZ));
  });

program.command("preview")
  .description("Render every design template with placeholder copy (no API key needed).")
  .option("-t, --template <name>", "only this template")
  .action(async (o) => {
    const { paths, env, kit } = boot();
    const files = await preview(kit, paths, env.AUTOPILOT_TZ, o.template);
    for (const f of files) log.ok(f);
  });

program.command("notion:setup")
  .description("Create the Notion review board database under NOTION_PARENT_PAGE_ID.")
  .option("-t, --title <title>", "database title")
  .action(async (o) => {
    const { env, kit } = boot();
    const out = await notionSetup(
      requireEnv(env, "NOTION_TOKEN", "Create an internal integration at notion.so/my-integrations and share the parent page with it."),
      requireEnv(env, "NOTION_PARENT_PAGE_ID", "The id of the Notion page the board should live under (share it with the integration)."),
      o.title ?? `${kit.brand.short_name ?? kit.brand.name} · Content board`,
    );
    console.log(out);
  });

program.parseAsync(process.argv).catch((err: unknown) => {
  if (err instanceof ZodError) {
    log.error("Validation failed:");
    for (const issue of err.issues) log.error(`  ${issue.path.join(".") || "(root)"}: ${issue.message}`);
  } else {
    log.error((err as Error).message);
  }
  process.exit(1);
});
