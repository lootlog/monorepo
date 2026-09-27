import { slidingWindowRateLimitScript } from "@lootlog/database/sliding-window-rate-limit";
import {
  AIR_TAG_CLAN_ENEMY_RELATION,
  AIR_TAG_ENEMY_RELATION,
  AIR_TAG_MAP_THREAT_TTL_MS,
  AIR_TAG_MAX_BATCH_SIZE,
  AIR_TAG_MAX_MAP_NAME_LENGTH,
  AirTagMapThreatEventSchema,
  AirTagTargetSchema,
  isAirTagDeparture,
  isAirTagObservation,
  type AirTagDeparture,
  type AirTagObservationAck,
  type AirTagMapThreatEnemy,
  type AirTagMapThreatEvent,
  type AirTagObservation,
  type AirTagScopeSnapshot,
  type AirTagSubscriptionAck,
  type AirTagScopeUpdateEvent,
} from "@lootlog/schema/air-tag";
import { Schema } from "effect";
import { Logger } from "#src/platform/logger";
import type {
  RedisGatewayStore,
  RedisScriptReply,
} from "#src/platform/redis-store";
import type { RealtimeHub } from "#src/realtime/realtime-hub";
import type { AirTagScope, GatewaySocket } from "#src/realtime/session";
import {
  canReadPreciseLocation,
  canSubscribe,
} from "#src/realtime/subscription-policy";

const TARGET_TTL_MS = 10_000;

const IDLE_TTL_SECONDS = 20;

const MAX_TARGETS = 100;

const BROADCAST_INTERVAL_MS = 1_000;

// A still enemy is sighted at most 6.25 s apart; re-reporting a sighting this old keeps its
// age under `AIR_TAG_MAP_THREAT_FRESH_MS` on recipients.
const THREAT_REFRESH_MS = 4_000;

// Caps full-list fan-out per map; a change inside the window is sent with the next sighting.
const THREAT_BROADCAST_THROTTLE_MS = 1_000;

const THREAT_PUBLISH_ATTEMPTS = 3;

// One game tab sends at most four batches a second.
const CONNECTION_BATCH_RATE_LIMIT = 15;

// Several characters of one user may each observe a busy map.
const USER_BATCH_RATE_LIMIT = 45;

const BATCH_RATE_WINDOW_MS = 3_000;

const WORLD_PATTERN = /^[a-z0-9-]{1,64}$/i;

const RATE_LIMIT_SCRIPT = slidingWindowRateLimitScript({
  refreshExpiryOnReject: true,
  includeTimestamp: false,
});

// Shared by the merge and threat snapshot scripts.
const LUA_COMMON = `
local function nowMs()
  local time = redis.call("TIME")
  return (tonumber(time[1]) * 1000) + math.floor(tonumber(time[2]) / 1000)
end
local function clanId(target)
  if target.clan == nil then return "" end
  return tostring(target.clan.id) .. ":" .. target.clan.name
end
local function threatEnemies(records, now)
  local enemies={}
  for _,record in pairs(records) do
    table.insert(enemies,{targetId=record.targetId,nickname=record.nickname,clan=record.clan,lvl=record.lvl,stasis=record.stasis,ageMs=now-tonumber(record.observedAt)})
  end
  return enemies
end
-- cjson encodes an empty table as an object.
local function withArrays(encoded, keys)
  for _,key in ipairs(keys) do encoded=string.gsub(encoded,'"'..key..'":{}','"'..key..'":[]') end
  return encoded
end
local function liveThreats(key, now, threatTtl)
  local records={}
  local count=0
  local raw=redis.call("HGETALL",key)
  for i=1,#raw,2 do
    local record=cjson.decode(raw[i+1])
    if now-tonumber(record.observedAt) >= threatTtl then redis.call("HDEL",key,raw[i]) else records[raw[i]]=record; count=count+1 end
  end
  return records, count
end
`;

