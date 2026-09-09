import { describe, expect, it } from "vitest";
import { loadEnv, stripEmpty } from "../src/config.js";

describe("env loading", () => {
  it("treats empty strings (as exported by GitHub Actions for unset vars) as unset", () => {
    expect(stripEmpty({ A: "", B: " ", C: "x", D: undefined })).toEqual({ C: "x" });
  });
  it("applies defaults when the workflow exports empty values", () => {
    const saved = { ...process.env };
    process.env.AUTOPILOT_MODEL = "";
    process.env.BOARD = "";
    process.env.STORAGE = "";
    process.env.PUBLISHER = "";
    try {
      const env = loadEnv();
      expect(env.AUTOPILOT_MODEL).toBe("claude-opus-5");
      expect(env.BOARD).toBe("local");
      expect(env.STORAGE).toBe("local");
      expect(env.PUBLISHER).toBe("dryrun");
    } finally {
      process.env = saved;
    }
  });
});
