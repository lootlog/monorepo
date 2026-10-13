import { beforeEach, describe, expect, it } from "bun:test";
import { Effect, Layer, Redacted } from "effect";
import { FetchHttpClient } from "effect/http";
import { BotConfig } from "#src/config/bot-config";
import { FAILURE_MESSAGES } from "./command-messages.js";
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
  } = {},
): Promise<CommandReply> => {
  const invocation: CommandInvocation = {
    guildId,
    discordId,
    appPermissions: 0n,
    options: {
      subcommand: options.subcommand ?? null,
      string: (name) => options.strings?.[name] ?? null,
      boolean: () => null,
      user: () => null,
    },
  };

  return Effect.runPromise(
    answerCommand(commandName, invocation).pipe(Effect.provide(services)),
  );
};

const identityPath = `/internal/guilds/${guildId}/members/${discordId}/identity`;

const linkedMember = {
  path: identityPath,
  answer: () => Response.json({ userId: "user-1" }),
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
      npc: { name, lvl: 100, type: "ELITE2", location: "Mapa" },
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

  it("counts characters in the game once and leaves out Web sessions", async () => {
    const presence = (
      sessionId: string,
      platform: string,
      character?: { name: string; lvl: number },
    ) => ({
      sessionId,
      platform,
      status: "online",
      isAfk: false,
      ...(character && {
        character: { ...character, world: "Aldous", prof: "w" },
      }),
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
              presence("1", "game", { name: "Aria", lvl: 120 }),
              presence("2", "game", { name: "Aria", lvl: 120 }),
              presence("3", "web-app"),
              presence("4", "game", { name: "Borys", lvl: 80 }),
            ],
          }),
      },
    ];

    const reply = await invoke("online");

    expect(reply.embeds?.[0]?.toJSON().title).toBe("W grze: 2");
    expect(description(reply).match(/Aria/g)).toHaveLength(1);
    expect(
      requests
        .find(({ url }) => url.host === "gateway.test")
        ?.headers.get("x-auth-user-id"),
    ).toBe("user-1");
  });
});
