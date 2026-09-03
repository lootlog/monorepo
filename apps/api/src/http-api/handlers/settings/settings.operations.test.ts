import { describe, expect, it } from "bun:test";
import { Effect, Layer, Schema } from "effect";
import { SettingsDocumentsControllerGetPreferences200 } from "../../contracts/preferences/schemas.js";
import { SoundSettingsControllerGetSettings200 } from "../../contracts/sound-settings/schemas.js";
import { TimerSettingsControllerGetGlobalSettings200 } from "../../contracts/timer-settings/schemas.js";
import { makeSoundSettings } from "#src/sound-settings/sound-settings.service";
import { makeTimerSettings } from "#src/timer-settings/timer-settings.service";
import {
  getGlobalTimerSettings,
  getPreferences,
  getSoundSettings,
  patchPreferences,
  SettingsAccessDenied,
  SettingsData,
  SettingsIdentity,
  updateGuildTimerSettings,
} from "./settings.operations.js";

const timestamp = "2026-09-02T12:00:00.000Z";
const timerSettings = {
  userId: "user-a",
  generalConfig: {},
  displayConfig: {},
  customColors: {},
  timersColors: {},
  alwaysVisibleExpiredTimers: {},
  defaultColorNames: {},
  overriddenDefaultColors: {},
  hiddenDefaultColors: [],
  timerFiltersEnabled: false,
  colorFiltersEnabled: false,
  timersSortOrder: "asc" as const,
  syncEnabled: true,
  createdAt: timestamp,
  updatedAt: timestamp,
};
const soundSettings = {
  userId: "user-a",
  masterVolume: 0.5,
  notificationsVolume: 0.5,
  detectorVolume: 0.5,
  timersVolume: 0.5,
  pingsVolume: 0,
  notificationsConfig: {},
  detectorConfig: {},
  timersConfig: {},
  createdAt: timestamp,
  updatedAt: timestamp,
};

const makeData = (overrides: Partial<SettingsData["Service"]> = {}) =>
  SettingsData.of({
    getGlobalTimerSettings: () => Effect.succeed(timerSettings),
    updateGlobalTimerSettings: () => Effect.succeed(timerSettings),
    getGuildTimerSettings: () => Effect.succeed({}),
    updateGuildTimerSettings: () => Effect.succeed({}),
    migrateTimerSettings: () => Effect.succeed({ message: "ok" }),
    getPreferences: () => Effect.succeed({ domains: {} }),
    patchPreferences: () => Effect.succeed({ domains: {} }),
    getSoundSettings: () => Effect.succeed(soundSettings),
    updateSoundSettings: () => Effect.succeed(soundSettings),
    ...overrides,
  });

const provideServices = (
  data: SettingsData["Service"],
  identity: SettingsIdentity["Service"] = SettingsIdentity.of({
    userId: Effect.succeed("user-a"),
  }),
) =>
  Layer.merge(
    Layer.succeed(SettingsData, data),
    Layer.succeed(SettingsIdentity, identity),
  );

describe("settings HttpApi handlers", () => {
  it("decodes timer and sound responses with the HTTP contracts", async () => {
    const settingsDocuments = {
      getPreferences: () => Effect.succeed({ domains: {} }),
      patchPreferences: () => Effect.succeed({ domains: {} }),
      parseDomains: () => Effect.succeed([]),
    };
    const timerService = makeTimerSettings(settingsDocuments);
    const soundService = makeSoundSettings(settingsDocuments);
    const layer = provideServices(
      makeData({
        getGlobalTimerSettings: (userId) =>
          timerService.getGlobalSettings(userId).pipe(Effect.orDie),
        getSoundSettings: (userId) =>
          soundService.getSettings(userId).pipe(Effect.orDie),
      }),
    );
    const [timers, sounds] = await Effect.runPromise(
      Effect.all([getGlobalTimerSettings(), getSoundSettings()]).pipe(
        Effect.provide(layer),
      ),
    );

    expect(Schema.is(TimerSettingsControllerGetGlobalSettings200)(timers)).toBe(
      true,
    );
    expect(Schema.is(SoundSettingsControllerGetSettings200)(sounds)).toBe(true);
  });

  it("fails closed before reading settings without an authenticated user", async () => {
    const denied = new SettingsAccessDenied({
      status: 401,
      code: "AUTH_REQUIRED",
    });
    let dataCalled = false;
    const layer = provideServices(
      makeData({
        getSoundSettings: () => {
          dataCalled = true;
          return Effect.succeed(soundSettings);
        },
      }),
      SettingsIdentity.of({ userId: Effect.fail(denied) }),
    );

    const error = await Effect.runPromise(
      Effect.flip(getSoundSettings().pipe(Effect.provide(layer))),
    );

    expect(error).toBe(denied);
    expect(dataCalled).toBe(false);
  });

  it("passes the authenticated user and guild scope to timer mutations", async () => {
    const calls: Array<[string, string]> = [];
    const layer = provideServices(
      makeData({
        updateGuildTimerSettings: (userId, guildId) => {
          calls.push([userId, guildId]);
          return Effect.succeed({
            userId,
            guildId,
            hiddenTimers: [],
            pinnedTimers: [],
            createdAt: timestamp,
            updatedAt: timestamp,
          });
        },
      }),
    );

    await Effect.runPromise(
      updateGuildTimerSettings("guild-a", {}).pipe(Effect.provide(layer)),
    );

    expect(calls).toEqual([["user-a", "guild-a"]]);
  });

  it("delegates a multi-domain preference patch as one atomic operation", async () => {
    let calls = 0;
    const payload = {
      operations: [
        {
          domain: "timers" as const,
          scope: { type: "USER" as const, id: "user-a" },
          set: { syncEnabled: true },
          unset: [],
        },
      ],
    };
    const layer = provideServices(
      makeData({
        patchPreferences: () => {
          calls += 1;
          return Effect.succeed({ domains: {} });
        },
      }),
    );

    await Effect.runPromise(
      patchPreferences(payload).pipe(Effect.provide(layer)),
    );

    expect(calls).toBe(1);
  });

  it("keeps Date values in the handler and encodes the existing HTTP JSON", async () => {
    const updatedAt = new Date(timestamp);
    const layer = provideServices(
      makeData({
        getPreferences: () =>
          Effect.succeed({
            domains: {
              appearance: {
                effective: { compact: null },
                layers: [
                  {
                    scope: { type: "USER", id: "user-a" },
                    overrides: { compact: null },
                    schemaVersion: 1,
                    updatedAt,
                  },
                ],
                sources: { compact: "DEFAULT" },
                schemaVersion: 1,
                updatedAt,
              },
            },
          }),
      }),
    );

    const response = await Effect.runPromise(
      getPreferences({ domains: "appearance" }).pipe(Effect.provide(layer)),
    );
    const encoded = await Effect.runPromise(
      Schema.encodeEffect(SettingsDocumentsControllerGetPreferences200)(
        response,
      ),
    );

    expect(response.domains.appearance?.updatedAt).toBe(updatedAt);
    expect(encoded.domains.appearance?.updatedAt).toBe(timestamp);
    expect(encoded.domains.appearance?.layers[0]?.updatedAt).toBe(timestamp);
  });
});
