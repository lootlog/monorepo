import { Effect } from "effect";
import {
  COMMIT_READY_ROOM_SCRIPT,
  CREATE_READY_ROOM_SCRIPT,
  EXIT_READY_ROOM_PARTICIPANT_SCRIPT,
  FIND_READY_ROOM_IDS_SCRIPT,
  JOIN_READY_ROOM_SCRIPT,
  PRUNE_READY_ROOM_USER_INDEX_SCRIPT,
  TERMINATE_READY_ROOM_SCRIPT,
} from "#src/messaging/ready-room/ready-room-redis-scripts";
import type { ReadyRoomAggregate } from "#src/messaging/ready-room/ready-room.types";

export type CreateReadyRoomResult =
  | { readonly status: "created"; readonly aggregate: ReadyRoomAggregate }
  | { readonly status: "active-room-exists"; readonly notificationId: string }
  | { readonly status: "joined-elsewhere"; readonly notificationId: string }
  | { readonly status: "room-exists" };

export type CommitReadyRoomResult =
  | { readonly status: "committed"; readonly aggregate: ReadyRoomAggregate }
  | { readonly status: "conflict" }
  | { readonly status: "missing" };

export type JoinReadyRoomResult =
  | CommitReadyRoomResult
  | { readonly status: "joined-elsewhere"; readonly notificationId: string };

const ROOM_PREFIX = "party-ready-room:v3:room:";
const ORGANIZER_PREFIX = "party-ready-room:v3:organizer:";
const USER_PREFIX = "party-ready-room:v3:user:";
const CHARACTER_PREFIX = "party-ready-room:v3:character:";
const TERMINAL_TOMBSTONE_SECONDS = 60;

export interface ReadyRoomRedis {
  readonly getJson: <A>(key: string) => Effect.Effect<A | null, unknown>;
  readonly eval: <A>(
    script: string,
    keys: ReadonlyArray<string>,
    arguments_: ReadonlyArray<string | number>,
  ) => Effect.Effect<A, unknown>;
}

export interface ReadyRoomEffectRepository {
  readonly create: (
    aggregate: ReadyRoomAggregate,
  ) => Effect.Effect<CreateReadyRoomResult, unknown>;
  readonly get: (
    notificationId: string,
  ) => Effect.Effect<ReadyRoomAggregate | null, unknown>;
  readonly findForUser: (
    discordId: string,
  ) => Effect.Effect<ReadonlyArray<ReadyRoomAggregate>, unknown>;
  readonly commit: (
    expected: ReadyRoomAggregate,
    next: ReadyRoomAggregate,
  ) => Effect.Effect<CommitReadyRoomResult, unknown>;
  readonly join: (
    expected: ReadyRoomAggregate,
    next: ReadyRoomAggregate,
    participantId: string,
  ) => Effect.Effect<JoinReadyRoomResult, unknown>;
  readonly exitParticipant: (
    expected: ReadyRoomAggregate,
    next: ReadyRoomAggregate,
    participantId: string,
  ) => Effect.Effect<CommitReadyRoomResult, unknown>;
  readonly terminate: (
    expected: ReadyRoomAggregate,
    next: ReadyRoomAggregate,
  ) => Effect.Effect<CommitReadyRoomResult, unknown>;
}

const roomKey = (id: string) => `${ROOM_PREFIX}${id}`;
const organizerKey = (id: string) => `${ORGANIZER_PREFIX}${id}`;
const userKey = (id: string) => `${USER_PREFIX}${id}`;
const characterKey = (world: string, id: string) =>
  `${CHARACTER_PREFIX}${encodeURIComponent(world)}:${encodeURIComponent(id)}`;

const remainingTtl = (aggregate: ReadyRoomAggregate, clock: () => number) =>
  Math.ceil((Date.parse(aggregate.expiresAt) - clock()) / 1000);

const parseCommit = (
  result: unknown,
  aggregate: ReadyRoomAggregate,
): CommitReadyRoomResult => {
  if (!Array.isArray(result) || typeof result[0] !== "string") {
    throw new Error("Invalid Ready Room commit result from Redis");
  }
  if (result[0] === "COMMITTED") return { status: "committed", aggregate };
  if (result[0] === "CONFLICT") return { status: "conflict" };
  if (result[0] === "MISSING") return { status: "missing" };
  throw new Error(`Unknown Ready Room commit result: ${String(result[0])}`);
};

const parseCreate = (
  result: unknown,
  aggregate: ReadyRoomAggregate,
): CreateReadyRoomResult => {
  if (!Array.isArray(result) || typeof result[0] !== "string") {
    throw new Error("Invalid Ready Room create result from Redis");
  }
  if (result[0] === "CREATED") return { status: "created", aggregate };
  if (result[0] === "ACTIVE_ROOM_EXISTS" && typeof result[1] === "string") {
    return { status: "active-room-exists", notificationId: result[1] };
  }
  if (result[0] === "JOINED_ELSEWHERE" && typeof result[1] === "string") {
    return { status: "joined-elsewhere", notificationId: result[1] };
  }
  if (result[0] === "ROOM_EXISTS") return { status: "room-exists" };
  throw new Error(`Unknown Ready Room create result: ${String(result[0])}`);
};

