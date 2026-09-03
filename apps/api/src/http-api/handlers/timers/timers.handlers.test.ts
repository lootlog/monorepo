import { describe, expect, it } from "bun:test";
import { Effect, Layer, Schema } from "effect";
import { createAccessPolicy } from "@lootlog/domain/access-policy";
import { Permission } from "@lootlog/schema/permissions";
import type { Guild, Role } from "#src/timers/timers.types";
import {
  TimersControllerGetTimers200,
  TimersControllerResetTimer200,
  type CreateManualTimerDto,
  type ResetTimerDto,
} from "../../lootlog-api.js";
import {
  createManualGuildTimer,
  deleteGuildTimer,
  getGuildTimers,
  getGuildTimerHistory,
  resetGuildTimer,
  restoreGuildTimer,
  searchTimerNpcs,
  TimersAccessDenied,
  TimersAuthorization,
  TimersData,
  type TimersGuildAccess,
} from "./timers.handlers.js";

const now = new Date("2026-09-02T12:00:00.000Z");
const guild = {
  id: "guild-a",
  name: "Guild A",
  icon: null,
  ownerId: "owner-a",
  vanityUrl: null,
  notificationRuleLimit: 20,
  publicStatsCardEnabled: false,
  reservationMaxDurationMinutes: 180,
  reservationMinDurationMinutes: 30,
  reservationTimeGranularityMinutes: 15,
  reservationMaxAdvanceDays: 7,
  reservationActiveLimitPerSpot: 3,
  documentLimit: 50,
  createdAt: now,
  updatedAt: now,
  active: true,
} satisfies Guild;

const restrictedRole = {
  id: "role-a",
  guildId: guild.id,
  name: "Timer readers",
  color: null,
  position: 1,
  permissions: [Permission.LOOTLOG_TIMERS_READ],
  lvlRangeFrom: 1,
  lvlRangeTo: 100,
  createdAt: now,
  updatedAt: now,
} satisfies Role;

const accessPolicy = createAccessPolicy({
  capabilities: [
    Permission.LOOTLOG_TIMERS_READ,
    Permission.LOOTLOG_TIMERS_WRITE,
    Permission.LOOTLOG_TIMERS_RESET,
    Permission.LOOTLOG_MANAGE,
  ],
});

const access: TimersGuildAccess = {
  userId: "user-a",
  discordId: "discord-a",
  guild,
  accessPolicy,
  roles: [restrictedRole],
};

const storedTimer = {
  guildId: guild.id,
  npcId: 123,
  timerKey: "123:test boss",
  world: "Aldous",
  minSpawnTime: now,
  maxSpawnTime: new Date("2026-09-02T12:10:00.000Z"),
  npc: {
    id: 123,
    name: "Test boss",
    prof: "w",
    location: "Ithan",
    wt: "80",
    lvl: 100,
    type: "HERO" as const,
    icon: "boss.gif",
    margonemType: "4",
  },
  wasReset: false,
  updatedAt: now,
};

const makeData = (overrides: Partial<TimersData["Service"]> = {}) =>
  TimersData.of({
    getAll: () => Effect.succeed([]),
    getRecentHistory: () => Effect.succeed([]),
    getGuildTimers: () => Effect.succeed([]),
    searchNpcs: () => Effect.succeed([]),
    createAuto: () =>
      Effect.succeed({ submittedGuilds: [], rejectedGuilds: [] }),
    reset: () => Effect.succeed(storedTimer),
    delete: () => Effect.succeed(undefined),
    getHistory: () => Effect.succeed([]),
    restore: () => Effect.succeed(storedTimer),
    createManual: () => Effect.succeed(storedTimer),
    ...overrides,
  });

const makeAuthorization = (
  overrides: Partial<TimersAuthorization["Service"]> = {},
) =>
  TimersAuthorization.of({
    identity: Effect.succeed(access),
    requireGuild: ({ guildId }) =>
      guildId === guild.id
        ? Effect.succeed(access)
        : Effect.fail(
            new TimersAccessDenied({
              status: 403,
              code: "ORGANIZATION_ACCESS_DENIED",
            }),
          ),
    ...overrides,
  });

const provideServices = (
  data: TimersData["Service"],
  authorization = makeAuthorization(),
) =>
  Layer.merge(
    Layer.succeed(TimersData, data),
    Layer.succeed(TimersAuthorization, authorization),
  );

