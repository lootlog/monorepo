import { describe, expect, it } from "bun:test";
import { parseFiniteNumber } from "./numbers.js";

describe("parseFiniteNumber", () => {
  it("accepts finite numbers and JavaScript numeric strings", () => {
    for (const [input, expected] of [
      [0, 0],
      [-3.5, -3.5],
      [" 12.5 ", 12.5],
      ["0x10", 16],
      ["1e2", 100],
    ] as const) {
      expect(parseFiniteNumber(input)).toBe(expected);
    }
  });

  it("rejects blanks, nonfinite numbers, and nonnumeric input without coercion", () => {
    for (const input of [
      "",
      " \t\n",
      "abc",
      "Infinity",
      Infinity,
      -Infinity,
      Number.NaN,
      null,
      undefined,
      true,
      [],
      {},
      { valueOf: () => 3 },
    ]) {
      expect(parseFiniteNumber(input)).toBeNull();
    }
  });
});
