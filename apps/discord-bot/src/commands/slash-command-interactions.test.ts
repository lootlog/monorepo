import { ApiRpcGroup } from "@lootlog/rpc/api";
import { CatalogRpcGroup } from "@lootlog/rpc/catalog";
import {
  RpcForbiddenError,
  RpcNotFoundError,
  RpcUnauthorizedError,
  RpcUnavailableError,
} from "@lootlog/rpc/errors";
import { GatewayRpcGroup } from "@lootlog/rpc/gateway";
import { serviceRpcRoutes } from "@lootlog/rpc/server";
import { TEST_RPC_TOKEN } from "@lootlog/rpc/testing";
import { RuntimeEnvironment } from "@lootlog/schema/runtime-environment";
import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import { Effect, Layer, Redacted } from "effect";
import type { RpcGroup } from "effect/rpc";
import { FetchHttpClient, HttpRouter, HttpServer } from "effect/http";
import { BotConfig } from "#src/config/bot-config";
import { COMMAND_TEXT, FAILURE_MESSAGES } from "./command-messages.js";
import { LootlogClient } from "./lootlog-client.js";
import type { CommandInvocation, CommandReply } from "./slash-command.js";
import { answerCommand } from "./slash-command-interactions.js";

const guildId = "guild-1";

const discordId = "discord-1";

const unused = () => Effect.die("unused");

let rpcCalls: Array<{ readonly method: string; readonly payload: unknown }> =
  [];

type PureHandlers<T> = {
  [K in keyof T]: T[K] extends (payload: infer P, options: infer O) => infer Ret
    ? (
        payload: P,
        options: O,
      ) => Extract<Ret, Effect.Effect<unknown, unknown, never>> extends never
        ? Ret extends Effect.Effect<infer A, infer E, infer _R>
          ? Effect.Effect<A, E>
          : never
        : Extract<Ret, Effect.Effect<unknown, unknown, never>>
    : T[K];
};

type ApiHandlers = PureHandlers<
  RpcGroup.HandlersFrom<RpcGroup.Rpcs<typeof ApiRpcGroup>>
>;

type GatewayHandlers = PureHandlers<
  RpcGroup.HandlersFrom<RpcGroup.Rpcs<typeof GatewayRpcGroup>>
>;

let rpcOverrides: Partial<ApiHandlers & GatewayHandlers> = {};

const record =
  <P, O, R>(
    method: string,
    fallback: (payload: P, options: O) => R,
    override: () => ((payload: P, options: O) => R) | undefined,
  ) =>
  (payload: P, options: O) => {
    rpcCalls.push({ method, payload });
    const handler = override();

    return handler ? handler(payload, options) : fallback(payload, options);
  };

const apiWeb = HttpRouter.toWebHandler(
  Layer.mergeAll(
    serviceRpcRoutes({
      group: ApiRpcGroup,
      callerTokens: { "discord-bot": TEST_RPC_TOKEN },
      spanPrefix: "test.rpc",
      handlers: ApiRpcGroup.toLayer({
        getUserGuildPermissions: unused,
        getGuildByIdOrVanityUrl: unused,
        getUserAccessibleGuilds: unused,
        getUserLimits: unused,
        getEventTimers: unused,
        getGuildTopKilledNpcs: unused,
        listUserReservations: unused,
        listGuildReservationSpots: unused,
        listGuildBingoBoards: record(
          "api.listGuildBingoBoards",
          () => Effect.fail(new RpcNotFoundError()),
          () => rpcOverrides.listGuildBingoBoards,
        ),
        getGuildBingoBoard: record(
          "api.getGuildBingoBoard",
          () => Effect.fail(new RpcNotFoundError()),
          () => rpcOverrides.getGuildBingoBoard,
        ),
        getGuildStatsCard: record(
          "api.getGuildStatsCard",
          () => Effect.fail(new RpcNotFoundError()),
          () => rpcOverrides.getGuildStatsCard,
        ),
        getMemberIdentity: record(
          "api.getMemberIdentity",
          () => Effect.fail(new RpcNotFoundError()),
          () => rpcOverrides.getMemberIdentity,
        ),
        getGuildKillStats: record(
          "api.getGuildKillStats",
          () => Effect.fail(new RpcNotFoundError()),
          () => rpcOverrides.getGuildKillStats,
        ),
        getNpcKillers: record(
          "api.getNpcKillers",
          () => Effect.fail(new RpcNotFoundError()),
          () => rpcOverrides.getNpcKillers,
        ),
        listGuildEvents: record(
          "api.listGuildEvents",
          () => Effect.fail(new RpcNotFoundError()),
          () => rpcOverrides.listGuildEvents,
        ),
        getEventRanking: record(
          "api.getEventRanking",
          () => Effect.fail(new RpcNotFoundError()),
          () => rpcOverrides.getEventRanking,
        ),
        getEventWrapped: record(
          "api.getEventWrapped",
          () => Effect.fail(new RpcNotFoundError()),
          () => rpcOverrides.getEventWrapped,
        ),
        listGuildTimers: record(
          "api.listGuildTimers",
          () => Effect.fail(new RpcNotFoundError()),
          () => rpcOverrides.listGuildTimers,
        ),
        listGuildLoots: record(
          "api.listGuildLoots",
          () => Effect.fail(new RpcNotFoundError()),
          () => rpcOverrides.listGuildLoots,
        ),
      }),
    }),
    HttpServer.layerServices,
  ),
  { disableLogger: true },
);

