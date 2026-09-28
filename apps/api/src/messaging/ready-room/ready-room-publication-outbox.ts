import {
  PartyReadyRoomAggregateSchema,
  type PartyGatheringUpdateEnvelope,
} from "@lootlog/schema/party-ready-room";
import { Effect, Schema } from "effect";
import type { ReadyRoomRedis } from "#src/http-api/handlers/party-ready-room/ready-room.repository";
import { createPartyGatheringUpdateEnvelope } from "./ready-room-projection.js";
import type { ReadyRoomAggregate } from "./ready-room.types.js";

export const READY_ROOM_PUBLICATION_KEYS = [
  "party-ready-room:v3:publications",
  "party-ready-room:v3:publication-due",
] as const;

const CLAIM_PUBLICATION_SCRIPT = `
local ids = redis.call("zrangebyscore", KEYS[2], "-inf", ARGV[1], "LIMIT", 0, 1)
if #ids == 0 then return {} end
local payload = redis.call("hget", KEYS[1], ids[1])
if not payload then
  redis.call("zrem", KEYS[2], ids[1])
  return {}
end
redis.call("zadd", KEYS[2], ARGV[2], ids[1])
return { ids[1], payload }
`;

const ACKNOWLEDGE_PUBLICATION_SCRIPT = `
local payload = redis.call("hget", KEYS[1], ARGV[1])
if not payload then return 0 end
if cjson.decode(payload).revision ~= tonumber(ARGV[2]) then return 0 end
redis.call("hdel", KEYS[1], ARGV[1])
redis.call("zrem", KEYS[2], ARGV[1])
return 1
`;

// Drops a pending entry only while it still holds the undecodable payload, so a
// valid publication committed for the same room in the meantime survives.
const DROP_PUBLICATION_SCRIPT = `
if redis.call("hget", KEYS[1], ARGV[1]) ~= ARGV[2] then return 0 end
redis.call("hdel", KEYS[1], ARGV[1])
redis.call("zrem", KEYS[2], ARGV[1])
return 1
`;

export const makeReadyRoomPublicationOutbox = (
  redis: ReadyRoomRedis,
  publishEnvelope: (
    envelope: PartyGatheringUpdateEnvelope,
  ) => Effect.Effect<void, unknown>,
  clock: () => number = Date.now,
) => {
  const publish = Effect.fn("ReadyRoomPublicationOutbox.publish")(
    function* (aggregate: ReadyRoomAggregate) {
      yield* Effect.forEach(
        aggregate.guildIds,
        (guildId) => {
          const envelope = createPartyGatheringUpdateEnvelope(
            aggregate,
            guildId,
          );

          return publishEnvelope(
            Date.parse(aggregate.expiresAt) <= clock()
              ? {
                  ...envelope,
                  update: {
                    type: "REMOVE",
                    notificationId: aggregate.notificationId,
                    revision: aggregate.revision,
                  },
                }
              : envelope,
          );
        },
        { discard: true },
      );
      yield* redis.eval(
        ACKNOWLEDGE_PUBLICATION_SCRIPT,
        READY_ROOM_PUBLICATION_KEYS,
        [aggregate.notificationId, aggregate.revision],
      );
    },
    Effect.timeout("10 seconds"),
    Effect.catch(() =>
      Effect.logError(
        "Ready Room publication remains pending after delivery failure",
      ),
    ),
  );

  const dispatch = Effect.gen(function* () {
    for (let processed = 0; processed < 100; processed += 1) {
      const now = clock();

      const result = yield* redis.eval(
        CLAIM_PUBLICATION_SCRIPT,
        READY_ROOM_PUBLICATION_KEYS,
        [now, now + 30_000],
      );

      const [id, payload] = yield* Schema.decodeUnknownEffect(
        Schema.Array(Schema.String),
      )(result);

      if (id === undefined || payload === undefined) break;

      yield* Schema.decodeUnknownEffect(
        Schema.fromJsonString(PartyReadyRoomAggregateSchema),
      )(payload).pipe(
        Effect.matchEffect({
          onSuccess: publish,
          // Retrying cannot make the payload decodable; keep it from being
          // claimed again every lease.
          onFailure: () =>
            Effect.logError(
              "Dropping invalid pending Ready Room publication",
            ).pipe(
              Effect.annotateLogs({ notificationId: id }),
              Effect.andThen(
                redis.eval(
                  DROP_PUBLICATION_SCRIPT,
                  READY_ROOM_PUBLICATION_KEYS,
                  [id, payload],
                ),
              ),
            ),
        }),
      );
    }
  });

  const run = Effect.gen(function* () {
    while (true) {
      yield* dispatch.pipe(
        Effect.catch(() =>
          Effect.logError("Ready Room publication dispatch failed"),
        ),
      );
      yield* Effect.sleep("1 second");
    }
  });

  return { publish, dispatch, run };
};
