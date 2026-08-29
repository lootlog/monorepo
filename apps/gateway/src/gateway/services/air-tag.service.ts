import { randomUUID } from "node:crypto";
import { Injectable, Logger } from "@nestjs/common";
import { RedisService } from "@lootlog/nest-shared/redis";
import {
  AIR_TAG_CLAN_ENEMY_RELATION,
  AIR_TAG_ENEMY_RELATION,
  AIR_TAG_MAX_BATCH_SIZE,
  isAirTagObservation,
  type AirTagObservationAck,
  type AirTagObservationBatch,
  type AirTagScopeSnapshot,
  type AirTagSubscriptionAck,
  type AirTagSubscriptionPayload,
  type AirTagTarget,
  type AirTagUpdateEvent,
} from "@lootlog/types";
import type { Server } from "socket.io";
import { GatewayEvent } from "#src/gateway/enums/gateway-event.enum";
import { Platform } from "#src/gateway/enums/platform.enum";
import {
  type AirTagSocketScope,
  type Socket,
} from "#src/gateway/types/socket-user.type";
import {
  buildAirTagRoomName,
  canViewOnlinePlayers,
} from "#src/gateway/utils/room-utils";

const AIR_TAG_TARGET_TTL_MS = 10_000;
const AIR_TAG_ROOM_IDLE_TTL_SECONDS = 20;
const AIR_TAG_MAX_TARGETS_PER_SCOPE = 100;
const AIR_TAG_BROADCAST_INTERVAL_MS = 1_000;
const AIR_TAG_BATCH_RATE_LIMIT = 15;
const AIR_TAG_BATCH_RATE_WINDOW_MS = 3_000;
const WORLD_NAME_PATTERN = /^[a-z0-9-]{1,64}$/i;

const RATE_LIMIT_SCRIPT = `
local time = redis.call("TIME")
local now = (tonumber(time[1]) * 1000) + math.floor(tonumber(time[2]) / 1000)
local window = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])

redis.call("ZREMRANGEBYSCORE", KEYS[1], "-inf", now - window)

local count = redis.call("ZCARD", KEYS[1])
if count >= limit then
  local oldest = redis.call("ZRANGE", KEYS[1], 0, 0, "WITHSCORES")
  local retryAfter = math.max(1, tonumber(oldest[2]) + window - now)
  redis.call("PEXPIRE", KEYS[1], window)
  return {0, retryAfter}
end

redis.call("ZADD", KEYS[1], now, ARGV[3])
redis.call("PEXPIRE", KEYS[1], window)
return {1, 0}
`;