const gatewayWeb = HttpRouter.toWebHandler(
  Layer.mergeAll(
    serviceRpcRoutes({
      group: GatewayRpcGroup,
      callerTokens: { "discord-bot": TEST_RPC_TOKEN },
      spanPrefix: "test.rpc",
      handlers: GatewayRpcGroup.toLayer({
        getOrganizationPresence: record(
          "gateway.getOrganizationPresence",
          () => Effect.fail(new RpcUnavailableError()),
          () => rpcOverrides.getOrganizationPresence,
        ),
      }),
    }),
    HttpServer.layerServices,
  ),
  { disableLogger: true },
);

const catalogWeb = HttpRouter.toWebHandler(
  Layer.mergeAll(
    serviceRpcRoutes({
      group: CatalogRpcGroup,
      callerTokens: { "discord-bot": TEST_RPC_TOKEN },
      spanPrefix: "test.rpc",
      handlers: CatalogRpcGroup.toLayer({
        searchItems: () => Effect.succeed({ hits: [] }),
      }),
    }),
    HttpServer.layerServices,
  ),
  { disableLogger: true },
);

afterAll(async () => {
  await Promise.all([
    apiWeb.dispose(),
    gatewayWeb.dispose(),
    catalogWeb.dispose(),
  ]);
});

const fetchBoundary: typeof globalThis.fetch = Object.assign(
  async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    const url = new URL(request.url);

    if (url.host === "api.test") return apiWeb.handler(request);

    if (url.host === "gateway.test") return gatewayWeb.handler(request);

    if (url.host === "catalog.test") return catalogWeb.handler(request);

    return new Response(null, { status: 404 });
  },
  { preconnect: globalThis.fetch.preconnect },
);

const services = LootlogClient.layer.pipe(
  Layer.provideMerge(
    Layer.succeed(
      BotConfig,
      BotConfig.of({
        environment: RuntimeEnvironment.DEV,
        port: 0,
        rpc: {
          port: 0,
          callerTokens: {},
          api: { url: "http://api.test", token: TEST_RPC_TOKEN },
          catalog: { url: "http://catalog.test", token: TEST_RPC_TOKEN },
          gateway: { url: "http://gateway.test", token: TEST_RPC_TOKEN },
        },
        serviceName: "discord-bot",
        serviceNamespace: "test",
        discordBotToken: Redacted.make("token"),
        rabbitmqUri: Redacted.make("amqp://test"),
        webAppUrl: "https://lootlog.test",
      }),
    ),
  ),
  Layer.provide(
    FetchHttpClient.layer.pipe(
      Layer.provide(Layer.succeed(FetchHttpClient.Fetch, fetchBoundary)),
    ),
  ),
);

