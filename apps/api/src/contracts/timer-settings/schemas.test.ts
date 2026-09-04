import { describe, expect, it } from "bun:test";
import { Schema } from "effect";
import {
  MigrateTimerSettingsRequest,
  UpdateTimerSettingsRequest,
} from "./schemas.js";

describe("timer settings contracts", () => {
  it("retains display bounds and partial nested updates", () => {
    const decode = Schema.decodeUnknownSync(UpdateTimerSettingsRequest);
    expect(
      decode({
        displayConfig: { fontSize: 8, minColumnWidth: 500, unknown: true },
        generalConfig: { compactView: true },
      }),
    ).toEqual({
      displayConfig: { fontSize: 8, minColumnWidth: 500 },
      generalConfig: { compactView: true },
    });
    expect(() => decode({ displayConfig: { fontSize: 25 } })).toThrow();
    expect(() =>
      decode({ generalConfig: { removeTimerAfterMs: -1 } }),
    ).toThrow();
    expect(() => decode({ displayConfig: { fontSize: "12" } })).toThrow();
  });

  it("keeps migration data open to recursive JSON while validating conflict policy", () => {
    const decode = Schema.decodeUnknownSync(MigrateTimerSettingsRequest);
    expect(
      decode({
        localData: { experimental: { nested: [true, null, "x"] } },
        conflictResolution: "merge",
      }),
    ).toEqual({
      localData: { experimental: { nested: [true, null, "x"] } },
      conflictResolution: "merge",
    });
    expect(() =>
      decode({ localData: {}, conflictResolution: "replace" }),
    ).toThrow();
    expect(() => decode({ localData: { invalid: undefined } })).toThrow();
  });
});
