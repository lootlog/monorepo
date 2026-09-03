import { Effect, Layer } from "effect";
import { MessagingIdentity } from "#src/http-api/handlers/messaging/messaging.handlers";
import { ReadyRoomAuthorization } from "#src/http-api/handlers/party-ready-room/party-ready-room.handlers";
import { SettingsIdentity } from "#src/http-api/handlers/settings/settings.operations";
import { UserLootlogConfigIdentity } from "#src/http-api/handlers/user-lootlog-config/user-lootlog-config.handlers";
import { ForwardAuthIdentity } from "#src/http-api/runtime/auth/forward-auth-identity";

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
