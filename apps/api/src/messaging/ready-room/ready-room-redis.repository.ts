import { RedisService } from "@lootlog/nest-shared/redis";
import {
  CREATE_READY_ROOM_SCRIPT,
  SAVE_READY_ROOM_APPLICATION_SCRIPT,
} from "src/messaging/ready-room/ready-room-redis-scripts";
import type {
  CommitReadyRoomResult,
  CreateReadyRoomResult,
  ReadyRoomRepository,
} from "src/messaging/ready-room/ready-room.repository";
import type { ReadyRoomAggregate } from "src/messaging/ready-room/ready-room.types";

type Clock = () => number;

const ROOM_KEY_PREFIX = "party-ready-room:room:";
const ORGANIZER_KEY_PREFIX = "party-ready-room:organizer:";
const PENDING_KEY_PREFIX = "party-ready-room:pending:";

function getRoomKey(notificationId: string): string {
  return `${ROOM_KEY_PREFIX}${notificationId}`;
}

function getOrganizerKey(discordId: string): string {
  return `${ORGANIZER_KEY_PREFIX}${discordId}`;
}

function getPendingKey(discordId: string): string {
  return `${PENDING_KEY_PREFIX}${discordId}`;
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

  async saveApplication(
    expected: ReadyRoomAggregate,
    next: ReadyRoomAggregate,
    participantDiscordId: string,
  ): Promise<CommitReadyRoomResult> {
    const ttlSeconds = Math.ceil(
      (Date.parse(next.expiresAt) - this.clock()) / 1000,
    );
    if (ttlSeconds <= 0) {
      return { status: "missing" };
    }

    const result = await this.redisService.eval<unknown>(
      SAVE_READY_ROOM_APPLICATION_SCRIPT,
      [getRoomKey(next.notificationId), getPendingKey(participantDiscordId)],
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