export const makeReadyRoomRepository = (
  redis: ReadyRoomRedis,
  clock: () => number = Date.now,
): ReadyRoomEffectRepository => {
  const get = (notificationId: string) =>
    redis.getJson<ReadyRoomAggregate>(roomKey(notificationId));
  return {
    get,
    findForUser: (discordId) =>
      redis
        .eval<unknown>(
          FIND_READY_ROOM_IDS_SCRIPT,
          [organizerKey(discordId), userKey(discordId)],
          [clock()],
        )
        .pipe(
          Effect.flatMap((result) => {
            if (
              !Array.isArray(result) ||
              !result.every((id) => typeof id === "string")
            ) {
              return Effect.fail(
                new Error("Invalid Ready Room index result from Redis"),
              );
            }
            const ids = [...new Set(result as string[])];
            return Effect.all(ids.map(get)).pipe(
              Effect.tap((aggregates) => {
                const missing = ids.filter((_, index) => !aggregates[index]);
                return missing.length === 0
                  ? Effect.void
                  : redis
                      .eval(
                        PRUNE_READY_ROOM_USER_INDEX_SCRIPT,
                        [userKey(discordId)],
                        missing,
                      )
                      .pipe(Effect.asVoid);
              }),
              Effect.map((aggregates) =>
                aggregates.filter(
                  (item): item is ReadyRoomAggregate => item !== null,
                ),
              ),
            );
          }),
        ),
    create: (aggregate) => {
      const ttl = remainingTtl(aggregate, clock);
      if (ttl <= 0) {
        return Effect.fail(new Error("Ready Room must expire in the future"));
      }
      return redis
        .eval<unknown>(
          CREATE_READY_ROOM_SCRIPT,
          [
            roomKey(aggregate.notificationId),
            organizerKey(aggregate.organizerDiscordId),
            characterKey(
              aggregate.world,
              aggregate.organizerCharacter.characterId,
            ),
          ],
          [
            ROOM_PREFIX,
            JSON.stringify(aggregate),
            aggregate.notificationId,
            ttl,
          ],
        )
        .pipe(
          Effect.flatMap((result) =>
            Effect.try({
              try: () => parseCreate(result, aggregate),
              catch: (error) => error,
            }),
          ),
        );
    },
    commit: (expected, next) => {
      const ttl = remainingTtl(next, clock);
      if (ttl <= 0) return Effect.succeed({ status: "missing" as const });
      return redis
        .eval<unknown>(
          COMMIT_READY_ROOM_SCRIPT,
          [roomKey(next.notificationId)],
          [JSON.stringify(expected), JSON.stringify(next), ttl],
        )
        .pipe(
          Effect.flatMap((result) =>
            Effect.try({
              try: () => parseCommit(result, next),
              catch: (error) => error,
            }),
          ),
        );
    },
    join: (expected, next, participantId) => {
      const ttl = remainingTtl(next, clock);
      if (ttl <= 0) return Effect.succeed({ status: "missing" as const });
      const participant = next.participants[participantId];
      if (!participant) return Effect.succeed({ status: "conflict" as const });
      return redis
        .eval<unknown>(
          JOIN_READY_ROOM_SCRIPT,
          [
            roomKey(next.notificationId),
            userKey(participant.discordId),
            characterKey(next.world, participant.character.characterId),
          ],
          [
            JSON.stringify(expected),
            JSON.stringify(next),
            next.notificationId,
            Date.parse(next.expiresAt),
            ttl,
            ROOM_PREFIX,
          ],
        )
        .pipe(
          Effect.flatMap(
            (result): Effect.Effect<JoinReadyRoomResult, unknown> => {
              if (
                Array.isArray(result) &&
                result[0] === "JOINED_ELSEWHERE" &&
                typeof result[1] === "string"
              ) {
                return Effect.succeed<JoinReadyRoomResult>({
                  status: "joined-elsewhere" as const,
                  notificationId: result[1],
                });
              }
              return Effect.try({
                try: () => parseCommit(result, next),
                catch: (error) => error,
              });
            },
          ),
        );
    },
    exitParticipant: (expected, next, participantId) => {
      const ttl = remainingTtl(next, clock);
      if (ttl <= 0) return Effect.succeed({ status: "missing" as const });
      const participant = expected.participants[participantId];
      if (!participant) return Effect.succeed({ status: "conflict" as const });
      const ownerStillPresent = Object.values(next.participants).some(
        (candidate) => candidate.discordId === participant.discordId,
      );
      return redis
        .eval<unknown>(
          EXIT_READY_ROOM_PARTICIPANT_SCRIPT,
          [
            roomKey(next.notificationId),
            userKey(participant.discordId),
            characterKey(next.world, participant.character.characterId),
          ],
          [
            JSON.stringify(expected),
            JSON.stringify(next),
            next.notificationId,
            ttl,
            ownerStillPresent ? 1 : 0,
          ],
        )
        .pipe(
          Effect.flatMap((result) =>
            Effect.try({
              try: () => parseCommit(result, next),
              catch: (error) => error,
            }),
          ),
        );
    },
    terminate: (expected, next) => {
      const remaining = remainingTtl(next, clock);
      if (remaining <= 0) {
        return Effect.succeed({ status: "missing" as const });
      }
      const participantKeys = Object.values(expected.participants).flatMap(
        (participant) => [
          userKey(participant.discordId),
          characterKey(expected.world, participant.character.characterId),
        ],
      );
      return redis
        .eval<unknown>(
          TERMINATE_READY_ROOM_SCRIPT,
          [
            roomKey(next.notificationId),
            organizerKey(next.organizerDiscordId),
            characterKey(
              expected.world,
              expected.organizerCharacter.characterId,
            ),
            ...participantKeys,
          ],
          [
            JSON.stringify(expected),
            JSON.stringify(next),
            next.notificationId,
            Math.min(remaining, TERMINAL_TOMBSTONE_SECONDS),
          ],
        )
        .pipe(
          Effect.flatMap((result) =>
            Effect.try({
              try: () => parseCommit(result, next),
              catch: (error) => error,
            }),
          ),
        );
    },
  };
};
