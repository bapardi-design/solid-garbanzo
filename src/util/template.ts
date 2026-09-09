/**
 * Tiny mustache-style renderer for the HTML design templates.
 *   {{a.b.c}}   -> HTML-escaped value
 *   {{{a.b.c}}} -> raw value
 * Missing values render as an empty string (and are reported via `missing`).
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function lookup(data: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, data);
}

export function renderTemplate(source: string, data: unknown): { html: string; missing: string[] } {
  const missing = new Set<string>();
  const html = source
    .replace(/\{\{\{\s*([\w.]+)\s*\}\}\}/g, (_, path: string) => {
      const v = lookup(data, path);
      if (v === undefined) missing.add(path);
      return String(v ?? "");
    })
    .replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path: string) => {
      const v = lookup(data, path);
      if (v === undefined) missing.add(path);
      return escapeHtml(v);
    });
  return { html, missing: [...missing] };
}
