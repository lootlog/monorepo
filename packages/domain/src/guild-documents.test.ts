import { expect, test } from "bun:test";
import { createEmptyGuildDocumentContent } from "./guild-documents.js";

test("document defaults are independent mutable editor trees", () => {
  const first = createEmptyGuildDocumentContent();
  const second = createEmptyGuildDocumentContent();
  first.root.children.length = 0;
  expect(second.root.children).toHaveLength(1);
  expect(second.root.children[0]?.type).toBe("paragraph");
});