const MERGE_SCRIPT = `${LUA_COMMON}
local function effective(target, now, ttl, enemy, clanEnemy)
  if target.clanEnemyObservedAt ~= nil and now - tonumber(target.clanEnemyObservedAt) < ttl then return clanEnemy end
  if target.enemyObservedAt ~= nil and now - tonumber(target.enemyObservedAt) < ttl then return enemy end
  return tonumber(target.relation)
end
local function isThreat(relation, enemy, clanEnemy) return relation == enemy or relation == clanEnemy end
local function public(target)
  local result = { targetId=target.targetId, nickname=target.nickname, relation=target.relation, x=target.x, y=target.y, lvl=target.lvl, stasis=target.stasis, observedAt=target.observedAt }
  if target.clan ~= nil then result.clan=target.clan end
  if target.enemyObservedAt ~= nil then result.enemyObservedAt=target.enemyObservedAt end
  if target.clanEnemyObservedAt ~= nil then result.clanEnemyObservedAt=target.clanEnemyObservedAt end
  return result
end
-- Older game clients omit level and stasis; keep the last reported value instead of erasing it.
local function carry(target, observation, existing, field)
  if observation[field] ~= nil then target[field]=observation[field] elseif existing ~= nil then target[field]=existing[field] end
end
-- Connections that reported the target within the TTL; a live observer reports it at least every 6.25 s.
local function liveObservers(target, now, ttl)
  local observers={}
  if target.seenBy ~= nil then
    for id,seenAt in pairs(target.seenBy) do
      if now-tonumber(seenAt) < ttl then observers[id]=seenAt end
    end
  end
  return observers
end
local now=nowMs()
local observations=cjson.decode(ARGV[2])
local ttl=tonumber(ARGV[3])
local idle=tonumber(ARGV[4])
local maxTargets=tonumber(ARGV[5])
local interval=tonumber(ARGV[6])
local enemy=tonumber(ARGV[7])
local clanEnemy=tonumber(ARGV[8])
local threatTtl=tonumber(ARGV[9])
local threatRefresh=tonumber(ARGV[10])
local threatThrottle=tonumber(ARGV[11])
local threatsAllowed=ARGV[12] == "1"
local mapName=ARGV[13]
local observer=ARGV[14]
local departures=cjson.decode(ARGV[15])
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
local removed={}
local threatRemoved=false
-- A target leaves once no observer still sees it and one of them saw it leave the map;
-- a target only out of sight stays until its TTL.
for _,departure in ipairs(departures) do
  local existingRaw=redis.call("HGET",KEYS[1],departure.targetId)
  if existingRaw ~= false then
    local target=cjson.decode(existingRaw)
    local observers=liveObservers(target,now,ttl)
    if observers[observer] ~= nil then
      observers[observer]=nil
      if departure.reason == "left-map" then target.departed=true end
      if target.departed == true and next(observers) == nil then
        redis.call("HDEL",KEYS[1],departure.targetId); redis.call("ZREM",KEYS[2],departure.targetId)
        count=count-1
        metadata.revision=tonumber(metadata.revision)+1
        table.insert(removed,departure.targetId)
        if threatsAllowed and redis.call("HDEL",KEYS[4],departure.targetId) == 1 then threatRemoved=true end
      else
        target.seenBy=observers
        redis.call("HSET",KEYS[1],departure.targetId,cjson.encode(target))
      end
    end
  end
end
for _,observation in ipairs(observations) do
  local existingRaw=redis.call("HGET",KEYS[1],observation.targetId)
  local existing=nil
  if existingRaw ~= false then existing=cjson.decode(existingRaw) end
  local shouldAccept=true
  if existing == nil and count >= maxTargets then
    shouldAccept=false
    if isThreat(tonumber(observation.relation),enemy,clanEnemy) then
      local candidates=redis.call("ZRANGE",KEYS[2],0,-1)
      for _,candidateId in ipairs(candidates) do
        local candidateRaw=redis.call("HGET",KEYS[1],candidateId)
        if candidateRaw ~= false then
          local candidate=cjson.decode(candidateRaw)
          if not isThreat(effective(candidate,now,ttl,enemy,clanEnemy),enemy,clanEnemy) then
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
    carry(target,observation,existing,"lvl")
    carry(target,observation,existing,"stasis")
    target.seenBy={}
    if existing ~= nil then
      target.enemyObservedAt=existing.enemyObservedAt; target.clanEnemyObservedAt=existing.clanEnemyObservedAt; target.lastBroadcastAt=tonumber(existing.lastBroadcastAt) or 0
      target.seenBy=liveObservers(existing,now,ttl)
    end
    target.seenBy[observer]=now
    if tonumber(observation.relation) == enemy then target.enemyObservedAt=now end
    if tonumber(observation.relation) == clanEnemy then target.clanEnemyObservedAt=now end
    local broadcast=existing == nil
    if existing ~= nil then
      broadcast=tonumber(existing.x) ~= tonumber(target.x) or tonumber(existing.y) ~= tonumber(target.y) or existing.nickname ~= target.nickname or clanId(existing) ~= clanId(target) or existing.lvl ~= target.lvl or existing.stasis ~= target.stasis or effective(existing,now,ttl,enemy,clanEnemy) ~= effective(target,now,ttl,enemy,clanEnemy) or now-target.lastBroadcastAt >= interval
    end
    if broadcast then
      metadata.revision=tonumber(metadata.revision)+1; target.lastBroadcastAt=now
      table.insert(updates,public(target))
    end
    redis.call("HSET",KEYS[1],target.targetId,cjson.encode(target)); redis.call("ZADD",KEYS[2],now+ttl,target.targetId)
    if existing == nil then count=count+1 end
    accepted=accepted+1
  end
end
redis.call("SET",KEYS[3],cjson.encode(metadata),"EX",idle)
if redis.call("EXISTS",KEYS[1]) == 1 then redis.call("EXPIRE",KEYS[1],idle) end
if redis.call("EXISTS",KEYS[2]) == 1 then redis.call("EXPIRE",KEYS[2],idle) end
-- Map threats: clan enemies with a clan, from verified observers only.
local sightings={}
if threatsAllowed then
  for _,observation in ipairs(observations) do
    if tonumber(observation.relation) == clanEnemy and observation.clan ~= nil then table.insert(sightings,observation) end
  end
end
local stateRaw=redis.call("GET",KEYS[5])
local state={broadcastAt=0,pending=false}
if stateRaw ~= false then state=cjson.decode(stateRaw) end
local threatResult=nil
local threatPendingMs=nil
if #sightings > 0 or state.pending == true or threatRemoved then
  local records, threatCount = liveThreats(KEYS[4], now, threatTtl)
  local due=state.pending == true or threatRemoved
  for _,observation in ipairs(sightings) do
    local previous=records[observation.targetId]
    if previous ~= nil or threatCount < maxTargets then
      local record={targetId=observation.targetId,nickname=observation.nickname,clan=observation.clan,observedAt=now}
      carry(record,observation,previous,"lvl")
      carry(record,observation,previous,"stasis")
      if previous == nil then
        threatCount=threatCount+1; due=true
      else
        record.reportedAt=previous.reportedAt
        -- A sighting last reported long ago must reach recipients before it turns stale for them.
        if previous.nickname ~= record.nickname or clanId(previous) ~= clanId(record) or previous.lvl ~= record.lvl or previous.stasis ~= record.stasis or now-tonumber(previous.reportedAt or 0) >= threatRefresh then due=true end
      end
      records[observation.targetId]=record
      redis.call("HSET",KEYS[4],observation.targetId,cjson.encode(record))
    end
  end
  state.pending=false
  -- An empty list tells recipients the last enemy left.
  if due then
    if now-tonumber(state.broadcastAt) >= threatThrottle then
      for id,record in pairs(records) do
        record.reportedAt=record.observedAt
        redis.call("HSET",KEYS[4],id,cjson.encode(record))
      end
      state.broadcastAt=now
      threatResult={revision=now,enemies=threatEnemies(records,now)}
    else
      state.pending=true
      threatPendingMs=threatThrottle-(now-tonumber(state.broadcastAt))
    end
  end
  state.mapName=mapName
  redis.call("SET",KEYS[5],cjson.encode(state),"PX",threatTtl)
  if next(records) ~= nil then redis.call("PEXPIRE",KEYS[4],threatTtl) end
end
return withArrays(cjson.encode({epochId=metadata.epochId,epochStartedAt=metadata.epochStartedAt,revision=metadata.revision,acceptedTargets=accepted,targets=updates,removed=removed,threat=threatResult,threatPendingMs=threatPendingMs}),{"targets","removed","enemies"})
`;

