import {
  AIR_TAG_CLAN_ENEMY_RELATION,
  AIR_TAG_ENEMY_RELATION,
  AIR_TAG_MAX_BATCH_SIZE,
  isAirTagObservation,
  type AirTagObservationAck,
  type AirTagObservation,
  type AirTagScopeSnapshot,
  type AirTagSubscriptionAck,
  type AirTagTarget,
  type AirTagUpdateEvent,
} from "@lootlog/schema/air-tag";
import { Logger } from "#src/platform/logger";
import type { RedisGatewayStore } from "#src/platform/redis-store";
import type { RealtimeHub } from "#src/realtime/realtime-hub";
import type { AirTagScope, GatewaySocket } from "#src/realtime/session";
import { canSubscribe } from "#src/realtime/subscription-policy";

const TARGET_TTL_MS = 10_000;
const IDLE_TTL_SECONDS = 20;
const MAX_TARGETS = 100;
const BROADCAST_INTERVAL_MS = 1_000;
const BATCH_RATE_LIMIT = 15;
const BATCH_RATE_WINDOW_MS = 3_000;
const WORLD_PATTERN = /^[a-z0-9-]{1,64}$/i;

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

const MERGE_SCRIPT = `
local function nowMs()
  local time = redis.call("TIME")
  return (tonumber(time[1]) * 1000) + math.floor(tonumber(time[2]) / 1000)
end
local function effective(target, now, ttl, enemy, clanEnemy)
  if target.clanEnemyObservedAt ~= nil and now - tonumber(target.clanEnemyObservedAt) < ttl then return clanEnemy end
  if target.enemyObservedAt ~= nil and now - tonumber(target.enemyObservedAt) < ttl then return enemy end
  return tonumber(target.relation)
end
local function threat(relation, enemy, clanEnemy) return relation == enemy or relation == clanEnemy end
local function clanId(target)
  if target.clan == nil then return "" end
  return tostring(target.clan.id) .. ":" .. target.clan.name
end
local function public(target)
  local result = { targetId=target.targetId, nickname=target.nickname, relation=target.relation, x=target.x, y=target.y, observedAt=target.observedAt }
  if target.clan ~= nil then result.clan=target.clan end
  if target.enemyObservedAt ~= nil then result.enemyObservedAt=target.enemyObservedAt end
  if target.clanEnemyObservedAt ~= nil then result.clanEnemyObservedAt=target.clanEnemyObservedAt end
  return result
end
local now=nowMs()
local observations=cjson.decode(ARGV[2])
local ttl=tonumber(ARGV[3])
local idle=tonumber(ARGV[4])
local maxTargets=tonumber(ARGV[5])
local interval=tonumber(ARGV[6])
local enemy=tonumber(ARGV[7])
local clanEnemy=tonumber(ARGV[8])
local raw=redis.call("GET",KEYS[3])
local metadata
if raw == false then
  redis.call("DEL",KEYS[1],KEYS[2])
  metadata={epochId=ARGV[1],epochStartedAt=now,revision=0}
else metadata=cjson.decode(raw) end
local expired=redis.call("ZRANGEBYSCORE",KEYS[2],"-inf",now)
if #expired > 0 then redis.call("HDEL",KEYS[1],unpack(expired)); redis.call("ZREM",KEYS[2],unpack(expired)) end
local count=redis.call("HLEN",KEYS[1])
local accepted=0
local updates={}
for _,observation in ipairs(observations) do
  local existingRaw=redis.call("HGET",KEYS[1],observation.targetId)
  local existing=nil
  if existingRaw ~= false then existing=cjson.decode(existingRaw) end
  local shouldAccept=true
  if existing == nil and count >= maxTargets then
    shouldAccept=false
    if threat(tonumber(observation.relation),enemy,clanEnemy) then
      local candidates=redis.call("ZRANGE",KEYS[2],0,-1)
      for _,candidateId in ipairs(candidates) do
        local candidateRaw=redis.call("HGET",KEYS[1],candidateId)
        if candidateRaw ~= false then
          local candidate=cjson.decode(candidateRaw)
          if not threat(effective(candidate,now,ttl,enemy,clanEnemy),enemy,clanEnemy) then
            redis.call("HDEL",KEYS[1],candidateId); redis.call("ZREM",KEYS[2],candidateId)
            count=count-1; shouldAccept=true; break
          end
        end
      end
    end
  end
  if shouldAccept then
    local target={targetId=observation.targetId,nickname=observation.nickname,relation=observation.relation,x=observation.x,y=observation.y,observedAt=now,lastBroadcastAt=0}
    if observation.clan ~= nil then target.clan=observation.clan end
    if existing ~= nil then
      target.enemyObservedAt=existing.enemyObservedAt; target.clanEnemyObservedAt=existing.clanEnemyObservedAt; target.lastBroadcastAt=tonumber(existing.lastBroadcastAt) or 0
    end
    if tonumber(observation.relation) == enemy then target.enemyObservedAt=now end
    if tonumber(observation.relation) == clanEnemy then target.clanEnemyObservedAt=now end
    local broadcast=existing == nil
    if existing ~= nil then
      broadcast=tonumber(existing.x) ~= tonumber(target.x) or tonumber(existing.y) ~= tonumber(target.y) or existing.nickname ~= target.nickname or clanId(existing) ~= clanId(target) or effective(existing,now,ttl,enemy,clanEnemy) ~= effective(target,now,ttl,enemy,clanEnemy) or now-target.lastBroadcastAt >= interval
    end
    if broadcast then
      metadata.revision=tonumber(metadata.revision)+1; target.lastBroadcastAt=now
      table.insert(updates,{revision=metadata.revision,target=public(target)})
    end
    redis.call("HSET",KEYS[1],target.targetId,cjson.encode(target)); redis.call("ZADD",KEYS[2],now+ttl,target.targetId)
    if existing == nil then count=count+1 end
    accepted=accepted+1
  end
end
redis.call("SET",KEYS[3],cjson.encode(metadata),"EX",idle)
if redis.call("EXISTS",KEYS[1]) == 1 then redis.call("EXPIRE",KEYS[1],idle) end
if redis.call("EXISTS",KEYS[2]) == 1 then redis.call("EXPIRE",KEYS[2],idle) end
return cjson.encode({epochId=metadata.epochId,epochStartedAt=metadata.epochStartedAt,acceptedTargets=accepted,updates=updates})
`;

