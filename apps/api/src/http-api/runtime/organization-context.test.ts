import { expect, test } from "bun:test";
import { Effect } from "effect";
import { Permission } from "@lootlog/schema/permissions";
import {
  OrganizationContextLookup,
  OrganizationNotFound,
  type OrganizationContext,
} from "./organization-context.js";

const identity = {
  userId: "user-1",
  discordId: "discord-1",
  guildId: "guild-alias",
} as const;

const context = {
  guildId: "guild-canonical",
  ownerId: "discord-owner",
  permissions: [Permission.ADMIN],
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
  member: {
    id: 1,
    userId: "discord-1",
    guildId: "guild-canonical",
    type: "USER",
    name: "Member",
    avatar: null,
    banner: null,
    active: true,
    globalUserId: "user-1",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    lastDiscordSyncAt: new Date("2026-01-01T00:00:00.000Z"),
    lastDiscordAttemptAt: null,
    lastDiscordStatus: null,
    roles: [],
  },
  roles: [],
} satisfies OrganizationContext;

const runLookup = (lookup: OrganizationContextLookup["Service"]["lookup"]) =>
  Effect.flatMap(OrganizationContextLookup, (service) =>
    service.lookup(identity),
  ).pipe(
    Effect.provide(
      OrganizationContextLookup.layerTest(
        OrganizationContextLookup.of({ lookup }),
      ),
    ),
  );

test("returns the canonical Organization context from the lookup module", async () => {
  const value = await Effect.runPromise(
    runLookup(() => Effect.succeed(context)),
  );
  expect(value).toMatchObject({
    guildId: "guild-canonical",
    ownerId: "discord-owner",
    permissions: [Permission.ADMIN],
  });
});

test("preserves missing or inactive membership as an authorization miss", async () => {
  expect(
    await Effect.runPromise(runLookup(() => Effect.succeed(null))),
  ).toBeNull();
});

test("keeps a hidden Organization as a typed not-found", async () => {
  const error = await Effect.runPromise(
    Effect.flip(
      runLookup(() =>
        Effect.fail(new OrganizationNotFound({ guildId: identity.guildId })),
      ),
    ),
  );
  expect(error).toBeInstanceOf(OrganizationNotFound);
  expect(error.guildId).toBe("guild-alias");
});