const MERGE_OBSERVATIONS_SCRIPT = `
local function currentTimeMs()
  local time = redis.call("TIME")
  return (tonumber(time[1]) * 1000) + math.floor(tonumber(time[2]) / 1000)
end

local function effectiveRelation(target, now, targetTtl, enemyRelation, clanEnemyRelation)
  if target.clanEnemyObservedAt ~= nil and now - tonumber(target.clanEnemyObservedAt) < targetTtl then
    return clanEnemyRelation
  end
  if target.enemyObservedAt ~= nil and now - tonumber(target.enemyObservedAt) < targetTtl then
    return enemyRelation
  end
  return tonumber(target.relation)
end

local function isThreat(relation, enemyRelation, clanEnemyRelation)
  return relation == enemyRelation or relation == clanEnemyRelation
end

local function clanIdentity(target)
  if target.clan == nil then
    return ""
  end
  return tostring(target.clan.id) .. ":" .. target.clan.name
end

local function publicTarget(target)
  local result = {
    targetId = target.targetId,
    nickname = target.nickname,
    relation = target.relation,
    x = target.x,
    y = target.y,
    observedAt = target.observedAt
  }
  if target.clan ~= nil then
    result.clan = target.clan
  end
  if target.enemyObservedAt ~= nil then
    result.enemyObservedAt = target.enemyObservedAt
  end
  if target.clanEnemyObservedAt ~= nil then
    result.clanEnemyObservedAt = target.clanEnemyObservedAt
  end
  return result
end

local now = currentTimeMs()
local observations = cjson.decode(ARGV[2])
local targetTtl = tonumber(ARGV[3])
local idleTtlSeconds = tonumber(ARGV[4])
local maxTargets = tonumber(ARGV[5])
local broadcastInterval = tonumber(ARGV[6])
local enemyRelation = tonumber(ARGV[7])
local clanEnemyRelation = tonumber(ARGV[8])

local metadataRaw = redis.call("GET", KEYS[3])
local metadata
if metadataRaw == false then
  redis.call("DEL", KEYS[1], KEYS[2])
  metadata = {
    epochId = ARGV[1],
    epochStartedAt = now,
    revision = 0
  }
else
  metadata = cjson.decode(metadataRaw)
end

local expiredTargetIds = redis.call("ZRANGEBYSCORE", KEYS[2], "-inf", now)
if #expiredTargetIds > 0 then
  redis.call("HDEL", KEYS[1], unpack(expiredTargetIds))
  redis.call("ZREM", KEYS[2], unpack(expiredTargetIds))
end

local targetCount = redis.call("HLEN", KEYS[1])
local acceptedTargets = 0
local updates = {}

for _, observation in ipairs(observations) do
  local existingRaw = redis.call("HGET", KEYS[1], observation.targetId)
  local existing = nil
  if existingRaw ~= false then
    existing = cjson.decode(existingRaw)
  end

  local shouldAccept = true
  if existing == nil and targetCount >= maxTargets then
    shouldAccept = false
    if isThreat(tonumber(observation.relation), enemyRelation, clanEnemyRelation) then
      local targetIdsByExpiry = redis.call("ZRANGE", KEYS[2], 0, -1)
      for _, candidateId in ipairs(targetIdsByExpiry) do
        local candidateRaw = redis.call("HGET", KEYS[1], candidateId)
        if candidateRaw ~= false then
          local candidate = cjson.decode(candidateRaw)
          local candidateRelation = effectiveRelation(
            candidate,
            now,
            targetTtl,
            enemyRelation,
            clanEnemyRelation
          )
          if not isThreat(candidateRelation, enemyRelation, clanEnemyRelation) then
            redis.call("HDEL", KEYS[1], candidateId)
            redis.call("ZREM", KEYS[2], candidateId)
            targetCount = targetCount - 1
            shouldAccept = true
            break
          end
        end
      end
    end
  end

  if shouldAccept then
    local target = {
      targetId = observation.targetId,
      nickname = observation.nickname,
      relation = observation.relation,
      x = observation.x,
      y = observation.y,
      observedAt = now,
      lastBroadcastAt = 0
    }
    if observation.clan ~= nil then
      target.clan = observation.clan
    end
    if existing ~= nil then
      target.enemyObservedAt = existing.enemyObservedAt
      target.clanEnemyObservedAt = existing.clanEnemyObservedAt
      target.lastBroadcastAt = tonumber(existing.lastBroadcastAt) or 0
    end
    if tonumber(observation.relation) == enemyRelation then
      target.enemyObservedAt = now
    end
    if tonumber(observation.relation) == clanEnemyRelation then
      target.clanEnemyObservedAt = now
    end

    local shouldBroadcast = existing == nil
    if existing ~= nil then
      local previousRelation = effectiveRelation(
        existing,
        now,
        targetTtl,
        enemyRelation,
        clanEnemyRelation
      )
      local nextRelation = effectiveRelation(
        target,
        now,
        targetTtl,
        enemyRelation,
        clanEnemyRelation
      )
      shouldBroadcast =
        tonumber(existing.x) ~= tonumber(target.x) or
        tonumber(existing.y) ~= tonumber(target.y) or
        existing.nickname ~= target.nickname or
        clanIdentity(existing) ~= clanIdentity(target) or
        previousRelation ~= nextRelation or
        now - target.lastBroadcastAt >= broadcastInterval
    end

    if shouldBroadcast then
      metadata.revision = tonumber(metadata.revision) + 1
      target.lastBroadcastAt = now
      table.insert(updates, {
        revision = metadata.revision,
        target = publicTarget(target)
      })
    end

    redis.call("HSET", KEYS[1], target.targetId, cjson.encode(target))
    redis.call("ZADD", KEYS[2], now + targetTtl, target.targetId)
    if existing == nil then
      targetCount = targetCount + 1
    end
    acceptedTargets = acceptedTargets + 1
  end
end

redis.call("SET", KEYS[3], cjson.encode(metadata), "EX", idleTtlSeconds)
if redis.call("EXISTS", KEYS[1]) == 1 then
  redis.call("EXPIRE", KEYS[1], idleTtlSeconds)
end
if redis.call("EXISTS", KEYS[2]) == 1 then
  redis.call("EXPIRE", KEYS[2], idleTtlSeconds)
end

return cjson.encode({
  epochId = metadata.epochId,
  epochStartedAt = metadata.epochStartedAt,
  acceptedTargets = acceptedTargets,
  updates = updates
})
`;

