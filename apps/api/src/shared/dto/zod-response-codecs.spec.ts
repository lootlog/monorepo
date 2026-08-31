import { describe, expect, it } from "vitest";
import { isoDatetimeCodec } from "./zod-response-codecs.js";
import { dateToTemporal } from "#src/db/temporal";

describe("isoDatetimeCodec", () => {
  it("encodes database timestamps as ISO datetimes", () => {
    const timestamp = dateToTemporal(new Date("2026-08-31T21:14:23.123Z"));

    expect(isoDatetimeCodec.encode(timestamp)).toBe("2026-08-31T21:14:23.123Z");
  });
});