const SNAPSHOT_SCRIPT = `
local function nowMs() local time=redis.call("TIME"); return (tonumber(time[1])*1000)+math.floor(tonumber(time[2])/1000) end
local function public(target)
  local result={targetId=target.targetId,nickname=target.nickname,relation=target.relation,x=target.x,y=target.y,lvl=target.lvl,stasis=target.stasis,observedAt=target.observedAt}
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
local encoded=cjson.encode({epochId=metadata.epochId,epochStartedAt=metadata.epochStartedAt,revision=metadata.revision,serverTime=now,targets=targets})
if #targets == 0 then encoded=string.gsub(encoded,'"targets":{}','"targets":[]',1) end
return encoded
`;

// Read-only apart from pruning; the map name comes from the last merge.
const THREAT_SNAPSHOT_SCRIPT = `${LUA_COMMON}
local now=nowMs()
local stateRaw=redis.call("GET",KEYS[2])
if stateRaw == false then return "" end
local state=cjson.decode(stateRaw)
local records=liveThreats(KEYS[1], now, tonumber(ARGV[1]))
if next(records) == nil or state.mapName == nil then return "" end
return cjson.encode({mapName=state.mapName,revision=now,enemies=threatEnemies(records,now)})
`;

// Sends a throttled or undelivered list without waiting for another sighting.
const THREAT_FLUSH_SCRIPT = `${LUA_COMMON}
local now=nowMs()
local threatTtl=tonumber(ARGV[1])
local stateRaw=redis.call("GET",KEYS[2])
if stateRaw == false then return "" end
local state=cjson.decode(stateRaw)
if ARGV[3] ~= "1" and state.pending ~= true then return "" end
local wait=tonumber(ARGV[2])-(now-tonumber(state.broadcastAt))
if wait > 0 then return cjson.encode({retryInMs=wait}) end
local records=liveThreats(KEYS[1], now, threatTtl)
state.pending=false
if state.mapName == nil then
  redis.call("SET",KEYS[2],cjson.encode(state),"PX",threatTtl)
  return ""
end
for id,record in pairs(records) do
  record.reportedAt=record.observedAt
  redis.call("HSET",KEYS[1],id,cjson.encode(record))
end
state.broadcastAt=now
redis.call("SET",KEYS[2],cjson.encode(state),"PX",threatTtl)
-- Empty once the last enemy left while the list was held back.
return withArrays(cjson.encode({mapName=state.mapName,revision=now,enemies=threatEnemies(records,now)}),{"enemies"})
`;

