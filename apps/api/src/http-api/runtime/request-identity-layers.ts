import { Effect, Layer } from "effect";
import { MessagingIdentity } from "../handlers/messaging/messaging.handlers.js";
import { ReadyRoomAuthorization } from "../handlers/party-ready-room/party-ready-room.handlers.js";
import { SettingsIdentity } from "../handlers/settings/settings.handlers.js";
import { UserLootlogConfigIdentity } from "../handlers/user-lootlog-config/user-lootlog-config.handlers.js";
import { ForwardAuthIdentity } from "./forward-auth-identity.js";

const requestScopedIdentity = Effect.map(
  ForwardAuthIdentity,
  ({ discordId, userId }) => ({ discordId, userId }),
) as Effect.Effect<{ readonly discordId: string; readonly userId: string }>;

const SettingsIdentityLive = Layer.succeed(
  SettingsIdentity,
  SettingsIdentity.of({
    userId: Effect.map(requestScopedIdentity, ({ userId }) => userId),
  }),
);

const UserLootlogConfigIdentityLive = Layer.succeed(
  UserLootlogConfigIdentity,
  UserLootlogConfigIdentity.of({
    discordId: Effect.map(requestScopedIdentity, ({ discordId }) => discordId),
  }),
);

const MessagingIdentityLive = Layer.succeed(
  MessagingIdentity,
  MessagingIdentity.of({ caller: requestScopedIdentity }),
);

const ReadyRoomAuthorizationLive = Layer.succeed(
  ReadyRoomAuthorization,
  ReadyRoomAuthorization.of({ identity: requestScopedIdentity }),
);

/** Identity-only handler ports backed by the request-scoped forward-auth pair. */
export const RequestIdentityLayers = Layer.mergeAll(
  SettingsIdentityLive,
  UserLootlogConfigIdentityLive,
  MessagingIdentityLive,
  ReadyRoomAuthorizationLive,
);
