import { expect, test } from "bun:test";
import { Effect } from "effect";
import { Permission } from "@lootlog/schema/permissions";
import {
  OrganizationContextLookup,
  OrganizationNotFound,
} from "./organization-context.js";

const identity = {
  userId: "user-1",
  discordId: "discord-1",
  guildId: "guild-alias",
} as const;

const runLookup = (
  getMemberContext: (options: typeof identity) => Promise<{
    guild: {
      id: string;
      name: string;
      icon: string | null;
      ownerId: string;
      vanityUrl: string | null;
      notificationRuleLimit: number;
      publicStatsCardEnabled: boolean;
      reservationMaxDurationMinutes: number;
      reservationMinDurationMinutes: number;
      reservationTimeGranularityMinutes: number;
      reservationMaxAdvanceDays: number;
      reservationActiveLimitPerSpot: number;
      documentLimit: number;
      createdAt: Date;
      updatedAt: Date;
      active: boolean;
    };
    member: unknown;
    roles: unknown[];
    permissions: Permission[];
  } | null>,
) =>
  Effect.flatMap(OrganizationContextLookup, (lookup) =>
    lookup.lookup(identity),
  ).pipe(
    Effect.provide(OrganizationContextLookup.layerLegacy({ getMemberContext })),
  );

test("preserves the legacy lookup while returning the canonical Organization id", async () => {
  const value = await Effect.runPromise(
    runLookup(() =>
      Promise.resolve({
        guild: {
          id: "guild-canonical",
          name: "Organization",
          icon: null,
          ownerId: "discord-owner",
          vanityUrl: "guild-alias",
          notificationRuleLimit: 20,
          publicStatsCardEnabled: false,
          reservationMaxDurationMinutes: 180,
          reservationMinDurationMinutes: 30,
          reservationTimeGranularityMinutes: 15,
          reservationMaxAdvanceDays: 7,
          reservationActiveLimitPerSpot: 3,
          documentLimit: 50,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
          active: true,
        },
        member: {},
        roles: [],
        permissions: [Permission.ADMIN],
      }),
    ),
  );

  expect(value).toEqual({
    guildId: "guild-canonical",
    ownerId: "discord-owner",
    permissions: [Permission.ADMIN],
  });
});

test("preserves missing or inactive membership as an authorization miss", async () => {
  expect(
    await Effect.runPromise(runLookup(() => Promise.resolve(null))),
  ).toBeNull();
});

test("isolates the legacy HTTP 404 as OrganizationNotFound", async () => {
  class LegacyNotFoundError extends Error {
    getStatus() {
      return 404;
    }
  }

  const error = await Effect.runPromise(
    Effect.flip(runLookup(() => Promise.reject(new LegacyNotFoundError()))),
  );

  expect(error).toBeInstanceOf(OrganizationNotFound);
  expect(error.guildId).toBe("guild-alias");
});

test("keeps unexpected legacy failures as defects", async () => {
  const promise = Effect.runPromise(
    runLookup(() => Promise.reject(new Error("database unavailable"))),
  );

  await expect(promise).rejects.toThrow("database unavailable");
});
