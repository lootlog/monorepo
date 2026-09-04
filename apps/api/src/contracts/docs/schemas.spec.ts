import { describe, expect, it } from "bun:test";
import { Schema } from "effect";
import { UpdateDocumentRequest } from "./schemas.js";

describe("document content contract", () => {
  it("preserves nested editor content without accepting extra request fields", () => {
    const content = {
      root: {
        children: [
          { text: "Guide", format: 1, nested: [null, true, { marks: [] }] },
        ],
      },
    };
    expect(
      Schema.decodeUnknownSync(UpdateDocumentRequest)({
        title: "Guide",
        content,
        ignored: true,
      }),
    ).toEqual({ title: "Guide", content });
  });

  it.each([undefined, Number.NaN, Number.POSITIVE_INFINITY, () => null])(
    "rejects non-JSON values nested inside editor content: %s",
    (invalid) => {
      expect(() =>
        Schema.decodeUnknownSync(UpdateDocumentRequest)({
          title: "Guide",
          content: { root: [{ nested: { invalid } }] },
        }),
      ).toThrow();
    },
  );
});
