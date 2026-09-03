import { describe, expect, it } from "bun:test";
import { Schema } from "effect";
import {
  PatchSettingsDocumentsSchema,
  SettingsDocumentsResponseSchema,
} from "./settings-documents.js";

const timestamp = "2026-09-03T00:00:00.000Z";

describe("settings documents HTTP codecs", () => {
  it("decodes request defaults into a total application value", () => {
    const decoded = Schema.decodeUnknownSync(PatchSettingsDocumentsSchema)({
      operations: [
        {
          domain: "appearance",
          scope: { type: "USER", id: "user-1" },
        },
      ],
    });

    expect(decoded.operations[0]).toEqual({
      domain: "appearance",
      scope: { type: "USER", id: "user-1" },
      set: {},
      unset: [],
    });
  });

  it("round-trips nested response dates through Date and ISO string", () => {
    const encoded = {
      domains: {
        appearance: {
          effective: { chat: { fontScalePercent: 110 }, compact: null },
          layers: [
            {
              scope: { type: "USER" as const, id: "user-1" },
              overrides: { chat: { fontScalePercent: 110 } },
              schemaVersion: 1,
              updatedAt: timestamp,
            },
          ],
          sources: {
            "chat.fontScalePercent": {
              type: "USER" as const,
              id: "user-1",
            },
            compact: "DEFAULT" as const,
          },
          schemaVersion: 1,
          updatedAt: timestamp,
        },
      },
    };

    const decoded = Schema.decodeUnknownSync(SettingsDocumentsResponseSchema)(
      encoded,
    );

    expect(decoded.domains.appearance?.updatedAt).toEqual(new Date(timestamp));
    expect(decoded.domains.appearance?.layers[0]?.updatedAt).toEqual(
      new Date(timestamp),
    );
    expect(Schema.encodeSync(SettingsDocumentsResponseSchema)(decoded)).toEqual(
      encoded,
    );
  });

  it("rejects empty request batches and invalid response dates", () => {
    expect(Schema.is(PatchSettingsDocumentsSchema)({ operations: [] })).toBe(
      false,
    );
    expect(() =>
      Schema.decodeUnknownSync(SettingsDocumentsResponseSchema)({
        domains: {
          appearance: {
            effective: {},
            layers: [],
            sources: {},
            schemaVersion: 1,
            updatedAt: "not-a-date",
          },
        },
      }),
    ).toThrow();
  });
});
