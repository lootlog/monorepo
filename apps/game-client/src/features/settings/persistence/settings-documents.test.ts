import { describe, expect, it } from "vitest";
import { createSettingsDocuments } from "@/test/settings-documents-fixtures";
import {
  guildSettingsDocumentsSchema,
  settingsDocumentsSchema,
} from "./settings-documents";

describe("settings response validation", () => {
  it("preserves JSON settings and rejects invalid document metadata before caching", () => {
    const documents = createSettingsDocuments({
      "general.allowWorldSelection": true,
    });

    expect(settingsDocumentsSchema.parse(documents)).toEqual(documents);
    expect(
      guildSettingsDocumentsSchema.parse({ guilds: { guild: documents } }),
    ).toEqual({ guilds: { guild: documents } });

    const resolution = documents.domains.general;

    for (const invalid of [
      { schemaVersion: 0 },
      { schemaVersion: Number.MAX_SAFE_INTEGER + 1 },
      { updatedAt: "2026-02-30T00:00:00Z" },
      { sources: { allowWorldSelection: { type: "USER", id: "" } } },
      { effective: { allowWorldSelection: undefined } },
    ]) {
      expect(
        settingsDocumentsSchema.safeParse({
          domains: { general: { ...resolution, ...invalid } },
        }).success,
      ).toBe(false);
    }
  });
});
