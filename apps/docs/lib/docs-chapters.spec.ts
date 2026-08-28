import { describe, expect, it } from "vitest";
import {
  docsPaths,
  getChapterBySeparator,
  getChapterBySlug,
  getDocsPath,
} from "./docs-chapters";

describe("documentation routes and chapters", () => {
  it("maps the index and document slugs to public URLs", () => {
    expect(getDocsPath("index")).toBe("/docs");
    expect(getDocsPath("installation")).toBe("/docs/installation");
    expect(docsPaths).toContain("/docs/battle-panel-mechanics");
    expect(new Set(docsPaths).size).toBe(docsPaths.length);
  });

  it("selects chapters from route slugs", () => {
    expect(getChapterBySlug().id).toBe("start");
    expect(getChapterBySlug(["battle-panel"]).id).toBe("panel");
    expect(getChapterBySlug(["settings"]).id).toBe("clan");
    expect(getChapterBySlug(["faq"]).id).toBe("help");
  });

  it("maps page tree separators to the matching chapter", () => {
    expect(getChapterBySeparator("03 · Panel")?.id).toBe("panel");
    expect(getChapterBySeparator("unknown")).toBeUndefined();
    expect(getChapterBySeparator(null)).toBeUndefined();
  });
});
