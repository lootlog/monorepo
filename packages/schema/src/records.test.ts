import { describe, expect, test } from "bun:test";
import { isObjectRecord, isRecord } from "./records.js";

describe("record boundary policies", () => {
  test("retains the legacy distinction between arrays and non-array records", () => {
    for (const value of [null, undefined, 0, "", true, () => undefined]) {
      expect(isRecord(value)).toBe(false);
      expect(isObjectRecord(value)).toBe(false);
    }
    for (const value of [{}, Object.create(null), new Date(), new Map()]) {
      expect(isRecord(value)).toBe(true);
      expect(isObjectRecord(value)).toBe(true);
    }
    expect(isRecord([])).toBe(false);
    expect(isObjectRecord([])).toBe(true);
  });
});
