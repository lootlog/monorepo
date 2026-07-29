import { describe, expect, it } from "vitest";
import { stableStringify } from "./stable-stringify";

describe("stableStringify", () => {
  it("sorts object keys recursively", () => {
    expect(
      stableStringify({
        z: 1,
        nested: { second: true, first: false },
        a: 2,
      }),
    ).toBe('{"a":2,"nested":{"first":false,"second":true},"z":1}');
  });

  it("matches JSON semantics for undefined array and object values", () => {
    expect(stableStringify([1, undefined, 3])).toBe("[1,null,3]");
    expect(stableStringify({ included: true, omitted: undefined })).toBe(
      '{"included":true}',
    );
  });
});