interface MergeResult {
  epochId: string;
  epochStartedAt: number;
  revision: number;
  acceptedTargets: number;
  targets: AirTagScopeUpdateEvent["targets"];
  removed: string[];
  threat?: { revision: number; enemies: AirTagMapThreatEnemy[] };
  threatPendingMs?: number;
}

interface ObservationBatch {
  readonly expectedMapId: number;
  readonly observations: ReadonlyArray<AirTagObservation>;
  readonly departures?: ReadonlyArray<AirTagDeparture>;
}

const MergeResultJson = Schema.fromJsonString(
  Schema.Struct({
    epochId: Schema.String,
    epochStartedAt: Schema.Number,
    revision: Schema.Number,
    acceptedTargets: Schema.Number,
    targets: Schema.Array(AirTagTargetSchema),
    removed: Schema.Array(Schema.String),
    threat: Schema.optionalKey(
      Schema.Struct({
        revision: Schema.Number,
        enemies: AirTagMapThreatEventSchema.fields.enemies,
      }),
    ),
    threatPendingMs: Schema.optionalKey(Schema.Number),
  }),
);

const ThreatFlushJson = Schema.fromJsonString(
  Schema.Union([
    Schema.Struct({ retryInMs: Schema.Number }),
    Schema.Struct({
      mapName: Schema.String,
      revision: Schema.Number,
      enemies: AirTagMapThreatEventSchema.fields.enemies,
    }),
  ]),
);

