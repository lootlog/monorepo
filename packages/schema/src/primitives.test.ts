import { describe, expect, it } from "bun:test";
import { Schema } from "effect";
import { NonNegativeInt } from "./primitives.js";

describe("schema primitives", () => {
  it("accepts the canonical values", () => {
    expect(Schema.is(NonNegativeInt)(0)).toBe(true);
  });

  it("rejects negative numbers and fractions", () => {
    expect(Schema.is(NonNegativeInt)(-1)).toBe(false);
    expect(Schema.is(NonNegativeInt)(1.5)).toBe(false);
  });
});
