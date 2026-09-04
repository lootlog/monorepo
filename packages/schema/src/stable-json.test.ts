import { expect, test } from "bun:test";
import { stableJsonStringify } from "./stable-json.js";

test("serializes nested objects with stable key order", () => {
  expect(stableJsonStringify({ z: { b: 2, a: 1 }, a: true })).toBe(
    '{"a":true,"z":{"a":1,"b":2}}',
  );
  expect(stableJsonStringify(undefined)).toBe("undefined");
});
