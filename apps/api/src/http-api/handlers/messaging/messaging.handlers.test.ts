import { describe, expect, it } from "bun:test";
import { Effect, Layer, Schema } from "effect";
import { MessagingControllerSendNotification201 } from "../../contracts/messaging/schemas.js";
import {
  MessagingAccessDenied,
  MessagingData,
  MessagingIdentity,
  sendNotification,
  volunteerForNotification,
} from "./messaging.handlers.js";

const notification = {
  guildIds: ["guild-a"],
  world: "Tempest",
  message: "Hello",
};
const volunteer = {
  world: "Tempest",
  targetDiscordId: "discord-owner",
  character: {
    lvl: 300,
    nick: "Hero",
    accountId: "account-a",
    characterId: "character-a",
    prof: "w",
    icon: "hero.gif",
  },
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
    expect(Schema.is(MessagingControllerSendNotification201)(response)).toBe(
      true,
    );
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

  it("delegates volunteer validation and RabbitMQ delivery exactly once", async () => {
    const calls: Array<[string, string]> = [];
    const layer = provideServices(
      makeData({
        volunteer: (discordId, notificationId) => {
          calls.push([discordId, notificationId]);
          return Effect.void;
        },
      }),
    );

    await Effect.runPromise(
      volunteerForNotification("notification-a", volunteer).pipe(
        Effect.provide(layer),
      ),
    );
    expect(calls).toEqual([["discord-a", "notification-a"]]);
  });
});
