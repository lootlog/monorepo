import { describe, expect, it } from "bun:test";
import { Effect, Layer, Schema } from "effect";
import { SettingsDocumentsResponseSchema } from "@lootlog/schema/settings-documents";
import {
  getPreferences,
  patchPreferences,
  SettingsAccessDenied,
  SettingsData,
  SettingsIdentity,
} from "./preferences.operations.js";

const timestamp = "2026-09-02T12:00:00.000Z";

const makeData = (overrides: Partial<SettingsData["Service"]> = {}) =>
  SettingsData.of({
    getGuildPreferences: () => Effect.succeed({ guilds: {} }),
    getPreferences: () => Effect.succeed({ domains: {} }),
    patchPreferences: () => Effect.succeed({ domains: {} }),
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
  it("fails closed before reading settings without an authenticated user", async () => {
    const denied = new SettingsAccessDenied({
      status: 401,
      code: "AUTH_REQUIRED",
    });

    let dataCalled = false;

    const layer = provideServices(
      makeData({
        getPreferences: () => {
          dataCalled = true;

          return Effect.succeed({ domains: {} });
        },
      }),
      SettingsIdentity.of({ userId: Effect.fail(denied) }),
    );

    const error = await Effect.runPromise(
      Effect.flip(
        getPreferences({ domains: "appearance" }).pipe(Effect.provide(layer)),
      ),
    );

    expect(error).toBe(denied);
    expect(dataCalled).toBe(false);
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
      Schema.encodeEffect(SettingsDocumentsResponseSchema)(response),
    );

    expect(response.domains.appearance?.updatedAt).toBe(updatedAt);
    expect(encoded.domains.appearance?.updatedAt).toBe(timestamp);
    expect(encoded.domains.appearance?.layers[0]?.updatedAt).toBe(timestamp);
  });
});
