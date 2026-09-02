import * as z from "zod";
import {
  isoDatetimeCodec,
  jsonValueSchema,
  nullableFlexibleIsoDatetimeCodec,
} from "./zod-response-codecs.js";

describe("response codecs", () => {
  it("round-trips ISO datetimes", () => {
    const encoded = "2026-09-02T00:00:00.000Z";
    const decoded = z.decode(isoDatetimeCodec, encoded);

    expect(decoded).toEqual(new Date(encoded));
    expect(z.encode(isoDatetimeCodec, decoded)).toBe(encoded);
  });

  it("preserves already encoded flexible nullable datetimes", () => {
    const encoded = "2026-09-02T00:00:00.000Z";

    expect(z.encode(nullableFlexibleIsoDatetimeCodec, encoded)).toBe(encoded);
    expect(z.encode(nullableFlexibleIsoDatetimeCodec, null)).toBeNull();
  });

  it("accepts structural JSON and rejects non-JSON values", () => {
    expect(jsonValueSchema.parse({ nested: ["value", 1, true, null] })).toEqual(
      { nested: ["value", 1, true, null] },
    );
    expect(jsonValueSchema.safeParse(new Date()).success).toBe(false);
    expect(jsonValueSchema.safeParse(undefined).success).toBe(false);
  });
});
