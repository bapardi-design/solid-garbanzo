import { describe, expect, it } from "vitest";
import { isDue, zonedToIso } from "../src/util/time.js";

describe("zonedToIso", () => {
  it("applies summer time offset for Europe/Berlin", () => {
    expect(zonedToIso("2026-09-14", "09:00", "Europe/Berlin")).toBe("2026-09-14T09:00:00+02:00");
  });
  it("applies winter time offset", () => {
    expect(zonedToIso("2026-12-01", "09:00", "Europe/Berlin")).toBe("2026-12-01T09:00:00+01:00");
  });
  it("handles UTC and negative offsets", () => {
    expect(zonedToIso("2026-01-05", "18:30", "UTC")).toBe("2026-01-05T18:30:00+00:00");
    expect(zonedToIso("2026-01-05", "18:30", "America/New_York")).toBe("2026-01-05T18:30:00-05:00");
  });
  it("rejects garbage", () => {
    expect(() => zonedToIso("2026-1", "9", "UTC")).toThrow();
  });
});

describe("isDue", () => {
  const now = new Date("2026-09-14T07:00:00Z");
  it("is due when scheduled time is within the window", () => {
    expect(isDue("2026-09-14T09:00:00+02:00", now, 30)).toBe(true);   // exactly now
    expect(isDue("2026-09-14T09:20:00+02:00", now, 30)).toBe(true);   // 20 min ahead
    expect(isDue("2026-09-14T09:45:00+02:00", now, 30)).toBe(false);  // 45 min ahead
    expect(isDue("2026-09-10T09:00:00+02:00", now, 30)).toBe(true);   // overdue
  });
});
