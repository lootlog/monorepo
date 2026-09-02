import type { SettingsDomainResolution } from "@lootlog/schema/settings-documents";
import { describe, expect, it, vi } from "#test/bun-test";
import { Effect } from "effect";
import { makeSoundSettings } from "./sound-settings.service.js";

const createResolution = (
  effective: Record<string, unknown> = {},
): SettingsDomainResolution => ({
  effective,
  layers: [],
  sources: {},
  schemaVersion: 1,
  updatedAt: "2026-07-24T00:00:00.000Z",
});

const createSettingsDocumentsMock = (
  effective: Record<string, unknown> = {},
) => {
  let currentEffective = effective;
  const getPreferences = vi.fn(() =>
    Effect.succeed({
      domains: { sounds: createResolution(currentEffective) },
    }),
  );
  const patchPreferences = vi.fn((_userId, payload) => {
    const operation = payload.operations[0];
    currentEffective = {
      ...currentEffective,
      ...operation.set,
    };

    return Effect.succeed({
      domains: { sounds: createResolution(currentEffective) },
    });
  });

  return {
    getPreferences,
    patchPreferences,
  };
};

describe("sound settings Effect module", () => {
  it("returns normalized document defaults", async () => {
    const settingsDocuments = createSettingsDocumentsMock();
    const service = makeSoundSettings(settingsDocuments as never);

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
    const service = makeSoundSettings(settingsDocuments as never);

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

  it("merges partial sound configuration entries", async () => {
    const settingsDocuments = createSettingsDocumentsMock({
      notificationsConfig: {
        HERO: {
          volume: 0.35,
          soundUrl: "https://example.com/hero.mp3",
        },
      },
    });
    const service = makeSoundSettings(settingsDocuments as never);

    await Effect.runPromise(
      service.updateSettings("user-1", {
        notificationsConfig: {
          HERO: { soundUrl: "https://example.com/new-hero.mp3" },
        },
      }),
    );

    expect(settingsDocuments.patchPreferences).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        operations: [
          expect.objectContaining({
            set: {
              notificationsConfig: expect.objectContaining({
                HERO: {
                  volume: 0.35,
                  soundUrl: "https://example.com/new-hero.mp3",
                },
                ELITE2: { volume: 0.5, soundUrl: "" },
              }),
            },
          }),
        ],
      }),
    );
  });

  it("treats an empty sound URL as an explicit reset", async () => {
    const settingsDocuments = createSettingsDocumentsMock({
      detectorConfig: {
        TITAN: {
          volume: 0.4,
          soundUrl: "https://example.com/titan.mp3",
        },
      },
    });
    const service = makeSoundSettings(settingsDocuments as never);

    await Effect.runPromise(
      service.updateSettings("user-1", {
        detectorConfig: { TITAN: { soundUrl: "" } },
      }),
    );

    expect(settingsDocuments.patchPreferences).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        operations: [
          expect.objectContaining({
            set: expect.objectContaining({
              detectorConfig: expect.objectContaining({
                TITAN: { volume: 0.4, soundUrl: "" },
              }),
            }),
          }),
        ],
      }),
    );
  });

  it("does not persist device-local master volume", async () => {
    const settingsDocuments = createSettingsDocumentsMock();
    const service = makeSoundSettings(settingsDocuments as never);

    await Effect.runPromise(
      service.updateSettings("user-1", { masterVolume: 0.9 }),
    );

    expect(settingsDocuments.patchPreferences).not.toHaveBeenCalled();
  });
});