const SnapshotResultJson = Schema.fromJsonString(
  Schema.Struct({
    epochId: Schema.String,
    epochStartedAt: Schema.Number,
    revision: Schema.Number,
    serverTime: Schema.Number,
    targets: Schema.Array(AirTagTargetSchema),
  }),
);

const ThreatSnapshotJson = Schema.fromJsonString(
  Schema.Struct({
    mapName: Schema.String,
    revision: Schema.Number,
    enemies: AirTagMapThreatEventSchema.fields.enemies,
  }),
);

type ScriptStore = {
  command: Pick<
    RedisGatewayStore["command"],
    "get" | "sadd" | "smembers" | "expire"
  > & {
    eval(
      ...args: Parameters<RedisGatewayStore["command"]["eval"]>
    ): Promise<RedisScriptReply>;
  };
};

export class AirTagService {
  private readonly logger = new Logger(AirTagService.name);
  private readonly subscriptionOperations = new WeakMap<
    GatewaySocket,
    Promise<unknown>
  >();
  private readonly threatFlushes = new Map<
    string,
    ReturnType<typeof setTimeout>
  >();

  constructor(
    private readonly redis: ScriptStore,
    private readonly hub: Pick<
      RealtimeHub,
      "subscribe" | "unsubscribe" | "publishToScopes"
    >,
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

    const connectionLimit = await this.consumeRateLimit(
      `air-tag:rate:connection:${socket.data.connectionId}`,
      CONNECTION_BATCH_RATE_LIMIT,
    );

    const rateLimit =
      connectionLimit?.[0] === 1
        ? await this.consumeRateLimit(
            `air-tag:rate:${socket.data.userId}`,
            USER_BATCH_RATE_LIMIT,
          )
        : connectionLimit;

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

    const observedIds = new Set(observations.map((item) => item.targetId));

    // A sighting in the same batch supersedes a departure.
    const departures = [
      ...new Map(
        (payload.departures ?? []).map((item) => [item.targetId, item]),
      ).values(),
    ].filter((item) => !observedIds.has(item.targetId));

    // Proof-checked characters only: a threat reaches the whole Organization's timers.
    const threatsAllowed =
      socket.data.confidence === "verified" &&
      context.mapName.length <= AIR_TAG_MAX_MAP_NAME_LENGTH;

    const results = await Promise.allSettled(
      scopes.map(async (scope) => {
        if (await this.isDisabled(scope)) return null;

        return {
          scope,
          result: await this.merge(scope, {
            observer: socket.data.connectionId,
            observations,
            departures,
            threatsAllowed,
            mapName: context.mapName,
          }),
        };
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

      if (result.threat)
        await this.publishThreat({
          guildId: scope.guildId,
          world: scope.world,
          mapId: scope.mapId,
          mapName: context.mapName,
          revision: result.threat.revision,
          enemies: result.threat.enemies,
        });

      if (result.threatPendingMs !== undefined)
        this.scheduleThreatFlush(scope, result.threatPendingMs);

      if (result.targets.length === 0 && result.removed.length === 0) continue;

      // One publication per batch; the hub splits it for older game clients.
      const event: AirTagScopeUpdateEvent = {
        guildId: scope.guildId,
        world: scope.world,
        mapId: scope.mapId,
        epochId: result.epochId,
        epochStartedAt: result.epochStartedAt,
        revision: result.revision,
        targets: result.targets,
        removedTargetIds: result.removed,
      };

      await this.hub.publishToScopes(
        [scope.subscription],
        {
          v: 1,
          type: "air-tag.scope-updated",
          sequence: result.revision,
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

    return {
      status: "accepted",
      acceptedScopes: successes.length,
      acceptedTargets,
    };
  }

  /** Current map threats of one Organization and world, for a client that just connected. */
  async fetchMapThreats(
    socket: GatewaySocket,
    organizationId: string,
    world: string,
  ): Promise<{ threats: AirTagMapThreatEvent[] } | null> {
    if (
      !canSubscribe(socket.data, {
        topic: "organization.presence",
        organizationId,
      }) ||
      !canReadPreciseLocation(socket.data, organizationId) ||
      !WORLD_PATTERN.test(world)
    )
      return null;

    const mapIds = await this.redis.command.smembers(
      this.threatMapsKey(organizationId, world),
    );

    const threats = await Promise.all(
      mapIds.map(async (value) => {
        const mapId = Number(value);

        if (!Number.isInteger(mapId)) return [];
        const hashTag = this.hashTag({ guildId: organizationId, world, mapId });

        const result = String(
          await this.redis.command.eval(
            THREAT_SNAPSHOT_SCRIPT,
            2,
            `${hashTag}:threats`,
            `${hashTag}:threat-state`,
            AIR_TAG_MAP_THREAT_TTL_MS,
          ),
        );

        if (result === "") return [];
        const snapshot = Schema.decodeUnknownSync(ThreatSnapshotJson)(result);

        return [
          {
            guildId: organizationId,
            world,
            mapId,
            ...snapshot,
            enemies: [...snapshot.enemies],
          },
        ];
      }),
    );

    return { threats: threats.flat() };
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

    return { world, mapId: expectedMapId, mapName: presence.location.map };
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
    const departures = payload.departures ?? [];

    return (
      Number.isInteger(payload.expectedMapId) &&
      payload.expectedMapId >= 0 &&
      payload.expectedMapId <= 65_535 &&
      payload.observations.length + departures.length > 0 &&
      payload.observations.length <= AIR_TAG_MAX_BATCH_SIZE &&
      departures.length <= AIR_TAG_MAX_BATCH_SIZE &&
      payload.observations.every(isAirTagObservation) &&
      departures.every(isAirTagDeparture)
    );
  }

  /**
   * Sends a list the throttle held back, or retries one that failed to go out,
   * even when the observer sends nothing more. Lives on this instance; a list
   * lost with it stays in Redis for `fetchMapThreats`.
   */
  private scheduleThreatFlush(
    scope: Pick<AirTagScope, "guildId" | "world" | "mapId">,
    delayMs: number,
    failedAttempts = 0,
  ): void {
    const hashTag = this.hashTag(scope);

    if (this.threatFlushes.has(hashTag)) return;

    this.threatFlushes.set(
      hashTag,
      setTimeout(
        () => {
          this.threatFlushes.delete(hashTag);
          void this.flushThreat(scope, failedAttempts);
        },
        Math.max(0, delayMs),
      ),
    );
  }

  private async flushThreat(
    scope: Pick<AirTagScope, "guildId" | "world" | "mapId">,
    failedAttempts: number,
  ): Promise<void> {
    const hashTag = this.hashTag(scope);

    try {
      const result = String(
        await this.redis.command.eval(
          THREAT_FLUSH_SCRIPT,
          2,
          `${hashTag}:threats`,
          `${hashTag}:threat-state`,
          AIR_TAG_MAP_THREAT_TTL_MS,
          THREAT_BROADCAST_THROTTLE_MS,
          failedAttempts > 0 ? "1" : "0",
        ),
      );

      if (result === "") return;
      const flush = Schema.decodeUnknownSync(ThreatFlushJson)(result);

      if ("retryInMs" in flush) {
        this.scheduleThreatFlush(scope, flush.retryInMs, failedAttempts);

        return;
      }

      await this.publishThreat(
        { ...scope, ...flush, enemies: [...flush.enemies] },
        failedAttempts,
      );
    } catch (error) {
      if (!this.retryThreat(scope, failedAttempts))
        this.logger.warn("Gave up publishing map threat", error);
    }
  }

  /** Returns false once the list has failed too often to try again. */
  private retryThreat(
    scope: Pick<AirTagScope, "guildId" | "world" | "mapId">,
    failedAttempts: number,
  ): boolean {
    if (failedAttempts >= THREAT_PUBLISH_ATTEMPTS - 1) return false;

    this.scheduleThreatFlush(
      scope,
      THREAT_BROADCAST_THROTTLE_MS * (failedAttempts + 1),
      failedAttempts + 1,
    );

    return true;
  }

  private async publishThreat(
    event: AirTagMapThreatEvent,
    failedAttempts = 0,
  ): Promise<void> {
    try {
      await this.redis.command.sadd(
        this.threatMapsKey(event.guildId, event.world),
        String(event.mapId),
      );
      await this.redis.command.expire(
        this.threatMapsKey(event.guildId, event.world),
        AIR_TAG_MAP_THREAT_TTL_MS / 1_000,
      );
      await this.hub.publishToScopes(
        [{ topic: "organization.presence", organizationId: event.guildId }],
        { v: 1, type: "air-tag.map-threat-updated", data: event },
        {
          // Any world: timers can show a world other than the recipient's own.
          recipientPlatform: "game",
          // A sighting reveals which map an observing member is on.
          organizationId: event.guildId,
          presenceAudience: "precise",
        },
      );
    } catch (error) {
      // AirTag updates of the same batch must still go out; the list goes out again later.
      if (!this.retryThreat(event, failedAttempts))
        this.logger.warn("Gave up publishing map threat", error);
    }
  }

  private threatMapsKey(guildId: string, world: string): string {
    return `air-tag:threat-maps:${guildId}:${world}`;
  }

  private async consumeRateLimit(key: string, limit: number) {
    try {
      const result = await this.redis.command.eval(
        RATE_LIMIT_SCRIPT,
        1,
        key,
        BATCH_RATE_WINDOW_MS,
        limit,
        crypto.randomUUID(),
      );

      if (!Array.isArray(result)) return null;

      return Schema.decodeUnknownSync(
        Schema.Tuple([Schema.Number, Schema.Number]),
      )(result.map(Number));
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
    const hashTag = this.hashTag(scope);

    return [
      `${hashTag}:targets`,
      `${hashTag}:expirations`,
      `${hashTag}:metadata`,
    ];
  }

  private hashTag(
    scope: Pick<AirTagScope, "guildId" | "world" | "mapId">,
  ): string {
    return `{air-tag:${scope.guildId}:${scope.world}:${scope.mapId}}`;
  }

  private async merge(
    scope: AirTagScope,
    {
      observer,
      observations,
      departures,
      threatsAllowed,
      mapName,
    }: {
      observer: string;
      observations: ReadonlyArray<AirTagObservation>;
      departures: ReadonlyArray<AirTagDeparture>;
      threatsAllowed: boolean;
      mapName: string;
    },
  ): Promise<MergeResult> {
    const hashTag = this.hashTag(scope);

    const result = await this.redis.command.eval(
      MERGE_SCRIPT,
      5,
      ...this.keys(scope),
      `${hashTag}:threats`,
      `${hashTag}:threat-state`,
      crypto.randomUUID(),
      JSON.stringify(observations),
      TARGET_TTL_MS,
      IDLE_TTL_SECONDS,
      MAX_TARGETS,
      BROADCAST_INTERVAL_MS,
      AIR_TAG_ENEMY_RELATION,
      AIR_TAG_CLAN_ENEMY_RELATION,
      AIR_TAG_MAP_THREAT_TTL_MS,
      THREAT_REFRESH_MS,
      THREAT_BROADCAST_THROTTLE_MS,
      threatsAllowed ? "1" : "0",
      mapName,
      observer,
      JSON.stringify(departures),
    );

    const { threat, ...parsed } = Schema.decodeUnknownSync(MergeResultJson)(
      String(result),
    );

    return {
      ...parsed,
      targets: [...parsed.targets],
      removed: [...parsed.removed],
      ...(threat && {
        threat: { revision: threat.revision, enemies: [...threat.enemies] },
      }),
    };
  }

  private async loadSnapshot(scope: AirTagScope): Promise<AirTagScopeSnapshot> {
    const result = await this.redis.command.eval(
      SNAPSHOT_SCRIPT,
      3,
      ...this.keys(scope),
      crypto.randomUUID(),
      IDLE_TTL_SECONDS,
    );

    const snapshot = Schema.decodeUnknownSync(SnapshotResultJson)(
      String(result),
    );

    return {
      guildId: scope.guildId,
      world: scope.world,
      mapId: scope.mapId,
      ...snapshot,
      targets: [...snapshot.targets],
    };
  }
}
