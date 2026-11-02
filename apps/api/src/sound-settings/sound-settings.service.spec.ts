import type { SettingsDomainResolution } from "@lootlog/schema/settings-documents";
import { describe, expect, it, vi } from "bun:test";
import { Effect, Schema } from "effect";
import { makeSoundSettings } from "./sound-settings.service.js";

const createResolution = (
  effective: Record<string, typeof Schema.Json.Type> = {},
): SettingsDomainResolution => ({
  effective,
  layers: [],
  sources: {},
  schemaVersion: 1,
  updatedAt: new Date("2026-07-24T00:00:00.000Z"),
});

const createSettingsDocumentsMock = (
  effective: Record<string, typeof Schema.Json.Type> = {},
) => {
  let currentEffective = effective;

  const getPreferences = vi.fn(() =>
    Effect.succeed({
      domains: { sounds: createResolution(currentEffective) },
    }),
  );

  const patchPreferences = vi.fn<
    Parameters<typeof makeSoundSettings>[0]["patchPreferences"]
  >((_userId, payload) => {
    const operation = payload.operations[0];
    currentEffective = {
      ...currentEffective,
      ...Schema.decodeUnknownSync(Schema.Record(Schema.String, Schema.Json))(
        operation.set,
      ),
    };

    return Effect.succeed({
      domains: { sounds: createResolution(currentEffective) },
    });
  });

  return {
    parseDomains: () => {
      throw new Error("Unexpected domain parser");
    },
    parseGuildIds: () => {
      throw new Error("Unexpected guild id parser");
    },
    applyOperations: () => Effect.die("Unexpected batch write"),
    getGuildPreferences: () => Effect.die("Unexpected guild preferences read"),
    getPreferences,
    patchPreferences,
  };
};

describe("sound settings Effect module", () => {
  it("returns normalized document defaults", async () => {
    const settingsDocuments = createSettingsDocumentsMock();
    const service = makeSoundSettings(settingsDocuments);

    await expect(
      Effect.runPromise(service.getSettings("user-1")),
    ).resolves.toMatchObject({
      userId: "user-1",
      masterVolume: 0.5,
      notificationsVolume: 0.5,
      pingsVolume: 0,
      notificationsConfig: {
        ELITE2: { volume: 0.5, soundUrl: "" },
        message: { volume: 0.5, soundUrl: "" },
      },
    });
  });

  it("writes synchronized category settings to the sounds document", async () => {
    const settingsDocuments = createSettingsDocumentsMock({
      notificationsVolume: 0.5,
    });

    const service = makeSoundSettings(settingsDocuments);

    await Effect.runPromise(
      service.updateSettings("user-1", {
        notificationsVolume: 0.8,
        pingsVolume: 0.4,
      }),
    );

    expect(settingsDocuments.patchPreferences).toHaveBeenCalledWith("user-1", {
      operations: [
        {
          domain: "sounds",
          scope: { type: "USER", id: "user-1" },
          set: {
            notificationsVolume: 0.8,
            pingsVolume: 0.4,
          },
          unset: [],
        },
      ],
    });
  });

  it.each(["notificationsConfig", "detectorConfig", "timersConfig"] as const)(
    "writes only the changed %s leaves so the stored volume is merged by path",
    async (configKey) => {
      const settingsDocuments = createSettingsDocumentsMock({
        [configKey]: {
          HERO: {
            volume: 0.35,
            soundUrl: "https://example.com/hero.mp3",
          },
        },
      });

      const service = makeSoundSettings(settingsDocuments);

      await Effect.runPromise(
        service.updateSettings("user-1", {
          [configKey]: {
            HERO: { soundUrl: "" },
          },
        }),
      );

      expect(settingsDocuments.patchPreferences).toHaveBeenCalledWith(
        "user-1",
        expect.objectContaining({
          operations: [
            expect.objectContaining({
              set: { [configKey]: { HERO: { soundUrl: "" } } },
            }),
          ],
        }),
      );
      expect(settingsDocuments.getPreferences).not.toHaveBeenCalled();
    },
  );

  it("does not persist device-local master volume", async () => {
    const settingsDocuments = createSettingsDocumentsMock();
    const service = makeSoundSettings(settingsDocuments);

    await Effect.runPromise(
      service.updateSettings("user-1", { masterVolume: 0.9 }),
    );

    expect(settingsDocuments.patchPreferences).not.toHaveBeenCalled();
  });
});
