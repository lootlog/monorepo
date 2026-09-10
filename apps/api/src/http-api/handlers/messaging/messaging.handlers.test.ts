import { describe, expect, it } from "bun:test";
import { Effect, Layer, Schema } from "effect";
import { SentNotificationResponse } from "#src/contracts/messaging/schemas";
import {
  MessagingAccessDenied,
  MessagingData,
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
  it("preserves both authenticated identities and the notification response", async () => {
    const callers: unknown[] = [];

    const layer = provideServices(
      makeData({
        sendNotification: (caller) => {
          callers.push(caller);

          return Effect.succeed({
            notificationId: "notification-a",
            guildIds: ["guild-a"],
          });
        },
      }),
    );

    const response = await Effect.runPromise(
      sendNotification(notification).pipe(Effect.provide(layer)),
    );

    expect(callers).toEqual([{ userId: "user-a", discordId: "discord-a" }]);
    expect(Schema.is(SentNotificationResponse)(response)).toBe(true);
  });

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

          return Effect.succeed({});
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
