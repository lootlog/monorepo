import { expect, test } from "bun:test";
import {
  createEventsLoopbackDispatcher,
  createNotificationsLoopbackDispatcher,
  LegacyLoopbackHttpError,
  type FastifyInjector,
} from "./legacy-loopback-dispatcher.js";

const identity = { userId: "user-1", discordId: "discord-1" } as const;

test("derives the legacy Events request from generated endpoint metadata", async () => {
  const calls: unknown[] = [];
  const app: FastifyInjector = {
    inject: (options) => {
      calls.push(options);
      return Promise.resolve({
        statusCode: 200,
        payload: JSON.stringify([{ id: "event-1" }]),
      });
    },
  };

  const result = await createEventsLoopbackDispatcher(app)(
    "listEvents",
    {
      params: { guildId: "guild/alias" },
      query: { world: "Aldous", npcTypes: ["HERO", "TITAN"] },
    },
    identity,
  );

  expect(result).toEqual([{ id: "event-1" }]);
  expect(calls).toEqual([
    {
      method: "GET",
      url: "/guilds/guild%2Falias/events?world=Aldous&npcTypes=HERO&npcTypes=TITAN",
      headers: {
        "x-auth-user-id": "user-1",
        "x-auth-discord-id": "discord-1",
      },
    },
  ]);
});

test("forwards payloads without exposing the legacy Nest server", async () => {
  const calls: unknown[] = [];
  const app: FastifyInjector = {
    inject: (options) => {
      calls.push(options);
      return Promise.resolve({ statusCode: 201, payload: '{"id":"target-1"}' });
    },
  };
  const payload = { type: "DISCORD_DM" };

  await createNotificationsLoopbackDispatcher(app)(
    "NotificationsUserControllerCreateUserTarget",
    { payload },
    identity,
  );

  expect(calls).toEqual([
    {
      method: "POST",
      url: "/users/@me/notifications/targets",
      headers: {
        "x-auth-user-id": "user-1",
        "x-auth-discord-id": "discord-1",
      },
      payload,
    },
  ]);
});

test("retains the exact non-success status and parsed body", async () => {
  const app: FastifyInjector = {
    inject: () =>
      Promise.resolve({
        statusCode: 404,
        payload: '{"message":"not found"}',
      }),
  };

  const promise = createNotificationsLoopbackDispatcher(app)(
    "NotificationsUserControllerGetUserTargets",
    {},
    identity,
  );

  await expect(promise).rejects.toMatchObject({
    status: 404,
    body: { message: "not found" },
  });
  await expect(promise).rejects.toBeInstanceOf(LegacyLoopbackHttpError);
});