const LOAD_SNAPSHOT_SCRIPT = `
local function currentTimeMs()
  local time = redis.call("TIME")
  return (tonumber(time[1]) * 1000) + math.floor(tonumber(time[2]) / 1000)
end

local function publicTarget(target)
  local result = {
    targetId = target.targetId,
    nickname = target.nickname,
    relation = target.relation,
    x = target.x,
    y = target.y,
    observedAt = target.observedAt
  }
  if target.clan ~= nil then
    result.clan = target.clan
  end
  if target.enemyObservedAt ~= nil then
    result.enemyObservedAt = target.enemyObservedAt
  end
  if target.clanEnemyObservedAt ~= nil then
    result.clanEnemyObservedAt = target.clanEnemyObservedAt
  end
  return result
end

local now = currentTimeMs()
local idleTtlSeconds = tonumber(ARGV[2])
local metadataRaw = redis.call("GET", KEYS[3])
local metadata
if metadataRaw == false then
  redis.call("DEL", KEYS[1], KEYS[2])
  metadata = {
    epochId = ARGV[1],
    epochStartedAt = now,
    revision = 0
  }
else
  metadata = cjson.decode(metadataRaw)
end

local expiredTargetIds = redis.call("ZRANGEBYSCORE", KEYS[2], "-inf", now)
if #expiredTargetIds > 0 then
  redis.call("HDEL", KEYS[1], unpack(expiredTargetIds))
  redis.call("ZREM", KEYS[2], unpack(expiredTargetIds))
end

local values = redis.call("HVALS", KEYS[1])
local targets = {}
for _, value in ipairs(values) do
  table.insert(targets, publicTarget(cjson.decode(value)))
end

redis.call("SET", KEYS[3], cjson.encode(metadata), "EX", idleTtlSeconds)
if redis.call("EXISTS", KEYS[1]) == 1 then
  redis.call("EXPIRE", KEYS[1], idleTtlSeconds)
end
if redis.call("EXISTS", KEYS[2]) == 1 then
  redis.call("EXPIRE", KEYS[2], idleTtlSeconds)
end

return cjson.encode({
  epochId = metadata.epochId,
  epochStartedAt = metadata.epochStartedAt,
  revision = metadata.revision,
  targets = targets
})
`;

type RateLimitResult = [accepted: number, retryAfterMs: number];

interface MergeScriptResult {
  epochId: string;
  epochStartedAt: number;
  acceptedTargets: number;
  updates: Array<{ revision: number; target: AirTagTarget }>;
}

interface SnapshotScriptResult {
  epochId: string;
  epochStartedAt: number;
  revision: number;
  targets: AirTagTarget[];
}

interface AirTagContext {
  world: string;
  mapId: number;
}

@Injectable()
export class AirTagService {
  private readonly logger = new Logger(AirTagService.name);
  private readonly subscriptionOperations = new WeakMap<
    Socket,
    Promise<unknown>
  >();

  constructor(private readonly redis: RedisService) {}

  updateSubscription(
    server: Server,
    client: Socket,
    payload: AirTagSubscriptionPayload,
  ): Promise<AirTagSubscriptionAck> {
    return this.serializeSubscriptionOperation(client, () =>
      this.performSubscriptionUpdate(server, client, payload),
    );
  }

