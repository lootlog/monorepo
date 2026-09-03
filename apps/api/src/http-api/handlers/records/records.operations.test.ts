import { describe, expect, it } from "bun:test";
import { createAccessPolicy } from "@lootlog/domain/access-policy";
import { Permission } from "@lootlog/schema/permissions";
import { Effect, Layer } from "effect";
import type {
  KillsControllerCreateKill201,
  KillsControllerCreateKillRequestJson,
} from "../../contracts/kills/schemas.js";
import type {
  LootsControllerCreateComment201,
  LootsControllerCreateCommentRequestJson,
  LootsControllerFetchLootById200,
} from "../../contracts/loots/schemas.js";
import {
  createComment,
  createKill,
  createLoot,
  fetchLoot,
  fetchLoots,
  getMemberKills,
  RecordsAccessDenied,
  RecordsAuthorization,
  RecordsData,
  RecordsNotFound,
  type AuthenticatedCaller,
  type AuthorizedGuildCaller,
} from "./records.operations.js";

const caller: AuthenticatedCaller = {
  discordId: "discord-1",
  userId: "user-1",
};

const guildCaller: AuthorizedGuildCaller = {
  ...caller,
  guild: { id: "guild-a" } as AuthorizedGuildCaller["guild"],
  accessPolicy: createAccessPolicy({
    capabilities: [
      Permission.LOOTLOG_ACCESS,
      Permission.LOOTLOG_LOOTS_READ,
      Permission.LOOTLOG_LOOTS_WRITE,
      Permission.LOOTLOG_LOOTS_ARCHIVE,
    ],
  }),
  roles: [],
};

const unimplemented = () => Effect.die("unexpected data access");

const makeData = (overrides: Partial<RecordsData["Service"]> = {}) =>
  RecordsData.of({
    createKill: unimplemented,
    getGuildKillStats: unimplemented,
    getUserKillStats: unimplemented,
    getUserNpcKills: unimplemented,
    getGuildTopNpcs: unimplemented,
    getGuildTopKillersByType: unimplemented,
    getNpcKillers: unimplemented,
    getMemberKills: unimplemented,
    fetchLoots: unimplemented,
    getLootStats: unimplemented,
    countLoots: unimplemented,
    resolveLootItem: unimplemented,
    fetchLoot: unimplemented,
    archiveLoot: unimplemented,
    createLoot: unimplemented,
    getComments: unimplemented,
    createComment: unimplemented,
    updateLoot: unimplemented,
    ...overrides,
  });

const makeAuthorization = (
  overrides: Partial<RecordsAuthorization["Service"]> = {},
) =>
  RecordsAuthorization.of({
    requireCaller: Effect.succeed(caller),
    requireGuild: () => Effect.succeed(guildCaller),
    ...overrides,
  });

const services = (
  authorization: RecordsAuthorization["Service"],
  data: RecordsData["Service"],
) =>
  Layer.merge(
    Layer.succeed(RecordsAuthorization, authorization),
    RecordsData.layer(data),
  );