const invoke = (
  commandName: string,
  options: {
    readonly subcommand?: string;
    readonly strings?: Readonly<Record<string, string>>;
    readonly booleans?: Readonly<Record<string, boolean>>;
    readonly users?: Readonly<Record<string, string>>;
  } = {},
): Promise<CommandReply> => {
  const invocation: CommandInvocation = {
    guildId,
    discordId,
    appPermissions: 0n,
    options: {
      subcommand: options.subcommand ?? null,
      string: (name) => options.strings?.[name] ?? null,
      boolean: (name) => options.booleans?.[name] ?? null,
      user: (name) => options.users?.[name] ?? null,
    },
  };

  return Effect.runPromise(
    answerCommand(commandName, invocation).pipe(Effect.provide(services)),
  );
};

const linkedMember = () => Effect.succeed({ userId: "user-1", memberId: 1 });

const description = (reply: CommandReply) =>
  reply.embeds?.[0]?.toJSON().description ?? "";

beforeEach(() => {
  rpcCalls = [];
  rpcOverrides = {};
});

describe("slash commands", () => {
  it("reads the invoking Member's own Organization with that Member's identity", async () => {
    rpcOverrides = {
      getMemberIdentity: linkedMember,
      getGuildKillStats: () =>
        Effect.succeed({
          overview: { guildUniqueKills: 3 },
          memberRanking: [
            {
              member: { name: "Aria", userId: "discord-2" },
              totalParticipations: 2,
              participationsByType: { ELITE2: 2 },
            },
            {
              member: { name: "Borys", userId: "discord-3" },
              totalParticipations: 1,
              participationsByType: { ELITE2: 1 },
            },
          ],
        }),
    };

    const reply = await invoke("ranking", {
      strings: { typ: "ELITE2", okres: "7d" },
    });

    const statsCall = rpcCalls.find(
      ({ method }) => method === "api.getGuildKillStats",
    );

    expect(rpcCalls[0]?.method).toBe("api.getMemberIdentity");
    expect(statsCall?.payload).toEqual({
      userId: "user-1",
      discordId,
      guildId,
      npcTypes: ["ELITE2"],
      period: "7d",
    });
    expect(description(reply).indexOf("Aria")).toBeLessThan(
      description(reply).indexOf("Borys"),
    );
  });

  it("adds the invoker below the top of the ranking with their real position", async () => {
    const memberRanking = Array.from({ length: 20 }, (_, index) => ({
      member: {
        name: index === 17 ? "Invoker" : `Member ${index + 1}`,
        userId: index === 17 ? discordId : `discord-other-${index}`,
      },
      totalParticipations: 20 - index,
      participationsByType: {},
    }));

    rpcOverrides = {
      getMemberIdentity: linkedMember,
      getGuildKillStats: () =>
        Effect.succeed({ overview: { guildUniqueKills: 20 }, memberRanking }),
    };

    const lines = description(
      await invoke("ranking", { strings: { typ: "ELITE2" } }),
    ).split("\n");

    expect(lines).toHaveLength(17);
    expect(lines[15]).toBe("…");
    expect(lines[16]).toContain("`18.`");
    expect(lines[16]).toContain(`<@${discordId}>`);
    expect(lines.join("\n")).not.toContain("Member 16");
  });

  it("does not claim the invoker never killed an NPC when the killers page is cut", async () => {
    const killers = (count: number) =>
      Array.from({ length: count }, (_, index) => ({
        member: {
          name: `Member ${index + 1}`,
          userId: `discord-other-${index}`,
        },
        participationCount: 1,
      }));

    const npcReply = async (count: number) => {
      rpcOverrides = {
        getMemberIdentity: linkedMember,
        getNpcKillers: () =>
          Effect.succeed({
            npc: {
              npcName: "Heros",
              npcType: "HERO",
              npcLvl: 100,
              npcIcon: null,
              uniqueGuildKills: count,
              totalMemberParticipations: count,
            },
            killers: killers(count),
          }),
      };

      const reply = await invoke("npc", { strings: { nazwa: "7" } });

      return (reply.embeds?.[0]?.toJSON().fields ?? [])
        .map(({ value }) => value)
        .join("\n");
    };

    expect(await npcReply(100)).not.toContain(COMMAND_TEXT.npc.ownMissing);
    expect(await npcReply(3)).toContain(COMMAND_TEXT.npc.ownMissing);
  });

  it("sums the invoker's event points over heroes and ranks them by total", async () => {
    const entry = (heroNpcName: string, id: number, totalPoints: number) => ({
      heroNpcName,
      totalPoints,
      totalKills: 1,
      member: { id, name: `Member ${id}` },
    });

    rpcOverrides = {
      getMemberIdentity: linkedMember,
      listGuildEvents: () =>
        Effect.succeed([
          {
            id: "event-1",
            name: "Event",
            world: "Aldous",
            active: true,
            startsAt: null,
            endsAt: null,
            createdAt: new Date().toISOString(),
            heroNpcs: [],
          },
        ]),
      getEventRanking: () =>
        Effect.succeed([
          entry("A", 2, 10),
          entry("A", 1, 6),
          entry("B", 1, 6),
          entry("B", 3, 8),
        ]),
      getEventWrapped: () =>
        Effect.succeed({
          overview: {
            totalKills: 4,
            participantCount: 3,
            totalPoints: 30,
            coveragePercentage: 50,
            totalLoots: 0,
          },
          leaders: {
            topHunter: {
              winner: {
                member: { name: "Member 2" },
                primaryValue: 2,
              },
            },
            topScorer: { winner: null },
            longestDuty: { winner: null },
          },
        }),
    };

    const reply = await invoke("event", { subcommand: "podsumowanie" });

    const own = reply.embeds?.[0]
      ?.toJSON()
      .fields?.find(({ name }) => name === COMMAND_TEXT.events.summary.own);

    expect(own?.value).toBe(
      COMMAND_TEXT.events.summary.ownResult(1, 3, "12", 2),
    );
    expect(JSON.stringify(reply.embeds?.[0]?.toJSON().fields)).toContain(
      `${COMMAND_TEXT.events.summary.topHunter}: **Member 2**`,
    );
  });

  it("pings the chosen Member only when their statistics are shown publicly", async () => {
    rpcOverrides = {
      getMemberIdentity: linkedMember,
      getGuildKillStats: () =>
        Effect.succeed({
          overview: { guildUniqueKills: 1 },
          memberRanking: [
            {
              member: { name: "Aria", userId: "discord-2" },
              totalParticipations: 1,
              participationsByType: { HERO: 1 },
            },
          ],
        }),
    };

    const statistics = (publiczne: boolean) =>
      invoke("statystyki", {
        users: { gracz: "discord-2" },
        booleans: { publiczne },
      });

    expect((await statistics(true)).pings).toEqual(["discord-2"]);
    expect((await statistics(false)).pings).toBeUndefined();
  });

  it("asks a player without a Lootlog account here to sign in before reading anything", async () => {
    const reply = await invoke("ranking", { strings: { typ: "HERO" } });

    expect(reply.content).toBe(FAILURE_MESSAGES["not-linked"]);
    expect(rpcCalls.map(({ method }) => method)).toEqual([
      "api.getMemberIdentity",
    ]);
  });

  it.each([
    {
      error: new RpcUnauthorizedError(),
      message: FAILURE_MESSAGES.reauthenticate,
    },
    { error: new RpcForbiddenError(), message: FAILURE_MESSAGES.forbidden },
    { error: new RpcUnavailableError(), message: FAILURE_MESSAGES.unavailable },
  ])(
    "answers an RPC failure with what the player can do about it",
    async ({ error, message }) => {
      rpcOverrides = {
        getMemberIdentity: linkedMember,
        listGuildTimers: () => Effect.fail(error),
      };

      expect((await invoke("timery")).content).toBe(message);
    },
  );

  it("lists only timers whose spawn window is still open, soonest first", async () => {
    const at = (minutes: number) =>
      new Date(Date.now() + minutes * 60_000).toISOString();

    const timer = (name: string, from: number, until: number) => ({
      timerKey: `1:${name}`,
      world: "Aldous",
      minSpawnTime: at(from),
      maxSpawnTime: at(until),
      wasReset: false,
      npc: { name, lvl: 100, type: "ELITE2", location: "Mapa", icon: null },
    });

    rpcOverrides = {
      getMemberIdentity: linkedMember,
      listGuildTimers: () =>
        Effect.succeed([
          timer("Later", 30, 40),
          timer("Expired", -20, -5),
          { ...timer("Deleted", 5, 10), deletedAt: at(-1) },
          timer("Open", -5, 5),
        ]),
    };

    const lines = description(await invoke("timery")).split("\n");

    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain("Open");
    expect(lines[1]).toContain("Later");
  });

  it("lists the newest loots from the API's loots page", async () => {
    rpcOverrides = {
      getMemberIdentity: linkedMember,
      listGuildLoots: () =>
        Effect.succeed({
          items: [
            {
              createdAt: new Date().toISOString(),
              world: "aldous",
              items: [{ name: "Hełm Grozy", rarity: "HEROIC" }],
              players: [{ name: "Gracz" }],
              npcs: [{ id: 7, name: "Kotołak", type: "HERO", wt: 80, lvl: 50 }],
            },
          ],
        }),
    };

    const lines = description(await invoke("lupy")).split("\n");

    expect(lines[0]).toContain("Kotołak");
    expect(lines[1]).toContain("Hełm Grozy");
    expect(lines[1]).toContain("Gracz");
  });

  it("tells the player an NPC has no visible kills instead of reporting an outage", async () => {
    rpcOverrides = {
      getMemberIdentity: linkedMember,
      getNpcKillers: () => Effect.succeed({ npc: null, killers: [] }),
    };

    const reply = await invoke("npc", { strings: { nazwa: "999" } });

    expect(reply.content).toBe(COMMAND_TEXT.npc.notFound);
  });

  it("keeps an event ranking with many heroes within Discord's embed limits", async () => {
    const heroNames = Array.from(
      { length: 30 },
      (_, index) => `Heros ${index}`,
    );

    rpcOverrides = {
      getMemberIdentity: linkedMember,
      listGuildEvents: () =>
        Effect.succeed([
          {
            id: "event-1",
            name: "Event",
            world: "Aldous",
            active: true,
            startsAt: null,
            endsAt: null,
            createdAt: new Date().toISOString(),
            heroNpcs: heroNames.map((npcName) => ({
              npcId: null,
              npcName,
              npcLvl: null,
            })),
          },
        ]),
      getEventRanking: () =>
        Effect.succeed(
          heroNames.flatMap((heroNpcName) =>
            Array.from({ length: 10 }, (_, index) => ({
              heroNpcName,
              totalPoints: 100 - index,
              totalKills: 10,
              member: {
                id: 100 + index,
                name: `Członek z długim nickiem ${index}`,
              },
            })),
          ),
        ),
    };

    const reply = await invoke("event", { subcommand: "ranking" });
    const embed = reply.embeds?.[0]?.toJSON();
    const fields = embed?.fields ?? [];

    expect(fields.length).toBeGreaterThan(0);
    expect(fields.length).toBeLessThanOrEqual(25);
    expect(
      [
        embed?.title,
        embed?.footer?.text,
        ...fields.flatMap((f) => [f.name, f.value]),
      ].join("").length,
    ).toBeLessThanOrEqual(6000);
  });

  it("counts characters in the game once and leaves out Web sessions", async () => {
    const presence = (
      platform: string,
      character?: { name: string; world: string },
      isAfk = false,
    ) =>
      character
        ? { platform, status: "online", isAfk, character }
        : { platform, status: "online", isAfk };

    rpcOverrides = {
      getMemberIdentity: linkedMember,
      getOrganizationPresence: () =>
        Effect.succeed({
          presences: [
            presence("game", { name: "Aria", world: "Aldous" }),
            presence("game", { name: "Aria", world: "Aldous" }),
            presence("web-app"),
            presence("game", { name: "Borys", world: "Luvia" }, true),
            presence("game", { name: "Cyra", world: "Luvia" }),
          ],
        }),
    };

    const reply = await invoke("online");

    expect(reply.embeds?.[0]?.toJSON().title).toBe(
      COMMAND_TEXT.online.title(3),
    );
    expect(description(reply).split("\n")).toEqual([
      COMMAND_TEXT.online.world("Luvia", 2, 1),
      COMMAND_TEXT.online.world("Aldous", 1, 0),
    ]);
    expect(
      rpcCalls.find(
        ({ method }) => method === "gateway.getOrganizationPresence",
      )?.payload,
    ).toEqual({
      userId: "user-1",
      discordId,
      organizationId: guildId,
    });
  });

  it("attaches the Organization stats card that the API renders over RPC", async () => {
    const png = new Uint8Array([137, 80, 78, 71]);

    rpcOverrides = { getGuildStatsCard: () => Effect.succeed(png) };

    const reply = await invoke("karta");

    expect(rpcCalls).toEqual([
      { method: "api.getGuildStatsCard", payload: { guildId } },
    ]);
    expect(reply.files?.[0]?.attachment).toEqual(Buffer.from(png));
  });

  it("explains that the stats card is off when the API has no public card", async () => {
    const reply = await invoke("karta");

    expect(reply.content).toBe(COMMAND_TEXT.card.unavailable);
  });

  it("renders the active Bingo 5x5 grid with completed, in-progress, and locked cells", async () => {
    const summary = (id: string, name: string, status: "DRAFT" | "ACTIVE") => ({
      id,
      name,
      world: "Aldous",
      mode: "LOCKOUT" as const,
      size: 5,
      status,
      startsAt: null,
      endsAt: null,
      configuredTileCount: 25,
      participantCount: 2,
      viewerCompletedTiles: 1,
      viewerCompletedLines: 0,
      viewerTotalPoints: 10,
    });

    rpcOverrides = {
      getMemberIdentity: linkedMember,
      listGuildBingoBoards: () =>
        Effect.succeed({
          items: [
            summary("board-draft", "Szkic", "DRAFT"),
            summary("board-active", "Bingo Jesienne", "ACTIVE"),
          ],
        }),
      getGuildBingoBoard: () =>
        Effect.succeed({
          board: summary("board-active", "Bingo Jesienne", "ACTIVE"),
          viewerMemberId: 1,
          tiles: [
            {
              id: "t-0-0",
              row: 0,
              col: 0,
              title: "Legenda",
              lockedByMemberId: 1,
              viewerProgress: {
                currentCount: 1,
                targetCount: 1,
                completedAt: "2026-11-27T12:00:00.000Z",
              },
            },
            {
              id: "t-0-1",
              row: 0,
              col: 1,
              title: "Herosi",
              lockedByMemberId: null,
              viewerProgress: {
                currentCount: 2,
                targetCount: 3,
                completedAt: null,
              },
            },
            {
              id: "t-0-2",
              row: 0,
              col: 2,
              title: "Kolos",
              lockedByMemberId: 2,
              viewerProgress: null,
            },
            {
              id: "t-0-3",
              row: 0,
              col: 3,
              title: "Otchłań",
              lockedByMemberId: null,
              viewerProgress: {
                currentCount: 0,
                targetCount: 5,
                completedAt: null,
              },
            },
          ],
          leaderboard: [
            {
              rank: 1,
              member: { id: 2, name: "Borys" },
              totalPoints: 20,
              completedTileCount: 2,
              completedLines: [],
              isBlackout: false,
            },
            {
              rank: 2,
              member: { id: 1, name: "Aria" },
              totalPoints: 10,
              completedTileCount: 1,
              completedLines: [],
              isBlackout: false,
            },
          ],
        }),
    };

    const boardReply = await invoke("bingo", { subcommand: "tablica" });
    const rankingReply = await invoke("bingo", { subcommand: "ranking" });

    expect(
      rpcCalls.find(({ method }) => method === "api.getGuildBingoBoard")
        ?.payload,
    ).toEqual({
      userId: "user-1",
      discordId,
      guildId,
      boardId: "board-active",
    });
    expect(description(boardReply)).toContain("🟩🟨🔒⬛⬜");
    expect(description(rankingReply)).toContain("Borys");
    expect(description(rankingReply)).toContain(`<@${discordId}>`);
  });
});