  private async performSubscriptionUpdate(
    _server: Server,
    client: Socket,
    payload: AirTagSubscriptionPayload,
  ): Promise<AirTagSubscriptionAck> {
    await this.clearSubscriptionRooms(client);

    if (!payload.enabled) {
      return {
        status: "accepted",
        requestId: payload.requestId,
        scopes: [],
      };
    }

    const context = this.getContext(client, payload.expectedMapId);
    if (!context) {
      return {
        status: "rejected",
        requestId: payload.requestId,
        code: "invalid-context",
      };
    }

    const eligibleScopes = this.getEligibleScopes(client, context);
    if (eligibleScopes.length === 0) {
      return {
        status: "rejected",
        requestId: payload.requestId,
        code: "forbidden",
      };
    }

    try {
      const scopes = (
        await Promise.all(
          eligibleScopes.map(async (scope) => ({
            disabled: await this.isScopeDisabled(scope),
            scope,
          })),
        )
      )
        .filter(({ disabled }) => !disabled)
        .map(({ scope }) => scope);
      if (scopes.length === 0) {
        return {
          status: "rejected",
          requestId: payload.requestId,
          code: "temporarily-unavailable",
        };
      }

      client.data.airTagScopes = scopes;
      await client.join(scopes.map(({ roomName }) => roomName));
      const snapshots = await Promise.all(
        scopes.map((scope) => this.loadSnapshot(scope)),
      );
      return {
        status: "accepted",
        requestId: payload.requestId,
        scopes: snapshots,
      };
    } catch (error) {
      await this.clearSubscriptionRooms(client);
      this.logRedisFailure("load snapshots", error);
      return {
        status: "rejected",
        requestId: payload.requestId,
        code: "temporarily-unavailable",
      };
    }
  }

  async publishObservations(
    _server: Server,
    client: Socket,
    payload: AirTagObservationBatch,
  ): Promise<AirTagObservationAck> {
    if (!this.hasValidBatch(payload)) {
      return { status: "rejected", code: "invalid-payload" };
    }

    const context = this.getContext(client, payload.expectedMapId);
    if (!context) {
      return { status: "rejected", code: "invalid-context" };
    }

    const eligibleGuildIds = new Set(
      client.data.guilds
        ?.filter((guildData) =>
          canViewOnlinePlayers(guildData, client.data.discordId),
        )
        .map(({ guild }) => guild.id) ?? [],
    );
    const scopes = (client.data.airTagScopes ?? []).filter(
      (scope) =>
        eligibleGuildIds.has(scope.guildId) &&
        scope.world === context.world &&
        scope.mapId === context.mapId &&
        client.rooms.has(scope.roomName),
    );
    if (scopes.length === 0) {
      return { status: "rejected", code: "forbidden" };
    }

    const rateLimit = await this.consumeRateLimit(client.data.userId);
    if (!rateLimit) {
      return { status: "rejected", code: "temporarily-unavailable" };
    }
    const [accepted, retryAfterMs] = rateLimit;
    if (accepted !== 1) {
      return {
        status: "rejected",
        code: "rate-limited",
        retryAfterMs,
      };
    }

    const observations = [
      ...new Map(
        payload.observations.map((observation) => [
          observation.targetId,
          observation,
        ]),
      ).values(),
    ];
    const results = await Promise.allSettled(
      scopes.map(async (scope) => {
        const disabled = await this.isScopeDisabled(scope);
        if (disabled) return null;

        const result = await this.mergeObservations(scope, observations);
        return { scope, result };
      }),
    );

    const successfulResults = results.flatMap((result) => {
      if (result.status === "rejected") {
        this.logRedisFailure("merge observations", result.reason);
        return [];
      }
      return result.value ? [result.value] : [];
    });
    if (successfulResults.length === 0) {
      return { status: "rejected", code: "temporarily-unavailable" };
    }

    let acceptedTargets = 0;
    for (const { scope, result } of successfulResults) {
      acceptedTargets += result.acceptedTargets;
      for (const update of result.updates) {
        const event: AirTagUpdateEvent = {
          guildId: scope.guildId,
          world: scope.world,
          mapId: scope.mapId,
          epochId: result.epochId,
          epochStartedAt: result.epochStartedAt,
          revision: update.revision,
          target: update.target,
        };
        client.to(scope.roomName).emit(GatewayEvent.AIR_TAG_UPDATE, event);
      }
    }

    return {
      status: "accepted",
      acceptedScopes: successfulResults.length,
      acceptedTargets,
    };
  }

  async clearSubscription(client: Socket): Promise<void> {
    await this.serializeSubscriptionOperation(client, () =>
      this.clearSubscriptionRooms(client),
    );
  }

  private async clearSubscriptionRooms(client: Socket): Promise<void> {
    const scopes = client.data.airTagScopes ?? [];
    client.data.airTagScopes = [];
    await Promise.all(scopes.map(({ roomName }) => client.leave(roomName)));
  }

  private async serializeSubscriptionOperation<TResult>(
    client: Socket,
    operation: () => Promise<TResult>,
  ): Promise<TResult> {
    const previousOperation = this.subscriptionOperations.get(client);
    const currentOperation = (previousOperation ?? Promise.resolve())
      .catch(() => undefined)
      .then(operation);
    this.subscriptionOperations.set(client, currentOperation);

    try {
      return await currentOperation;
    } finally {
      if (this.subscriptionOperations.get(client) === currentOperation) {
        this.subscriptionOperations.delete(client);
      }
    }
  }

