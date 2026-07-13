import { RedisService } from "@lootlog/nest-shared/redis";
import {
  ACCEPT_READY_ROOM_PARTICIPANT_SCRIPT,
  COMMIT_READY_ROOM_SCRIPT,
  CREATE_READY_ROOM_SCRIPT,
  EXIT_READY_ROOM_PARTICIPANT_SCRIPT,
  FIND_READY_ROOM_IDS_SCRIPT,
  PRUNE_READY_ROOM_USER_INDEX_SCRIPT,
  SAVE_READY_ROOM_APPLICATION_SCRIPT,
  TERMINATE_READY_ROOM_SCRIPT,
} from "src/messaging/ready-room/ready-room-redis-scripts";
import type {
  AcceptReadyRoomResult,
  CommitReadyRoomResult,
  CreateReadyRoomResult,
  ReadyRoomRepository,
} from "src/messaging/ready-room/ready-room.repository";
import type { ReadyRoomAggregate } from "src/messaging/ready-room/ready-room.types";

type Clock = () => number;

const ROOM_KEY_PREFIX = "party-ready-room:v2:room:";
const ORGANIZER_KEY_PREFIX = "party-ready-room:v2:organizer:";
const USER_KEY_PREFIX = "party-ready-room:v2:user:";
const ACCEPTED_KEY_PREFIX = "party-ready-room:v2:accepted:";
const TERMINAL_TOMBSTONE_SECONDS = 60;

function getRoomKey(notificationId: string): string {
  return `${ROOM_KEY_PREFIX}${notificationId}`;
}

function getOrganizerKey(discordId: string): string {
  return `${ORGANIZER_KEY_PREFIX}${discordId}`;
}

function getUserKey(discordId: string): string {
  return `${USER_KEY_PREFIX}${discordId}`;
}

function getAcceptedKey(
  discordId: string,
  accountId: string,
  characterId: string,
): string {
  return `${ACCEPTED_KEY_PREFIX}${encodeURIComponent(discordId)}:${encodeURIComponent(accountId)}:${encodeURIComponent(characterId)}`;
}

function parseAcceptResult(
  result: unknown,
  aggregate: ReadyRoomAggregate,
): AcceptReadyRoomResult {
  if (
    Array.isArray(result) &&
    result[0] === "ACCEPTED_ELSEWHERE" &&
    typeof result[1] === "string"
  ) {
    return {
      status: "accepted-elsewhere",
      notificationId: result[1],
    };
  }

  return parseCommitResult(result, aggregate);
}

function parseCommitResult(
  result: unknown,
  aggregate: ReadyRoomAggregate,
): CommitReadyRoomResult {
  if (!Array.isArray(result) || typeof result[0] !== "string") {
    throw new Error("Invalid Ready Room commit result from Redis");
  }

  if (result[0] === "COMMITTED") {
    return { status: "committed", aggregate };
  }
  if (result[0] === "CONFLICT") {
    return { status: "conflict" };
  }
  if (result[0] === "MISSING") {
    return { status: "missing" };
  }

  throw new Error(`Unknown Ready Room commit result: ${String(result[0])}`);
}

function parseCreateResult(
  result: unknown,
  aggregate: ReadyRoomAggregate,
): CreateReadyRoomResult {
  if (!Array.isArray(result) || typeof result[0] !== "string") {
    throw new Error("Invalid Ready Room create result from Redis");
  }

  if (result[0] === "CREATED") {
    return { status: "created", aggregate };
  }

  if (result[0] === "ACTIVE_ROOM_EXISTS" && typeof result[1] === "string") {
    return {
      status: "active-room-exists",
      notificationId: result[1],
    };
  }

  if (result[0] === "ROOM_EXISTS") {
    return { status: "room-exists" };
  }

  throw new Error(`Unknown Ready Room create result: ${String(result[0])}`);
}

export class ReadyRoomRedisRepository implements ReadyRoomRepository {
  constructor(
    private readonly redisService: RedisService,
    private readonly clock: Clock = Date.now,
  ) {}

  get(notificationId: string): Promise<ReadyRoomAggregate | null> {
    return this.redisService.getJson<ReadyRoomAggregate>(
      getRoomKey(notificationId),
    );
  }

  async findForUser(discordId: string): Promise<ReadyRoomAggregate[]> {
    const roomIdsResult = await this.redisService.eval<unknown>(
      FIND_READY_ROOM_IDS_SCRIPT,
      [getOrganizerKey(discordId), getUserKey(discordId)],
      [this.clock()],
    );
    if (
      !Array.isArray(roomIdsResult) ||
      !roomIdsResult.every((roomId) => typeof roomId === "string")
    ) {
      throw new Error("Invalid Ready Room index result from Redis");
    }

    const roomIds = [...new Set(roomIdsResult as string[])];
    const aggregates = await Promise.all(
      roomIds.map((notificationId) => this.get(notificationId)),
    );
    const missingRoomIds = roomIds.filter((_, index) => !aggregates[index]);
    if (missingRoomIds.length > 0) {
      await this.redisService.eval(
        PRUNE_READY_ROOM_USER_INDEX_SCRIPT,
        [getUserKey(discordId)],
        missingRoomIds,
      );
    }

    return aggregates.filter(
      (aggregate): aggregate is ReadyRoomAggregate => aggregate !== null,
    );
  }

  async commit(
    expected: ReadyRoomAggregate,
    next: ReadyRoomAggregate,
  ): Promise<CommitReadyRoomResult> {
    const ttlSeconds = this.getRemainingTtlSeconds(next);
    if (ttlSeconds <= 0) {
      return { status: "missing" };
    }

    const result = await this.redisService.eval<unknown>(
      COMMIT_READY_ROOM_SCRIPT,
      [getRoomKey(next.notificationId)],
      [JSON.stringify(expected), JSON.stringify(next), ttlSeconds],
    );

    return parseCommitResult(result, next);
  }

