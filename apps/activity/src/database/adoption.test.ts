import { describe, expect, it } from "bun:test";
import {
  ACTIVITY_SCHEMA_FINGERPRINT,
  acceptedActivitySchemaShape,
  isAcceptedActivitySchema,
} from "./adoption.js";

describe("Activity database adoption", () => {
  it("pins a deterministic legacy fingerprint", () => {
    expect(ACTIVITY_SCHEMA_FINGERPRINT).toMatch(/^[a-f0-9]{64}$/);
    expect(isAcceptedActivitySchema(acceptedActivitySchemaShape)).toBe(true);
  });

  it("fails closed when an index or retention policy differs", () => {
    expect(
      isAcceptedActivitySchema({
        ...acceptedActivitySchemaShape,
        indexes: acceptedActivitySchemaShape.indexes.slice(1),
      }),
    ).toBe(false);
    expect(
      isAcceptedActivitySchema({
        ...acceptedActivitySchemaShape,
        timescale: {
          ...acceptedActivitySchemaShape.timescale,
          retention: "14 days",
        },
      }),
    ).toBe(false);
  });
});
