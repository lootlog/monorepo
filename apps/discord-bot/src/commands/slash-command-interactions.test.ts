import { beforeEach, describe, expect, it } from "bun:test";
import { Effect, Layer, Redacted } from "effect";
import { FetchHttpClient } from "effect/http";
import { BotConfig } from "#src/config/bot-config";
import { COMMAND_TEXT, FAILURE_MESSAGES } from "./command-messages.js";
import { LootlogClient } from "./lootlog-client.js";
import type { CommandInvocation, CommandReply } from "./slash-command.js";
import { answerCommand } from "./slash-command-interactions.js";

const guildId = "guild-1";

const discordId = "discord-1";

type Answer = (url: URL) => Response;

let answers: Array<{ readonly path: string; readonly answer: Answer }> = [];

let requests: Array<{ readonly url: URL; readonly headers: Headers }> = [];

const fetchBoundary: typeof globalThis.fetch = Object.assign(
  async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    requests.push({ url, headers: request.headers });

    const match = answers.find(({ path }) => url.pathname === path);

    return match ? match.answer(url) : new Response(null, { status: 404 });
  },
  { preconnect: globalThis.fetch.preconnect },
);

const services = LootlogClient.layer.pipe(
  Layer.provideMerge(
    Layer.succeed(
      BotConfig,
      BotConfig.of({
        environment: "test",
        port: 0,
        serviceName: "discord-bot",
        serviceNamespace: "test",
        discordBotToken: Redacted.make("token"),
        rabbitmqUri: Redacted.make("amqp://test"),
        apiServiceUrl: "http://api.test",
        searchServiceUrl: "http://search.test",
        gatewayServiceUrl: "http://gateway.test",
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

const identityPath = `/internal/guilds/${guildId}/members/${discordId}/identity`;

const linkedMember = {
  path: identityPath,
  answer: () => Response.json({ userId: "user-1", memberId: 1 }),
};

const description = (reply: CommandReply) =>
  reply.embeds?.[0]?.toJSON().description ?? "";

beforeEach(() => {
  answers = [];
  requests = [];
});

describe("slash commands", () => {
  it("reads the invoking Member's own Organization with that Member's identity", async () => {
    answers = [
      linkedMember,
      {
        path: `/guilds/${guildId}/stats/kills`,
        answer: () =>
          Response.json({
            overview: { guildUniqueKills: 3 },
            memberRanking: [
              {
                memberName: "Aria",
                memberUserId: "discord-2",
                totalParticipations: 2,
                participationsByType: { ELITE2: 2 },
              },
              {
                memberName: "Borys",
                memberUserId: "discord-3",
                totalParticipations: 1,
                participationsByType: { ELITE2: 1 },
              },
            ],
          }),
      },
    ];

    const reply = await invoke("ranking", {
      strings: { typ: "ELITE2", okres: "7d" },
    });

    const statsRequest = requests.find(
      ({ url }) => url.pathname === `/guilds/${guildId}/stats/kills`,
    );

    expect(requests[0]?.url.pathname).toBe(identityPath);
    expect(statsRequest?.headers.get("x-auth-user-id")).toBe("user-1");
    expect(statsRequest?.headers.get("x-auth-discord-id")).toBe(discordId);
    expect(statsRequest?.url.searchParams.getAll("npcTypes")).toEqual([
      "ELITE2",
    ]);
    expect(statsRequest?.url.searchParams.get("period")).toBe("7d");
    expect(description(reply).indexOf("Aria")).toBeLessThan(
      description(reply).indexOf("Borys"),
    );
  });

  it("adds the invoker below the top of the ranking with their real position", async () => {
    const memberRanking = Array.from({ length: 20 }, (_, index) => ({
      memberName: index === 17 ? "Invoker" : `Member ${index + 1}`,
      memberUserId: index === 17 ? discordId : `discord-other-${index}`,
      totalParticipations: 20 - index,
      participationsByType: {},
    }));

    answers = [
      linkedMember,
      {
        path: `/guilds/${guildId}/stats/kills`,
        answer: () =>
          Response.json({ overview: { guildUniqueKills: 20 }, memberRanking }),
      },
    ];

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
        memberName: `Member ${index + 1}`,
        memberUserId: `discord-other-${index}`,
        participationCount: 1,
      }));

    const npcReply = async (count: number) => {
      answers = [
        linkedMember,
        {
          path: `/guilds/${guildId}/stats/kills/npcs/7/killers`,
          answer: () =>
            Response.json({
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
        },
      ];

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

    answers = [
      linkedMember,
      {
        path: `/guilds/${guildId}/events`,
        answer: () =>
          Response.json([
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
      },
      {
        path: `/guilds/${guildId}/events/event-1/ranking`,
        answer: () =>
          Response.json([
            entry("A", 2, 10),
            entry("A", 1, 6),
            entry("B", 1, 6),
            entry("B", 3, 8),
          ]),
      },
      {
        path: `/guilds/${guildId}/events/event-1/wrapped`,
        answer: () =>
          Response.json({
            overview: {
              totalKills: 4,
              participantCount: 3,
              totalPoints: 30,
              coveragePercentage: 50,
              totalLoots: 0,
            },
            leaders: {
              topHunter: { winner: null },
              topScorer: { winner: null },
              longestDuty: { winner: null },
            },
          }),
      },
    ];

    const reply = await invoke("event", { subcommand: "podsumowanie" });

    const own = reply.embeds?.[0]
      ?.toJSON()
      .fields?.find(({ name }) => name === COMMAND_TEXT.events.summary.own);

    expect(own?.value).toBe(
      COMMAND_TEXT.events.summary.ownResult(1, 3, "12", 2),
    );
  });

  it("pings the chosen Member only when their statistics are shown publicly", async () => {
    answers = [
      linkedMember,
      {
        path: `/guilds/${guildId}/stats/kills`,
        answer: () =>
          Response.json({
            overview: { guildUniqueKills: 1 },
            memberRanking: [
              {
                memberName: "Aria",
                memberUserId: "discord-2",
                totalParticipations: 1,
                participationsByType: { HERO: 1 },
              },
            ],
          }),
      },
    ];

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
    expect(requests.map(({ url }) => url.pathname)).toEqual([identityPath]);
  });

  it.each([
    { status: 401, message: FAILURE_MESSAGES.reauthenticate },
    { status: 403, message: FAILURE_MESSAGES.forbidden },
    { status: 503, message: FAILURE_MESSAGES.unavailable },
  ])(
    "answers an API status $status with what the player can do about it",
    async ({ status, message }) => {
      answers = [
        linkedMember,
        {
          path: `/guilds/${guildId}/timers`,
          answer: () => new Response(null, { status }),
        },
      ];

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

    answers = [
      linkedMember,
      {
        path: `/guilds/${guildId}/timers`,
        answer: () =>
          Response.json([
            timer("Later", 30, 40),
            timer("Expired", -20, -5),
            { ...timer("Deleted", 5, 10), deletedAt: at(-1) },
            timer("Open", -5, 5),
          ]),
      },
    ];

    const lines = description(await invoke("timery")).split("\n");

    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain("Open");
    expect(lines[1]).toContain("Later");
  });

  it("tells the player an NPC has no visible kills instead of reporting an outage", async () => {
    answers = [
      linkedMember,
      {
        path: `/guilds/${guildId}/stats/kills/npcs/999/killers`,
        answer: () => Response.json({ npc: null, killers: [] }),
      },
    ];

    const reply = await invoke("npc", { strings: { nazwa: "999" } });

    expect(reply.content).toBe(COMMAND_TEXT.npc.notFound);
  });

  it("keeps an event ranking with many heroes within Discord's embed limits", async () => {
    const heroNames = Array.from(
      { length: 30 },
      (_, index) => `Heros ${index}`,
    );

    answers = [
      linkedMember,
      {
        path: `/guilds/${guildId}/events`,
        answer: () =>
          Response.json([
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
      },
      {
        path: `/guilds/${guildId}/events/event-1/ranking`,
        answer: () =>
          Response.json(
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
      },
    ];

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
      sessionId: string,
      platform: string,
      character?: { name: string; world: string },
      isAfk = false,
    ) => ({
      sessionId,
      platform,
      status: "online",
      isAfk,
      ...(character && { character: { ...character, lvl: 100, prof: "w" } }),
    });

    answers = [
      linkedMember,
      {
        path: `/organizations/${guildId}/presence`,
        answer: () =>
          Response.json({
            organizationId: guildId,
            revision: 1,
            presences: [
              presence("1", "game", { name: "Aria", world: "Aldous" }),
              presence("2", "game", { name: "Aria", world: "Aldous" }),
              presence("3", "web-app"),
              presence("4", "game", { name: "Borys", world: "Luvia" }, true),
              presence("5", "game", { name: "Cyra", world: "Luvia" }),
            ],
          }),
      },
    ];

    const reply = await invoke("online");

    expect(reply.embeds?.[0]?.toJSON().title).toBe(
      COMMAND_TEXT.online.title(3),
    );
    expect(description(reply).split("\n")).toEqual([
      COMMAND_TEXT.online.world("Luvia", 2, 1),
      COMMAND_TEXT.online.world("Aldous", 1, 0),
    ]);
    expect(
      requests
        .find(({ url }) => url.host === "gateway.test")
        ?.headers.get("x-auth-user-id"),
    ).toBe("user-1");
  });
});
