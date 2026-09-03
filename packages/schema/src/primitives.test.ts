import { describe, expect, it } from "bun:test";
import { Schema } from "effect";
import { NonEmptyString, NonNegativeInt } from "./primitives.js";

describe("schema primitives", () => {
  it("accepts the canonical values", () => {
    expect(Schema.is(NonEmptyString)("lootlog")).toBe(true);
    expect(Schema.is(NonNegativeInt)(0)).toBe(true);
  });

  it("rejects empty strings, negative numbers, and fractions", () => {
    expect(Schema.is(NonEmptyString)("")).toBe(false);
    expect(Schema.is(NonNegativeInt)(-1)).toBe(false);
    expect(Schema.is(NonNegativeInt)(1.5)).toBe(false);
  });
});