const SNAPSHOT_SCRIPT = `
local function nowMs() local time=redis.call("TIME"); return (tonumber(time[1])*1000)+math.floor(tonumber(time[2])/1000) end
local function public(target)
  local result={targetId=target.targetId,nickname=target.nickname,relation=target.relation,x=target.x,y=target.y,observedAt=target.observedAt}
  if target.clan ~= nil then result.clan=target.clan end
  if target.enemyObservedAt ~= nil then result.enemyObservedAt=target.enemyObservedAt end
  if target.clanEnemyObservedAt ~= nil then result.clanEnemyObservedAt=target.clanEnemyObservedAt end
  return result
end
local now=nowMs(); local idle=tonumber(ARGV[2]); local raw=redis.call("GET",KEYS[3]); local metadata
if raw == false then redis.call("DEL",KEYS[1],KEYS[2]); metadata={epochId=ARGV[1],epochStartedAt=now,revision=0} else metadata=cjson.decode(raw) end
local expired=redis.call("ZRANGEBYSCORE",KEYS[2],"-inf",now)
if #expired > 0 then redis.call("HDEL",KEYS[1],unpack(expired)); redis.call("ZREM",KEYS[2],unpack(expired)) end
local targets={}; for _,value in ipairs(redis.call("HVALS",KEYS[1])) do table.insert(targets,public(cjson.decode(value))) end
redis.call("SET",KEYS[3],cjson.encode(metadata),"EX",idle)
if redis.call("EXISTS",KEYS[1]) == 1 then redis.call("EXPIRE",KEYS[1],idle) end
if redis.call("EXISTS",KEYS[2]) == 1 then redis.call("EXPIRE",KEYS[2],idle) end
return cjson.encode({epochId=metadata.epochId,epochStartedAt=metadata.epochStartedAt,revision=metadata.revision,targets=targets})
`;

type RateLimitResult = [accepted: number, retryAfterMs: number];
interface MergeResult {
  epochId: string;
  epochStartedAt: number;
  acceptedTargets: number;
  updates: Array<{ revision: number; target: AirTagTarget }>;
}
interface SnapshotResult {
  epochId: string;
  epochStartedAt: number;
  revision: number;
  targets: AirTagTarget[];
}
interface ObservationBatch {
  readonly expectedMapId: number;
  readonly observations: ReadonlyArray<AirTagObservation>;
}

