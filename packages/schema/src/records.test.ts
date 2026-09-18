import { Predicate } from "effect";
import { describe, expect, test } from "bun:test";
import { isObjectRecord } from "./records.js";

describe("record boundary policies", () => {
  test("retains the legacy distinction between arrays and non-array records", () => {
    for (const value of [null, undefined, 0, "", true, () => undefined]) {
      expect(Predicate.isObject(value)).toBe(false);
      expect(isObjectRecord(value)).toBe(false);
    }

    for (const value of [{}, Object.create(null), new Date(), new Map()]) {
      expect(Predicate.isObject(value)).toBe(true);
      expect(isObjectRecord(value)).toBe(true);
    }

    expect(Predicate.isObject([])).toBe(false);
    expect(isObjectRecord([])).toBe(true);
  });
});
