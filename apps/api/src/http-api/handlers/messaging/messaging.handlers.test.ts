import { describe, expect, it } from "bun:test";
import { Effect, Layer } from "effect";
import { MessagingData } from "#src/messaging/messaging-data";
import {
  MessagingAccessDenied,
  MessagingIdentity,
  sendNotification,
} from "./messaging.handlers.js";

const notification = {
  guildIds: ["guild-a"],
  world: "Tempest",
  message: "Hello",
};

const makeData = (overrides: Partial<MessagingData["Service"]> = {}) =>
  MessagingData.of({
    sendNotification: () =>
      Effect.succeed({
        notificationId: "notification-a",
        guildIds: ["guild-a"],
      }),
    volunteer: () => Effect.void,
    going: () =>
      Effect.succeed({ notificationId: "notification-a", guilds: [] }),
    ...overrides,
  });

const provideServices = (
  data: MessagingData["Service"],
  identity = MessagingIdentity.of({
    caller: Effect.succeed({ userId: "user-a", discordId: "discord-a" }),
  }),
) =>
  Layer.merge(
    Layer.succeed(MessagingData, data),
    Layer.succeed(MessagingIdentity, identity),
  );

describe("messaging HttpApi handlers", () => {
  it("fails closed before rate limiting or delivery when auth is missing", async () => {
    const denied = new MessagingAccessDenied({
      status: 401,
      code: "AUTH_REQUIRED",
    });

    let dataCalled = false;

    const layer = provideServices(
      makeData({
        sendNotification: () => {
          dataCalled = true;

          return Effect.succeed({ notificationId: "room-a", guildIds: [] });
        },
      }),
      MessagingIdentity.of({ caller: Effect.fail(denied) }),
    );

    const error = await Effect.runPromise(
      Effect.flip(sendNotification(notification).pipe(Effect.provide(layer))),
    );

    expect(error).toBe(denied);
    expect(dataCalled).toBe(false);
  });
});