describe("Timers HttpApi handlers", () => {
  it("passes policy and roles to the visibility-aware service and decodes wire dates", async () => {
    const calls: TimersGuildAccess[] = [];
    const layer = provideServices(
      makeData({
        getGuildTimers: (receivedAccess) => {
          calls.push(receivedAccess);
          return Effect.succeed([storedTimer]);
        },
      }),
    );

    const response = await Effect.runPromise(
      getGuildTimers(guild.id, "Aldous").pipe(Effect.provide(layer)),
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.guild).toBe(guild);
    expect(calls[0]?.accessPolicy).toBe(accessPolicy);
    expect(calls[0]?.roles).toBe(access.roles);
    expect(response[0]?.updatedAt).toBe("2026-09-02T12:00:00.000Z");
    expect(Schema.is(TimersControllerGetTimers200)(response)).toBe(true);
  });

  it("keeps hidden timer history filtered by forwarding the exact scoped policy", async () => {
    const calls: Array<{
      guildId: string;
      accessPolicy: TimersGuildAccess["accessPolicy"];
      roles: TimersGuildAccess["roles"];
    }> = [];
    const layer = provideServices(
      makeData({
        getHistory: (receivedAccess) => {
          calls.push({
            guildId: receivedAccess.guild.id,
            accessPolicy: receivedAccess.accessPolicy,
            roles: receivedAccess.roles,
          });
          // The timer module applies per-NPC visibility and returns no entries
          // for this level-restricted role.
          return Effect.succeed([]);
        },
      }),
    );

    const response = await Effect.runPromise(
      getGuildTimerHistory(guild.id, "Aldous", "321:hidden titan").pipe(
        Effect.provide(layer),
      ),
    );

    expect(response).toEqual([]);
    expect(calls).toEqual([
      {
        guildId: guild.id,
        accessPolicy,
        roles: access.roles,
      },
    ]);
  });

  it("fails closed before a mutation when authorization is denied", async () => {
    const denied = new TimersAccessDenied({
      status: 403,
      code: "LOOTLOG_TIMERS_WRITE_REQUIRED",
    });
    let dataCalled = false;
    const layer = provideServices(
      makeData({
        createManual: () => {
          dataCalled = true;
          return Effect.succeed(storedTimer);
        },
      }),
      makeAuthorization({ requireGuild: () => Effect.fail(denied) }),
    );
    const payload: CreateManualTimerDto = {
      name: "Test boss",
      minSeconds: 60,
      maxSeconds: 120,
      world: "Aldous",
    };

    const error = await Effect.runPromise(
      Effect.flip(
        createManualGuildTimer(guild.id, payload).pipe(Effect.provide(layer)),
      ),
    );

    expect(error).toBe(denied);
    expect(dataCalled).toBe(false);
  });

  it("rejects cross-Organization access before querying scoped data", async () => {
    let dataCalled = false;
    const layer = provideServices(
      makeData({
        searchNpcs: () => {
          dataCalled = true;
          return Effect.succeed([]);
        },
      }),
    );

    const error = await Effect.runPromise(
      Effect.flip(
        searchTimerNpcs("guild-b", "Aldous", "boss").pipe(
          Effect.provide(layer),
        ),
      ),
    );

    expect(error).toBeInstanceOf(TimersAccessDenied);
    expect(dataCalled).toBe(false);
  });

  it("uses the legacy capability matrix and canonical guild scope for critical mutations", async () => {
    const authorizationCalls: Array<{
      guildId: string;
      capability: string;
    }> = [];
    const mutationCalls: Array<unknown> = [];
    const layer = provideServices(
      makeData({
        reset: (current, timerIdentifier, payload) => {
          mutationCalls.push([
            "reset",
            current.discordId,
            current.guild.id,
            timerIdentifier,
            payload,
          ]);
          return Effect.succeed(storedTimer);
        },
        delete: (current, timerIdentifier, world) => {
          mutationCalls.push([
            "delete",
            current.discordId,
            current.guild.id,
            timerIdentifier,
            world,
          ]);
          return Effect.succeed(undefined);
        },
        restore: (current, historyEntryId) => {
          mutationCalls.push([
            "restore",
            current.discordId,
            current.guild.id,
            historyEntryId,
          ]);
          return Effect.succeed(storedTimer);
        },
        createManual: (current, payload) => {
          mutationCalls.push([
            "manual",
            current.discordId,
            current.guild.id,
            payload,
          ]);
          return Effect.succeed(storedTimer);
        },
      }),
      makeAuthorization({
        requireGuild: (options) => {
          authorizationCalls.push(options);
          return Effect.succeed(access);
        },
      }),
    );
    const resetPayload: ResetTimerDto = { world: "Aldous" };
    const manualPayload: CreateManualTimerDto = {
      name: "Test boss",
      minSeconds: 60,
      maxSeconds: 120,
      world: "Aldous",
    };

    const [reset, deleted, restored, manual] = await Effect.runPromise(
      Effect.all([
        resetGuildTimer(guild.id, storedTimer.timerKey, resetPayload),
        deleteGuildTimer(guild.id, storedTimer.timerKey, "Aldous"),
        restoreGuildTimer(guild.id, 42),
        createManualGuildTimer(guild.id, manualPayload),
      ]).pipe(Effect.provide(layer)),
    );

    expect(authorizationCalls).toEqual([
      { guildId: guild.id, capability: Permission.LOOTLOG_TIMERS_RESET },
      { guildId: guild.id, capability: Permission.LOOTLOG_MANAGE },
      { guildId: guild.id, capability: Permission.LOOTLOG_TIMERS_WRITE },
      { guildId: guild.id, capability: Permission.LOOTLOG_TIMERS_WRITE },
    ]);
    expect(mutationCalls).toEqual([
      ["reset", "discord-a", guild.id, storedTimer.timerKey, resetPayload],
      ["delete", "discord-a", guild.id, storedTimer.timerKey, "Aldous"],
      ["restore", "discord-a", guild.id, 42],
      ["manual", "discord-a", guild.id, manualPayload],
    ]);
    expect(deleted).toBeUndefined();
    expect(Schema.is(TimersControllerResetTimer200)(reset)).toBe(true);
    expect(Schema.is(TimersControllerResetTimer200)(restored)).toBe(true);
    expect(Schema.is(TimersControllerResetTimer200)(manual)).toBe(true);
  });
});
