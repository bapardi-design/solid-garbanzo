import { describe, expect, it } from "vitest";
import { renderTemplate, escapeHtml } from "../src/util/template.js";

describe("renderTemplate", () => {
  it("replaces nested paths and escapes html", () => {
    const { html, missing } = renderTemplate("<h1>{{a.b}}</h1>{{{raw}}}", { a: { b: "<b>&" }, raw: "<i>x</i>" });
    expect(html).toBe("<h1>&lt;b&gt;&amp;</h1><i>x</i>");
    expect(missing).toEqual([]);
  });
  it("reports missing values and renders them empty", () => {
    const { html, missing } = renderTemplate("[{{nope.x}}]", {});
    expect(html).toBe("[]");
    expect(missing).toEqual(["nope.x"]);
  });
  it("escapes quotes", () => {
    expect(escapeHtml(`"'`)).toBe("&quot;&#39;");
  });
});
