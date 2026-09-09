/**
 * Timezone helpers without a dependency. Dates in the content plan are local
 * wall-clock times in the brand's timezone; we store ISO timestamps with offset.
 */
function tzOffsetMinutes(utcDate: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(utcDate);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - utcDate.getTime()) / 60000);
}

/** Convert "YYYY-MM-DD" + "HH:MM" in `timeZone` to an ISO string with offset. */
export function zonedToIso(date: string, time: string, timeZone: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  if (!y || !m || !d || Number.isNaN(hh) || Number.isNaN(mm)) {
    throw new Error(`Invalid date/time: ${date} ${time}`);
  }
  const naive = Date.UTC(y, m - 1, d, hh, mm, 0);
  // Two-pass correction handles DST edges well enough for scheduling.
  let offset = tzOffsetMinutes(new Date(naive), timeZone);
  offset = tzOffsetMinutes(new Date(naive - offset * 60000), timeZone);
  const utc = new Date(naive - offset * 60000);
  const sign = offset >= 0 ? "+" : "-";
  const abs = Math.abs(offset);
  const pad = (n: number) => String(n).padStart(2, "0");
  const local = new Date(utc.getTime() + offset * 60000);
  return (
    `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}` +
    `T${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}:00` +
    `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  );
}

export function isDue(iso: string, now: Date, windowMinutes: number): boolean {
  const t = new Date(iso).getTime();
  return t <= now.getTime() + windowMinutes * 60000;
}

export function formatLocal(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone, weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(new Date(iso));
}
