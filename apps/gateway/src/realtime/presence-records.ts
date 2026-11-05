import {
  BasicPresence,
  PRESENCE_EXPIRY_MS,
  PresenceWithLocation,
} from "@lootlog/protocol/realtime";
import { Effect, Option, Schema } from "effect";
import type { RedisGatewayStore } from "#src/platform/redis-store";
import { RealtimeStoreError, storeCall } from "#src/realtime/realtime-errors";

export type PresenceRedis = {
  readonly command: Pick<
    RedisGatewayStore["command"],
    "get" | "set" | "sadd" | "smembers" | "mget" | "incr" | "eval"
  >;
};

export type Basic = typeof BasicPresence.Type;

export type Precise = typeof PresenceWithLocation.Type;

export type PresenceChange =
  | { readonly action: "upsert"; readonly presence: Basic | Precise }
  | {
      readonly action: "remove";
      readonly userId: string;
      readonly discordId: string;
      readonly sessionId: string;
    };

export const presenceKey = (organizationId: string, sessionId: string) =>
  `presence:${organizationId}:${sessionId}`;

export const indexKey = (organizationId: string) =>
  `presence:index:${organizationId}`;

export const metadataKey = (organizationId: string, sessionId: string) =>
  `presence:metadata:${organizationId}:${sessionId}`;

export const revisionKey = (organizationId: string) =>
  `presence:revision:${organizationId}`;

// Releases a lease only while its holder still owns it.
const RELEASE_LEASE = `
-- presence:lease-release
if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) end
return 0
`;

export const releaseLease = (
  redis: PresenceRedis,
  operation: string,
  key: string,
  token: string,
) =>
  storeCall(operation, () =>
    redis.command.eval(RELEASE_LEASE, 1, key, token),
  ).pipe(Effect.interruptible, Effect.timeout("1 second"), Effect.ignore);

export const decodeStoredKeys = Schema.decodeUnknownEffect(
  Schema.fromJsonString(Schema.Array(Schema.String)),
);

export const decodePresenceOption = Schema.decodeUnknownOption(
  Schema.fromJsonString(Schema.Union([PresenceWithLocation, BasicPresence])),
);

export const decodeMetadataOption = Schema.decodeUnknownOption(
  Schema.fromJsonString(
    Schema.Struct({
      userId: Schema.String,
      discordId: Schema.String,
      presence: Schema.optional(BasicPresence),
    }),
  ),
);

export const withoutLocation = (presence: Basic | Precise): Basic => {
  if (!("location" in presence)) return presence;
  const { location: _location, ...basic } = presence;

  return basic;
};

/** The Organization's unexpired presences, read fresh from Redis. */
export const readOrganization = (
  redis: PresenceRedis,
  organizationId: string,
  now: () => number,
): Effect.Effect<Array<Basic | Precise>, RealtimeStoreError> =>
  storeCall("presence.list-organization", () =>
    redis.command.smembers(indexKey(organizationId)),
  ).pipe(
    Effect.flatMap((keys) =>
      keys.length === 0
        ? Effect.succeed([])
        : storeCall("presence.read-organization", () =>
            redis.command.mget(keys),
          ).pipe(
            Effect.map((values) =>
              values.flatMap((value) => {
                const presence = value
                  ? decodePresenceOption(value)
                  : Option.none();

                return Option.isSome(presence) &&
                  now() - presence.value.lastSeen < PRESENCE_EXPIRY_MS
                  ? [presence.value]
                  : [];
              }),
            ),
          ),
    ),
  );
