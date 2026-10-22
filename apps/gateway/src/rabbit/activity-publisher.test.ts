import { describe, expect, test } from "bun:test";
import { MessagingError } from "@lootlog/messaging";
import { Effect, Redacted } from "effect";
import { ActivityPublisher } from "#src/rabbit/activity-publisher";
import type { SessionData } from "#src/realtime/session";

const guild = (id: string) => ({
  guild: { id, ownerId: "owner" },
  roles: [],
});

const gameSession = (): SessionData => ({
  discordId: "discord-1",
  userId: "user-1",
  connectionId: "connection-1",
  platform: "game",
  joined: true,
  guilds: [guild("organization-1"), guild("organization-2")],
  subscriptions: new Map(),
  airTagScopes: [],
  confidence: "reported",
  character: {
    world: "luvia",
    name: "Hero",
    lvl: 114,
    icon: "hero.gif",
    characterId: "10",
    accountId: "20",
    prof: "w",
  },
});

const makePublisher = () => {
  const logged: Array<{ type: string; guildId: string }> = [];
  // How many upcoming publications RabbitMQ rejects.
  const failures = { remaining: 0 };

  const publisher = new ActivityPublisher(
    {
      publish: ({ content }) =>
        failures.remaining-- > 0
          ? Effect.fail(
              new MessagingError({
                operation: "publish",
                message: "RabbitMQ unavailable",
                cause: undefined,
              }),
            )
          : Effect.sync(() => {
              const { type, guildId } = JSON.parse(
                new TextDecoder().decode(content),
              );

              logged.push({ type, guildId });
            }),
    },
    { activityEventSignatureSecret: Redacted.make("secret") },
  );

  return { publisher, logged, failures };
};

describe("ActivityPublisher", () => {
  test("logs a session once per Lootlog and disconnects it only where it connected", async () => {
    const { publisher, logged } = makePublisher();
    const session = gameSession();

    const publish = (
      type: "CONNECT_EVENT" | "DISCONNECT_EVENT",
      ids?: string[],
    ) => Effect.runPromise(publisher.publish(type, session, ids));

    await publish("CONNECT_EVENT", ["organization-1"]);
    await publish("CONNECT_EVENT", ["organization-1"]);
    await publish("DISCONNECT_EVENT", ["organization-2"]);
    await publish("CONNECT_EVENT", ["organization-2"]);
    await publish("DISCONNECT_EVENT", ["organization-1"]);
    await publish("DISCONNECT_EVENT");

    expect(logged).toEqual([
      { type: "CONNECT_EVENT", guildId: "organization-1" },
      { type: "CONNECT_EVENT", guildId: "organization-2" },
      { type: "DISCONNECT_EVENT", guildId: "organization-1" },
      { type: "DISCONNECT_EVENT", guildId: "organization-2" },
    ]);
  });

  test("retries a rejected connection and keeps a Lootlog whose disconnection was rejected", async () => {
    const { publisher, logged, failures } = makePublisher();
    const session = gameSession();

    const publish = (
      type: "CONNECT_EVENT" | "DISCONNECT_EVENT",
      ids?: string[],
    ) => Effect.runPromise(publisher.publish(type, session, ids));

    failures.remaining = 1;
    await publish("CONNECT_EVENT", ["organization-1"]);
    await publish("CONNECT_EVENT", ["organization-1"]);
    failures.remaining = 1;
    await publish("DISCONNECT_EVENT");
    await publish("DISCONNECT_EVENT");

    expect(logged).toEqual([
      { type: "CONNECT_EVENT", guildId: "organization-1" },
      { type: "DISCONNECT_EVENT", guildId: "organization-1" },
    ]);
  });
});
