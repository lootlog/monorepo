import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { createSettingsDocuments } from "@/test/settings-documents-fixtures";
import {
  decodeGuildSettingsDocuments,
  decodeSettingsDocuments,
} from "./settings-documents";

describe("settings response validation", () => {
  it("preserves JSON settings and rejects invalid document metadata before caching", () => {
    const documents = createSettingsDocuments({
      "general.allowWorldSelection": true,
    });

    expect(decodeSettingsDocuments(documents)).toEqual(documents);
    expect(
      decodeGuildSettingsDocuments({ guilds: { guild: documents } }),
    ).toEqual({ guilds: { guild: documents } });

    const resolution = documents.domains.general;

    for (const invalid of [
      { schemaVersion: 0 },
      { schemaVersion: Number.MAX_SAFE_INTEGER + 1 },
      { updatedAt: "2026-02-30T00:00:00Z" },
      { sources: { allowWorldSelection: { type: "USER", id: "" } } },
      { effective: { allowWorldSelection: undefined } },
    ]) {
      expect(() =>
        decodeSettingsDocuments({
          domains: { general: { ...resolution, ...invalid } },
        }),
      ).toThrow(Schema.SchemaError);
    }
  });
});
