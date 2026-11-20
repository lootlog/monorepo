import { describe, expect, it } from "vitest";
import { queryClient } from "@/lib/query-client";
import { seedSettingsDocumentValues } from "@/test/settings-documents-fixtures";
import { readSoundSettings } from "./use-sound-settings";

describe("readSoundSettings", () => {
  it("normalizes legacy sound JSON without treating malformed entries as settings", () => {
    queryClient.clear();
    seedSettingsDocumentValues(queryClient, {
      "sounds.notificationsConfig": {
        HERO: { volume: "0.25", soundUrl: "custom.mp3" },
        TITAN: { volume: "invalid", soundUrl: false },
        ELITE: null,
        ELITE2: [],
      },
      "sounds.detectorConfig": false,
      "sounds.timersConfig": null,
    });

    const result = readSoundSettings();

    expect(result?.notificationsConfig).toEqual({
      HERO: { volume: 0.25, soundUrl: "custom.mp3" },
      TITAN: { volume: 0.5, soundUrl: "" },
    });
    expect(result?.detectorConfig).toEqual({});
    expect(result?.timersConfig).toEqual({});
  });
});
