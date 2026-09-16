import { describe, expect, it } from "bun:test";
import { Effect, Layer, Schema } from "effect";
import { createAccessPolicy } from "@lootlog/domain/access-policy";
import { Permission } from "@lootlog/schema/permissions";
import type { Guild, Role } from "#src/timers/timers.types";
import {
  TimersResponse,
  TimerResponse,
  type CreateManualTimerRequest,
  type ResetTimerRequest,
} from "#src/contracts/timers/schemas";

import {
  getAllTimers,
  getRecentTimerHistory,
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

import { decodeDomainJson } from "../../domain-json.schema.js";
import { TimersInfrastructureError } from "./timer-errors.js";

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
    expect(Schema.is(TimersResponse)(response)).toBe(true);
  });

  it("converts nested member and nullable history dates without changing omitted fields", async () => {
    const member = {
      id: 1,
      userId: "user-a",
      guildId: guild.id,
      type: "USER" as const,
      name: "Member",
      active: true,
      roles: [restrictedRole],
      updatedAt: now,
      lastDiscordSyncAt: now,
      lastDiscordAttemptAt: null,
      nextRefreshAt: "2026-09-02T12:10:00.000Z",
    };

    const actorCharacter = {
      name: "Actor",
      prof: "WARRIOR" as const,
      icon: null,
      lvl: 100,
      characterId: 123,
      accountId: 456,
    };

    const timer = { ...storedTimer, member, actorCharacter, deletedAt: null };
    const deletedTimer = { ...timer, deletedAt: now };
    const sourceTimers = [timer, storedTimer, deletedTimer];

    const history = {
      id: 42,
      guildId: guild.id,
      guildName: guild.name,
      world: storedTimer.world,
      timerKey: storedTimer.timerKey,
      npcId: storedTimer.npcId,
      npc: storedTimer.npc,
      action: "DELETE",
      member,
      actorCharacter,
      minSpawnTime: null,
      maxSpawnTime: now,
      canRestore: true,
      createdAt: now,
    };

    const layer = provideServices(
      makeData({
        getAll: () => Effect.succeed(sourceTimers),
        getRecentHistory: () => Effect.succeed([history]),
      }),
    );

    const [timers, entries] = await Effect.runPromise(
      Effect.all([
        getAllTimers("Aldous"),
        getRecentTimerHistory(guild.id, "Aldous"),
      ]).pipe(Effect.provide(layer)),
    );

    expect(timers).toEqual(
      await Effect.runPromise(decodeDomainJson(TimersResponse, sourceTimers)),
    );
    expect(timers[0]?.actorCharacter).toEqual(actorCharacter);
    expect(entries[0]?.actorCharacter).toEqual(actorCharacter);
    expect(timers[2]?.deletedAt).toBe(now.toISOString());
    expect(timers[1]).not.toHaveProperty("actorCharacter");
    expect(timers[0]?.member).toEqual({
      ...member,
      roles: [
        {
          id: restrictedRole.id,
          guildId: restrictedRole.guildId,
          name: restrictedRole.name,
          color: restrictedRole.color,
          position: restrictedRole.position,
          permissions: restrictedRole.permissions,
          lvlRangeFrom: restrictedRole.lvlRangeFrom,
          lvlRangeTo: restrictedRole.lvlRangeTo,
        },
      ],
      updatedAt: now.toISOString(),
      lastDiscordSyncAt: now.toISOString(),
    });
    expect(timers[0]?.deletedAt).toBeNull();
    expect(timers[1]).not.toHaveProperty("member");
    expect(timers[1]).not.toHaveProperty("deletedAt");
    expect(entries[0]?.minSpawnTime).toBeNull();
    expect(entries[0]?.maxSpawnTime).toBe(now.toISOString());
    expect(entries[0]?.createdAt).toBe(now.toISOString());
    expect(entries[0]?.member).toEqual(timers[0]?.member);
  });

  it.each([
    { ...storedTimer, minSpawnTime: new Date("invalid") },
    { ...storedTimer, minSpawnTime: new Date("+010000-01-01T00:00:00.000Z") },
    { ...storedTimer, updatedAt: "invalid" },
    { ...storedTimer, npc: { ...storedTimer.npc, lvl: "100" } },
    { ...storedTimer, wasReset: null },
    { ...storedTimer, member: null },
    { ...storedTimer, member: undefined },
    { ...storedTimer, actorCharacter: null },
    { ...storedTimer, actorCharacter: undefined },
    {
      ...storedTimer,
      member: {
        id: 1,
        userId: "user-a",
        guildId: guild.id,
        type: "USER",
        name: "Member",
        active: true,
        roles: [],
        updatedAt: now,
        nextRefreshAt: new Date("invalid"),
      },
    },
  ])(
    "retains infrastructure failures for malformed timer responses %#",
    async (timer) => {
      const layer = provideServices(
        makeData({
          getGuildTimers: () => Effect.succeed([timer]),
        }),
      );

      const error = await Effect.runPromise(
        Effect.flip(getGuildTimers(guild.id).pipe(Effect.provide(layer))),
      );

      expect(error).toBeInstanceOf(TimersInfrastructureError);
    },
  );

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

    const payload: CreateManualTimerRequest = {
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

    const resetPayload: ResetTimerRequest = { world: "Aldous" };

    const manualPayload: CreateManualTimerRequest = {
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
    expect(Schema.is(TimerResponse)(reset)).toBe(true);
    expect(Schema.is(TimerResponse)(restored)).toBe(true);
    expect(Schema.is(TimerResponse)(manual)).toBe(true);
  });
});