  async exitParticipant(
    expected: ReadyRoomAggregate,
    next: ReadyRoomAggregate,
    participantId: string,
  ): Promise<CommitReadyRoomResult> {
    const ttlSeconds = this.getRemainingTtlSeconds(next);
    if (ttlSeconds <= 0) {
      return { status: "missing" };
    }

    const participant = expected.participants[participantId];
    if (!participant) return { status: "conflict" };
    const ownerHasAnotherActiveParticipant = Object.values(
      next.participants,
    ).some(
      (candidate) =>
        candidate.discordId === participant.discordId &&
        (candidate.application === "APPLIED" ||
          candidate.application === "ACCEPTED"),
    );
    const result = await this.redisService.eval<unknown>(
      EXIT_READY_ROOM_PARTICIPANT_SCRIPT,
      [
        getRoomKey(next.notificationId),
        getUserKey(participant.discordId),
        getAcceptedKey(
          participant.discordId,
          participant.character.accountId,
          participant.character.characterId,
        ),
      ],
      [
        JSON.stringify(expected),
        JSON.stringify(next),
        next.notificationId,
        ttlSeconds,
        ownerHasAnotherActiveParticipant ? 1 : 0,
      ],
    );

    return parseCommitResult(result, next);
  }

  async terminate(
    expected: ReadyRoomAggregate,
    next: ReadyRoomAggregate,
  ): Promise<CommitReadyRoomResult> {
    const remainingTtlSeconds = this.getRemainingTtlSeconds(next);
    if (remainingTtlSeconds <= 0) {
      return { status: "missing" };
    }
    const tombstoneTtlSeconds = Math.min(
      remainingTtlSeconds,
      TERMINAL_TOMBSTONE_SECONDS,
    );
    const participantIndexKeys = Object.values(expected.participants).flatMap(
      (participant) => [
        getUserKey(participant.discordId),
        getAcceptedKey(
          participant.discordId,
          participant.character.accountId,
          participant.character.characterId,
        ),
      ],
    );
    const result = await this.redisService.eval<unknown>(
      TERMINATE_READY_ROOM_SCRIPT,
      [
        getRoomKey(next.notificationId),
        getOrganizerKey(next.organizerDiscordId),
        ...participantIndexKeys,
      ],
      [
        JSON.stringify(expected),
        JSON.stringify(next),
        next.notificationId,
        tombstoneTtlSeconds,
      ],
    );

    return parseCommitResult(result, next);
  }

  async accept(
    expected: ReadyRoomAggregate,
    next: ReadyRoomAggregate,
    participantId: string,
  ): Promise<AcceptReadyRoomResult> {
    const ttlSeconds = Math.ceil(
      (Date.parse(next.expiresAt) - this.clock()) / 1000,
    );
    if (ttlSeconds <= 0) {
      return { status: "missing" };
    }

    const participant = next.participants[participantId];
    if (!participant) return { status: "conflict" };
    const result = await this.redisService.eval<unknown>(
      ACCEPT_READY_ROOM_PARTICIPANT_SCRIPT,
      [
        getRoomKey(next.notificationId),
        getUserKey(participant.discordId),
        getAcceptedKey(
          participant.discordId,
          participant.character.accountId,
          participant.character.characterId,
        ),
      ],
      [
        JSON.stringify(expected),
        JSON.stringify(next),
        next.notificationId,
        ttlSeconds,
        Date.parse(next.expiresAt),
      ],
    );

    return parseAcceptResult(result, next);
  }

  private getRemainingTtlSeconds(aggregate: ReadyRoomAggregate): number {
    return Math.ceil((Date.parse(aggregate.expiresAt) - this.clock()) / 1000);
  }

  async saveApplication(
    expected: ReadyRoomAggregate,
    next: ReadyRoomAggregate,
    participantId: string,
  ): Promise<CommitReadyRoomResult> {
    const ttlSeconds = Math.ceil(
      (Date.parse(next.expiresAt) - this.clock()) / 1000,
    );
    if (ttlSeconds <= 0) {
      return { status: "missing" };
    }

    const participant = next.participants[participantId];
    if (!participant) return { status: "conflict" };
    const result = await this.redisService.eval<unknown>(
      SAVE_READY_ROOM_APPLICATION_SCRIPT,
      [getRoomKey(next.notificationId), getUserKey(participant.discordId)],
      [
        JSON.stringify(expected),
        JSON.stringify(next),
        Date.parse(next.expiresAt),
        next.notificationId,
        ttlSeconds,
      ],
    );

    return parseCommitResult(result, next);
  }

  async create(aggregate: ReadyRoomAggregate): Promise<CreateReadyRoomResult> {
    const organizerKey = getOrganizerKey(aggregate.organizerDiscordId);
    const currentOrganizerRoomId = await this.redisService.get(organizerKey);
    const roomKey = getRoomKey(aggregate.notificationId);
    const currentOrganizerRoomKey = getRoomKey(
      currentOrganizerRoomId ?? aggregate.notificationId,
    );
    const ttlSeconds = Math.ceil(
      (Date.parse(aggregate.expiresAt) - this.clock()) / 1000,
    );

    if (ttlSeconds <= 0) {
      throw new Error("Ready Room must expire in the future");
    }

    const result = await this.redisService.eval<unknown>(
      CREATE_READY_ROOM_SCRIPT,
      [roomKey, organizerKey, currentOrganizerRoomKey],
      [
        JSON.stringify(aggregate),
        aggregate.notificationId,
        currentOrganizerRoomId ?? "",
        ttlSeconds,
      ],
    );

    return parseCreateResult(result, aggregate);
  }
}