export class AirTagService {
  private readonly logger = new Logger(AirTagService.name);
  private readonly subscriptionOperations = new WeakMap<
    GatewaySocket,
    Promise<unknown>
  >();

  constructor(
    private readonly redis: RedisGatewayStore,
    private readonly hub: RealtimeHub,
  ) {}

  updateSubscription(
    socket: GatewaySocket,
    payload: { requestId: string; enabled: boolean; expectedMapId?: number },
  ): Promise<AirTagSubscriptionAck> {
    return this.serialize(socket, () =>
      this.performSubscriptionUpdate(socket, payload),
    );
  }

  private async performSubscriptionUpdate(
    socket: GatewaySocket,
    payload: { requestId: string; enabled: boolean; expectedMapId?: number },
  ): Promise<AirTagSubscriptionAck> {
    this.clearSubscription(socket);
    if (!payload.enabled)
      return { status: "accepted", requestId: payload.requestId, scopes: [] };
    const context = this.getContext(socket, payload.expectedMapId);
    if (!context)
      return {
        status: "rejected",
        requestId: payload.requestId,
        code: "invalid-context",
      };
    const eligibleScopes = this.getEligibleScopes(
      socket,
      context.world,
      context.mapId,
    );
    if (eligibleScopes.length === 0)
      return {
        status: "rejected",
        requestId: payload.requestId,
        code: "forbidden",
      };
    try {
      const enabledScopes: AirTagScope[] = [];
      for (const scope of eligibleScopes) {
        if (!(await this.isDisabled(scope))) enabledScopes.push(scope);
      }
      if (enabledScopes.length === 0)
        return {
          status: "rejected",
          requestId: payload.requestId,
          code: "temporarily-unavailable",
        };
      socket.data.airTagScopes = enabledScopes;
      for (const scope of enabledScopes)
        this.hub.subscribe(socket, scope.subscription);
      const scopes = await Promise.all(
        enabledScopes.map((scope) => this.loadSnapshot(scope)),
      );
      return { status: "accepted", requestId: payload.requestId, scopes };
    } catch (error) {
      this.clearSubscription(socket);
      this.logger.warn("Failed to load air tag snapshots", error);
      return {
        status: "rejected",
        requestId: payload.requestId,
        code: "temporarily-unavailable",
      };
    }
  }

