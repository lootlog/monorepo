import { describe, expect, it } from "bun:test";
import {
  ACTIVITY_SCHEMA_FINGERPRINT,
  acceptedActivitySchemaMetadata,
  isAcceptedActivitySchema,
} from "./adoption.js";

describe("Activity database adoption", () => {
  it("pins a deterministic legacy fingerprint", () => {
    expect(ACTIVITY_SCHEMA_FINGERPRINT).toMatch(/^[a-f0-9]{64}$/);
    expect(isAcceptedActivitySchema(acceptedActivitySchemaMetadata)).toBe(true);
  });

  it("fails closed when an index or retention policy differs", () => {
    expect(
      isAcceptedActivitySchema({
        ...acceptedActivitySchemaMetadata,
        indexes: acceptedActivitySchemaMetadata.indexes.slice(1),
      }),
    ).toBe(false);
    expect(
      isAcceptedActivitySchema({
        ...acceptedActivitySchemaMetadata,
        timescale: {
          ...acceptedActivitySchemaMetadata.timescale,
          retention: "14 days",
        },
      }),
    ).toBe(false);
  });
});
