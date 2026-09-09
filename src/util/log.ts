const quiet = process.env.AUTOPILOT_QUIET === "1";
export const log = {
  info: (msg: string) => { if (!quiet) console.log(msg); },
  step: (msg: string) => { if (!quiet) console.log(`\n▸ ${msg}`); },
  ok: (msg: string) => { if (!quiet) console.log(`  ✓ ${msg}`); },
  warn: (msg: string) => console.warn(`  ! ${msg}`),
  error: (msg: string) => console.error(`  ✗ ${msg}`),
};