  async publishObservations(
    socket: GatewaySocket,
    payload: ObservationBatch,
  ): Promise<AirTagObservationAck> {
    if (!this.hasValidBatch(payload))
      return { status: "rejected", code: "invalid-payload" };
    const context = this.getContext(socket, payload.expectedMapId);
    if (!context) return { status: "rejected", code: "invalid-context" };
    const scopes = socket.data.airTagScopes.filter(
      (scope) =>
        scope.world === context.world &&
        scope.mapId === context.mapId &&
        canSubscribe(socket.data, scope.subscription),
    );
    if (scopes.length === 0) return { status: "rejected", code: "forbidden" };
    const rateLimit = await this.consumeRateLimit(socket.data.userId);
    if (!rateLimit)
      return { status: "rejected", code: "temporarily-unavailable" };
    if (rateLimit[0] !== 1)
      return {
        status: "rejected",
        code: "rate-limited",
        retryAfterMs: rateLimit[1],
      };
    const observations = [
      ...new Map(
        payload.observations.map((item) => [item.targetId, item]),
      ).values(),
    ];
    const results = await Promise.allSettled(
      scopes.map(async (scope) => {
        if (await this.isDisabled(scope)) return null;
        return { scope, result: await this.merge(scope, observations) };
      }),
    );
    const successes = results.flatMap((result) =>
      result.status === "fulfilled" && result.value ? [result.value] : [],
    );
    for (const result of results)
      if (result.status === "rejected")
        this.logger.warn("Failed to merge air tag observations", result.reason);
    if (successes.length === 0)
      return { status: "rejected", code: "temporarily-unavailable" };
    let acceptedTargets = 0;
    for (const { scope, result } of successes) {
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
        await this.hub.publishToScopes(
          [scope.subscription],
          {
            v: 1,
            type: "air-tag.updated",
            sequence: update.revision,
            data: event,
          },
          {
            excludeConnectionId: socket.data.connectionId,
            recipientPlatform: "game",
            recipientWorld: scope.world,
            recipientMapId: scope.mapId,
          },
        );
      }
    }
    return {
      status: "accepted",
      acceptedScopes: successes.length,
      acceptedTargets,
    };
  }

  clearSubscription(socket: GatewaySocket): void {
    for (const scope of socket.data.airTagScopes)
      this.hub.unsubscribe(socket, scope.subscription);
    socket.data.airTagScopes = [];
  }

  private async serialize<T>(
    socket: GatewaySocket,
    operation: () => Promise<T>,
  ): Promise<T> {
    const previous = this.subscriptionOperations.get(socket);
    const current = (previous ?? Promise.resolve())
      .catch(() => undefined)
      .then(operation);
    this.subscriptionOperations.set(socket, current);
    try {
      return await current;
    } finally {
      if (this.subscriptionOperations.get(socket) === current)
        this.subscriptionOperations.delete(socket);
    }
  }

  private getContext(socket: GatewaySocket, expectedMapId: number | undefined) {
    const presence = socket.data.presence;
    const world = presence?.character?.world;
    if (
      socket.data.platform !== "game" ||
      expectedMapId === undefined ||
      presence?.location?.mapId !== expectedMapId ||
      !world ||
      !WORLD_PATTERN.test(world)
    )
      return null;
    return { world, mapId: expectedMapId };
  }

  private getEligibleScopes(
    socket: GatewaySocket,
    world: string,
    mapId: number,
  ): AirTagScope[] {
    return socket.data.guilds.flatMap(({ guild }) => {
      const subscription = {
        topic: "map.air-tags" as const,
        organizationId: guild.id,
        world,
        mapId,
      };
      return canSubscribe(socket.data, subscription)
        ? [{ guildId: guild.id, world, mapId, subscription }]
        : [];
    });
  }

  private hasValidBatch(payload: ObservationBatch): boolean {
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
      const result = await this.redis.command.eval(
        RATE_LIMIT_SCRIPT,
        1,
        `air-tag:rate:${userId}`,
        BATCH_RATE_WINDOW_MS,
        BATCH_RATE_LIMIT,
        crypto.randomUUID(),
      );
      if (!Array.isArray(result)) return null;
      return result.map(Number) as RateLimitResult;
    } catch (error) {
      this.logger.warn("Failed to apply air tag rate limit", error);
      return null;
    }
  }

  private async isDisabled(scope: AirTagScope): Promise<boolean> {
    return (
      (await this.redis.command.get(
        `air-tag:disabled:${scope.guildId}:${scope.world}`,
      )) === "1"
    );
  }

  private keys(scope: AirTagScope): [string, string, string] {
    const hashTag = `{air-tag:${scope.guildId}:${scope.world}:${scope.mapId}}`;
    return [
      `${hashTag}:targets`,
      `${hashTag}:expirations`,
      `${hashTag}:metadata`,
    ];
  }

  private async merge(
    scope: AirTagScope,
    observations: ReadonlyArray<AirTagObservation>,
  ): Promise<MergeResult> {
    const result = await this.redis.command.eval(
      MERGE_SCRIPT,
      3,
      ...this.keys(scope),
      crypto.randomUUID(),
      JSON.stringify(observations),
      TARGET_TTL_MS,
      IDLE_TTL_SECONDS,
      MAX_TARGETS,
      BROADCAST_INTERVAL_MS,
      AIR_TAG_ENEMY_RELATION,
      AIR_TAG_CLAN_ENEMY_RELATION,
    );
    const parsed = JSON.parse(String(result)) as Omit<
      MergeResult,
      "updates"
    > & {
      readonly updates: unknown;
    };
    return {
      ...parsed,
      updates: Array.isArray(parsed.updates) ? parsed.updates : [],
    } as MergeResult;
  }

  private async loadSnapshot(scope: AirTagScope): Promise<AirTagScopeSnapshot> {
    const result = await this.redis.command.eval(
      SNAPSHOT_SCRIPT,
      3,
      ...this.keys(scope),
      crypto.randomUUID(),
      IDLE_TTL_SECONDS,
    );
    const parsed = JSON.parse(String(result)) as Omit<
      SnapshotResult,
      "targets"
    > & {
      readonly targets: unknown;
    };
    const snapshot = {
      ...parsed,
      targets: Array.isArray(parsed.targets) ? parsed.targets : [],
    } as SnapshotResult;
    return {
      guildId: scope.guildId,
      world: scope.world,
      mapId: scope.mapId,
      ...snapshot,
    };
  }
}