describe("Kills and Loots HttpApi handlers", () => {
  it("records a kill only after authenticating and preserves the caller identity", async () => {
    const payload = {
      npc: { id: 123, name: "Mushita", lvl: 100, type: "HERO" },
      world: "tempest",
    } as unknown as KillsControllerCreateKillRequestJson;
    const created = {
      id: "kill-1",
    } as unknown as KillsControllerCreateKill201;
    const calls: Array<{
      receivedCaller: AuthenticatedCaller;
      receivedPayload: KillsControllerCreateKillRequestJson;
    }> = [];

    const result = await Effect.runPromise(
      createKill(payload).pipe(
        Effect.provide(
          services(
            makeAuthorization(),
            makeData({
              createKill: (receivedCaller, receivedPayload) => {
                calls.push({ receivedCaller, receivedPayload });
                return Effect.succeed(created);
              },
            }),
          ),
        ),
      ),
    );

    expect(result).toBe(created);
    expect(calls).toEqual([
      { receivedCaller: caller, receivedPayload: payload },
    ]);
  });

  it("fails closed on missing authentication before accepting a loot", async () => {
    const denied = new RecordsAccessDenied({
      status: 401,
      code: "AUTHENTICATION_REQUIRED",
    });
    let dataAccessed = false;

    const error = await Effect.runPromise(
      Effect.flip(
        createLoot({} as never).pipe(
          Effect.provide(
            services(
              makeAuthorization({ requireCaller: Effect.fail(denied) }),
              makeData({
                createLoot: () => {
                  dataAccessed = true;
                  return Effect.die("must not run");
                },
              }),
            ),
          ),
        ),
      ),
    );

    expect(error).toBe(denied);
    expect(dataAccessed).toBe(false);
  });

  it("requires loot read permission before any Organization data access", async () => {
    const authorizationCalls: Array<{
      guildId: string;
      capability: string;
    }> = [];
    const denied = new RecordsAccessDenied({
      status: 403,
      code: "LOOTS_READ_REQUIRED",
    });
    let dataAccessed = false;

    const error = await Effect.runPromise(
      Effect.flip(
        fetchLoots("guild-a", {}).pipe(
          Effect.provide(
            services(
              makeAuthorization({
                requireGuild: (options) => {
                  authorizationCalls.push(options);
                  return Effect.fail(denied);
                },
              }),
              makeData({
                fetchLoots: () => {
                  dataAccessed = true;
                  return Effect.die("must not run");
                },
              }),
            ),
          ),
        ),
      ),
    );

    expect(error).toBe(denied);
    expect(authorizationCalls).toEqual([
      { guildId: "guild-a", capability: Permission.LOOTLOG_LOOTS_READ },
    ]);
    expect(dataAccessed).toBe(false);
  });

  it("does not cross the requested Organization boundary", async () => {
    const denied = new RecordsAccessDenied({
      status: 403,
      code: "ORGANIZATION_ACCESS_DENIED",
    });
    const requestedGuilds: string[] = [];
    let dataAccessed = false;

    const error = await Effect.runPromise(
      Effect.flip(
        fetchLoot("guild-b", 42).pipe(
          Effect.provide(
            services(
              makeAuthorization({
                requireGuild: ({ guildId }) => {
                  requestedGuilds.push(guildId);
                  return Effect.fail(denied);
                },
              }),
              makeData({
                fetchLoot: () => {
                  dataAccessed = true;
                  return Effect.die("must not run");
                },
              }),
            ),
          ),
        ),
      ),
    );

    expect(error).toBe(denied);
    expect(requestedGuilds).toEqual(["guild-b"]);
    expect(dataAccessed).toBe(false);
  });

  it("maps a hidden or cross-Organization loot to not-found", async () => {
    const error = await Effect.runPromise(
      Effect.flip(
        fetchLoot("guild-a", 42).pipe(
          Effect.provide(
            services(
              makeAuthorization(),
              makeData({
                fetchLoot: () =>
                  Effect.succeed(null as LootsControllerFetchLootById200),
              }),
            ),
          ),
        ),
      ),
    );

    expect(error).toBeInstanceOf(RecordsNotFound);
    expect(error).toMatchObject({ status: 404, code: "LOOT_NOT_FOUND" });
  });

  it("checks write permission before creating a comment", async () => {
    const payload = {
      content: "gg",
    } as unknown as LootsControllerCreateCommentRequestJson;
    const created = {
      id: "comment-1",
    } as unknown as LootsControllerCreateComment201;
    const authorizationCalls: string[] = [];

    const result = await Effect.runPromise(
      createComment("guild-a", 42, payload).pipe(
        Effect.provide(
          services(
            makeAuthorization({
              requireGuild: (options) => {
                authorizationCalls.push(options.capability);
                return Effect.succeed(guildCaller);
              },
            }),
            makeData({ createComment: () => Effect.succeed(created) }),
          ),
        ),
      ),
    );

    expect(result).toBe(created);
    expect(authorizationCalls).toEqual([Permission.LOOTLOG_LOOTS_WRITE]);
  });

  it("preserves the legacy hidden-member sentinel inside the scoped guild", async () => {
    const result = await Effect.runPromise(
      getMemberKills("guild-a", "123", {}).pipe(
        Effect.provide(
          services(
            makeAuthorization(),
            makeData({ getMemberKills: () => Effect.succeed(null) }),
          ),
        ),
      ),
    );

    expect(result).toEqual({
      member: null,
      overview: null,
      npcs: [],
      pagination: null,
    });
  });
});
