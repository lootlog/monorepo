import { expect, test } from "bun:test";
import { Effect } from "effect";
import { MessagingIdentity } from "../handlers/messaging/messaging.handlers.js";
import { ReadyRoomAuthorization } from "../handlers/party-ready-room/party-ready-room.handlers.js";
import { SettingsIdentity } from "../handlers/settings/settings.handlers.js";
import { UserLootlogConfigIdentity } from "../handlers/user-lootlog-config/user-lootlog-config.handlers.js";
import { ForwardAuthIdentity } from "./forward-auth-identity.js";
import { RequestIdentityLayers } from "./request-identity-layers.js";

const requestIdentity = {
  userId: "user-1",
  discordId: "discord-1",
} as const;

test("maps the same request-scoped identity into every identity-only handler port", async () => {
  const values = await Effect.gen(function* () {
    const settings = yield* SettingsIdentity;
    const config = yield* UserLootlogConfigIdentity;
    const messaging = yield* MessagingIdentity;
    const readyRoom = yield* ReadyRoomAuthorization;

    return {
      settingsUserId: yield* settings.userId,
      configDiscordId: yield* config.discordId,
      messagingCaller: yield* messaging.caller,
      readyRoomIdentity: yield* readyRoom.identity,
    };
  }).pipe(
    Effect.provide(RequestIdentityLayers),
    Effect.provideService(ForwardAuthIdentity, requestIdentity),
    Effect.runPromise,
  );

  expect(values).toEqual({
    settingsUserId: "user-1",
    configDiscordId: "discord-1",
    messagingCaller: requestIdentity,
    readyRoomIdentity: requestIdentity,
  });
});
