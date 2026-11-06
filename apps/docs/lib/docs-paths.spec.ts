import { describe, expect, it } from "vitest";
import { docsMarkdownPaths, docsPaths } from "./docs-paths";

describe("prerendered documentation paths", () => {
  it("serves the index at /docs and its Markdown where the .md route can match it", () => {
    expect(docsPaths).toContain("/docs");
    expect(docsPaths).not.toContain("/docs/index");
    expect(docsMarkdownPaths).toContain("/docs/index.md");
    expect(docsMarkdownPaths).not.toContain("/docs.md");
  });

  it("gives every page exactly one HTML and one Markdown path", () => {
    expect(docsMarkdownPaths).toHaveLength(docsPaths.length);
    expect(
      docsMarkdownPaths.every((path) => /^\/docs\/[a-z0-9-]+\.md$/u.test(path)),
    ).toBe(true);
  });
});
