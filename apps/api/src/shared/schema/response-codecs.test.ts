import { IsoDateTime } from "@lootlog/schema/primitives";
import { describe, expect, it } from "bun:test";
import { Schema } from "effect";
import {
  flexibleIsoDatetimeCodec,
  jsonValueSchema,
} from "./response-codecs.js";

describe("response codecs", () => {
  it("round-trips dates through the existing ISO representation", () => {
    const wire = "2026-09-03T00:00:00.000Z";
    const decoded = Schema.decodeUnknownSync(IsoDateTime)(wire);
    expect(decoded).toEqual(new Date(wire));
    expect(Schema.encodeSync(IsoDateTime)(decoded)).toBe(wire);
  });

  it("accepts the transitional Date-or-ISO domain representation", () => {
    const wire = "2026-09-03T00:00:00.000Z";
    expect(Schema.encodeSync(flexibleIsoDatetimeCodec)(new Date(wire))).toBe(
      wire,
    );
    expect(Schema.encodeSync(flexibleIsoDatetimeCodec)(wire)).toBe(wire);
  });

  it("validates nested JSON values", () => {
    expect(
      Schema.decodeUnknownSync(jsonValueSchema)({ nested: [true, null, 1] }),
    ).toEqual({ nested: [true, null, 1] });
  });
});