  private getContext(
    client: Socket,
    expectedMapId: number | undefined,
  ): AirTagContext | null {
    const presence = client.data.playerPresence;
    if (
      client.data.platform !== Platform.GAME ||
      !client.data.guilds ||
      !client.data.userId ||
      !presence ||
      expectedMapId === undefined ||
      presence.mapId === undefined ||
      presence.mapId !== expectedMapId ||
      !WORLD_NAME_PATTERN.test(presence.world)
    ) {
      return null;
    }

    return { world: presence.world, mapId: presence.mapId };
  }

  private getEligibleScopes(
    client: Socket,
    context: AirTagContext,
  ): AirTagSocketScope[] {
    return (
      client.data.guilds
        ?.filter((guildData) =>
          canViewOnlinePlayers(guildData, client.data.discordId),
        )
        .map(({ guild }) => ({
          guildId: guild.id,
          world: context.world,
          mapId: context.mapId,
          roomName: buildAirTagRoomName(guild.id, context.world, context.mapId),
        })) ?? []
    );
  }

  private hasValidBatch(payload: AirTagObservationBatch): boolean {
    return (
      Number.isInteger(payload.expectedMapId) &&
      payload.expectedMapId >= 0 &&
      payload.expectedMapId <= 65_535 &&
      payload.observations.length > 0 &&
      payload.observations.length <= AIR_TAG_MAX_BATCH_SIZE &&
      payload.observations.every(isAirTagObservation)
    );
  }

  private async consumeRateLimit(userId: string) {
    try {
      const result = await this.redis.eval<RateLimitResult>(
        RATE_LIMIT_SCRIPT,
        [`air-tag:rate:${userId}`],
        [AIR_TAG_BATCH_RATE_WINDOW_MS, AIR_TAG_BATCH_RATE_LIMIT, randomUUID()],
      );
      return result.map(Number) as RateLimitResult;
    } catch (error) {
      this.logRedisFailure("apply rate limit", error);
      return null;
    }
  }

  private async isScopeDisabled(scope: AirTagSocketScope): Promise<boolean> {
    return (
      (await this.redis.get(
        `air-tag:disabled:${scope.guildId}:${scope.world}`,
      )) === "1"
    );
  }

  private async mergeObservations(
    scope: AirTagSocketScope,
    observations: AirTagObservationBatch["observations"],
  ): Promise<MergeScriptResult> {
    const result = await this.redis.eval<string>(
      MERGE_OBSERVATIONS_SCRIPT,
      this.getScopeRedisKeys(scope),
      [
        randomUUID(),
        JSON.stringify(observations),
        AIR_TAG_TARGET_TTL_MS,
        AIR_TAG_ROOM_IDLE_TTL_SECONDS,
        AIR_TAG_MAX_TARGETS_PER_SCOPE,
        AIR_TAG_BROADCAST_INTERVAL_MS,
        AIR_TAG_ENEMY_RELATION,
        AIR_TAG_CLAN_ENEMY_RELATION,
      ],
    );
    return JSON.parse(result) as MergeScriptResult;
  }

  private async loadSnapshot(
    scope: AirTagSocketScope,
  ): Promise<AirTagScopeSnapshot> {
    const result = await this.redis.eval<string>(
      LOAD_SNAPSHOT_SCRIPT,
      this.getScopeRedisKeys(scope),
      [randomUUID(), AIR_TAG_ROOM_IDLE_TTL_SECONDS],
    );
    const snapshot = JSON.parse(result) as SnapshotScriptResult;
    return {
      guildId: scope.guildId,
      world: scope.world,
      mapId: scope.mapId,
      ...snapshot,
    };
  }

  private getScopeRedisKeys(
    scope: AirTagSocketScope,
  ): [string, string, string] {
    const hashTag = `{air-tag:${scope.guildId}:${scope.world}:${scope.mapId}}`;
    return [
      `${hashTag}:targets`,
      `${hashTag}:expirations`,
      `${hashTag}:metadata`,
    ];
  }

  private logRedisFailure(operation: string, error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    this.logger.warn(`Failed to ${operation}: ${message}`);
  }
}
