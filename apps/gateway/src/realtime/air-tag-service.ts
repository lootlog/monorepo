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
import type { SubscriptionScope } from "@lootlog/protocol/realtime";
import { chunk } from "es-toolkit";
import {
  Context,
  Effect,
  Exit,
  Layer,
  Metric,
  Schedule,
  Schema,
  Semaphore,
} from "effect";
import { runLogEffect } from "@lootlog/instrumentation";
import { RealtimeStoreError } from "#src/realtime/realtime-errors";
import {
  type RedisGatewayStore,
  type RedisScriptReply,
  GatewayRedis,
} from "#src/platform/redis-store";
import { type RealtimeHub, Hub } from "#src/realtime/realtime-hub";
import type { AirTagScope, GatewaySocket } from "#src/realtime/session";
import {
  canReadPreciseLocation,
  canSubscribe,
} from "#src/realtime/subscription-policy";
import {
  orAccessDenied,
  type CommandRoutes,
} from "#src/realtime/command-routes";
import type { CommandAdmission } from "#src/realtime/command-admission";

const TARGET_TTL_MS = 10_000;

const IDLE_TTL_SECONDS = 20;

const MAX_TARGETS = 100;

const BROADCAST_INTERVAL_MS = 1_000;

// A replica re-registers the scopes its sockets follow; a registration outlives
// two missed refreshes, and a stale one only costs an unneeded publication.
const INTEREST_REFRESH_MS = 30_000;

const INTEREST_TTL_MS = 90_000;

const INTEREST_BATCH_SIZE = 100;

// Registrations expire on Redis time, the clock the merge script compares them with.
const REGISTER_INTEREST_SCRIPT = `
local time=redis.call("TIME")
local expiresAt=(tonumber(time[1])*1000)+math.floor(tonumber(time[2])/1000)+tonumber(ARGV[2])
for _,key in ipairs(KEYS) do redis.call("ZADD",key,expiresAt,ARGV[1]); redis.call("PEXPIRE",key,ARGV[2]) end
return #KEYS
`;

const federatedUpdates = Metric.counter(
  "lootlog_gateway_air_tag_federated_updates_total",
  { incremental: true },
);

// Attributed once: deriving them on every batch costs more than the update.
const skippedFederatedUpdates = Metric.withAttributes(federatedUpdates, {
  outcome: "skipped",
});

const publishedFederatedUpdates = Metric.withAttributes(federatedUpdates, {
  outcome: "published",
});

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

// One round trip admits a batch: the connection limit, then the user limit, then
// each scope's disabled flag. The shared limiter reads KEYS and ARGV, so it runs
// as a function whose parameters shadow them.
const ADMISSION_SCRIPT = `
local function consume(KEYS, ARGV)
${slidingWindowRateLimitScript({ refreshExpiryOnReject: true, includeTimestamp: false })}
end
local connection=consume({KEYS[1]},{ARGV[1],ARGV[2],ARGV[4]})
if connection[1] ~= 1 then return connection end
local user=consume({KEYS[2]},{ARGV[1],ARGV[3],ARGV[4]})
if user[1] ~= 1 then return user end
local result={1,0}
for i=3,#KEYS do
  if redis.call("GET",KEYS[i]) == "1" then result[i]=1 else result[i]=0 end
end
return result
`;

const AdmissionReply = Schema.Array(Schema.Number);

// Shared by the observation and snapshot scripts.
const LUA_COMMON = `
local function nowMs()
  local time = redis.call("TIME")
  return (tonumber(time[1]) * 1000) + math.floor(tonumber(time[2]) / 1000)
end
local function public(target)
  local result = { targetId=target.targetId, nickname=target.nickname, relation=target.relation, x=target.x, y=target.y, lvl=target.lvl, prof=target.prof, stasis=target.stasis, observedAt=target.observedAt }
  if target.clan ~= nil then result.clan=target.clan end
  if target.enemyObservedAt ~= nil then result.enemyObservedAt=target.enemyObservedAt end
  if target.clanEnemyObservedAt ~= nil then result.clanEnemyObservedAt=target.clanEnemyObservedAt end
  return result
end
local function clanId(target)
  if target.clan == nil then return "" end
  return tostring(target.clan.id) .. ":" .. target.clan.name
end
local function threatEnemies(records, now)
  local enemies={}
  for _,record in pairs(records) do
    table.insert(enemies,{targetId=record.targetId,nickname=record.nickname,clan=record.clan,lvl=record.lvl,prof=record.prof,stasis=record.stasis,ageMs=now-tonumber(record.observedAt)})
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
-- Older game clients omit level, profession and stasis; keep the last reported value instead of erasing it.
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
local instance=ARGV[16]
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
    carry(target,observation,existing,"prof")
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
      broadcast=tonumber(existing.x) ~= tonumber(target.x) or tonumber(existing.y) ~= tonumber(target.y) or existing.nickname ~= target.nickname or clanId(existing) ~= clanId(target) or existing.lvl ~= target.lvl or existing.prof ~= target.prof or existing.stasis ~= target.stasis or effective(existing,now,ttl,enemy,clanEnemy) ~= effective(target,now,ttl,enemy,clanEnemy) or now-target.lastBroadcastAt >= interval
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
      carry(record,observation,previous,"prof")
      carry(record,observation,previous,"stasis")
      if previous == nil then
        threatCount=threatCount+1; due=true
      else
        record.reportedAt=previous.reportedAt
        -- A sighting last reported long ago must reach recipients before it turns stale for them.
        if previous.nickname ~= record.nickname or clanId(previous) ~= clanId(record) or previous.lvl ~= record.lvl or previous.prof ~= record.prof or previous.stasis ~= record.stasis or now-tonumber(previous.reportedAt or 0) >= threatRefresh then due=true end
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
-- Another replica follows this map, or every map of the Organization, so its sockets need the update through federation.
local function othersInterested(key)
  redis.call("ZREMRANGEBYSCORE",key,"-inf",now)
  local count=redis.call("ZCARD",key)
  if redis.call("ZSCORE",key,instance) ~= false then count=count-1 end
  return count
end
local interested=othersInterested(KEYS[6])+othersInterested(KEYS[7])
return withArrays(cjson.encode({epochId=metadata.epochId,epochStartedAt=metadata.epochStartedAt,revision=metadata.revision,acceptedTargets=accepted,targets=updates,removed=removed,threat=threatResult,threatPendingMs=threatPendingMs,remoteRecipients=interested > 0}),{"targets","removed","enemies"})
`;

const SNAPSHOT_SCRIPT = `${LUA_COMMON}
local now=nowMs(); local idle=tonumber(ARGV[2]); local raw=redis.call("GET",KEYS[3]); local metadata
-- Registered with the snapshot: an update merged later sees this replica, one merged earlier is in the snapshot.
redis.call("ZADD",KEYS[4],now+tonumber(ARGV[4]),ARGV[3]); redis.call("PEXPIRE",KEYS[4],ARGV[4])
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
  remoteRecipients: boolean;
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
    remoteRecipients: Schema.Boolean,
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
    "mget" | "sadd" | "smembers" | "expire"
  > & {
    eval(
      ...args: Parameters<RedisGatewayStore["command"]["eval"]>
    ): Promise<RedisScriptReply>;
  };
};

/** Logs are annotated only when written: annotating costs on every batch. */
const warn = (message: string, cause: unknown) =>
  Effect.logWarning(message, cause).pipe(
    Effect.annotateLogs({ context: "AirTagService" }),
  );

/** A Redis call whose reply is decoded inside it, failing as a store error. */
const storeCall = <A>(operation: string, evaluate: () => Promise<A>) =>
  Effect.tryPromise({
    try: evaluate,
    catch: (cause) => new RealtimeStoreError({ operation, cause }),
  });

type ThreatScope = Pick<AirTagScope, "guildId" | "world" | "mapId">;

const UNAVAILABLE = {
  status: "rejected",
  code: "temporarily-unavailable",
} as const;

export class AirTagService {
  /** Each socket's subscription changes one at a time, in the order it sent them. */
  private readonly subscriptionLocks = new WeakMap<
    GatewaySocket,
    Semaphore.Semaphore
  >();
  private readonly threatFlushes = new Map<
    string,
    ReturnType<typeof setTimeout>
  >();

  constructor(
    private readonly redis: ScriptStore,
    private readonly hub: Pick<
      RealtimeHub,
      | "subscribe"
      | "unsubscribe"
      | "publishToScopes"
      | "instanceId"
      | "getLocalScopes"
    >,
  ) {}

  updateSubscription(
    socket: GatewaySocket,
    payload: { requestId: string; enabled: boolean; expectedMapId?: number },
  ): Effect.Effect<AirTagSubscriptionAck> {
    return this.serialize(
      socket,
      Effect.suspend(() => this.performSubscriptionUpdate(socket, payload)),
    );
  }

  private performSubscriptionUpdate(
    socket: GatewaySocket,
    payload: { requestId: string; enabled: boolean; expectedMapId?: number },
  ): Effect.Effect<AirTagSubscriptionAck> {
    const { requestId } = payload;
    this.clearSubscription(socket);

    if (!payload.enabled)
      return Effect.succeed({ status: "accepted", requestId, scopes: [] });
    const context = this.getContext(socket, payload.expectedMapId);

    if (!context)
      return Effect.succeed({
        status: "rejected",
        requestId,
        code: "invalid-context",
      });

    const eligibleScopes = this.getEligibleScopes(
      socket,
      context.world,
      context.mapId,
    );

    if (eligibleScopes.length === 0)
      return Effect.succeed({
        status: "rejected",
        requestId,
        code: "forbidden",
      });

    const unavailable = {
      status: "rejected",
      requestId,
      code: "temporarily-unavailable",
    } as const;

    return storeCall("air-tag.disabled", () =>
      this.redis.command.mget(
        eligibleScopes.map((scope) => this.disabledKey(scope)),
      ),
    ).pipe(
      Effect.flatMap((disabled) => {
        const enabledScopes = eligibleScopes.filter(
          (_, index) => disabled[index] !== "1",
        );

        if (enabledScopes.length === 0) return Effect.succeed(unavailable);

        return Effect.try({
          try: () => {
            socket.data.airTagScopes = enabledScopes;

            for (const scope of enabledScopes)
              this.hub.subscribe(socket, scope.subscription);
          },
          catch: (cause) =>
            new RealtimeStoreError({ operation: "air-tag.subscribe", cause }),
        }).pipe(
          Effect.andThen(
            Effect.forEach(enabledScopes, (scope) => this.loadSnapshot(scope), {
              concurrency: "unbounded",
            }),
          ),
          Effect.map((scopes): AirTagSubscriptionAck => ({
            status: "accepted",
            requestId,
            scopes,
          })),
        );
      }),
      Effect.catch((error) =>
        Effect.sync(() => this.clearSubscription(socket)).pipe(
          Effect.andThen(warn("Failed to load air tag snapshots", error)),
          Effect.as(unavailable),
        ),
      ),
    );
  }

  publishObservations(
    socket: GatewaySocket,
    payload: ObservationBatch,
  ): Effect.Effect<AirTagObservationAck, RealtimeStoreError> {
    if (!this.hasValidBatch(payload))
      return Effect.succeed({ status: "rejected", code: "invalid-payload" });
    const context = this.getContext(socket, payload.expectedMapId);

    if (!context)
      return Effect.succeed({ status: "rejected", code: "invalid-context" });

    const scopes = socket.data.airTagScopes.filter(
      (scope) =>
        scope.world === context.world &&
        scope.mapId === context.mapId &&
        canSubscribe(socket.data, scope.subscription),
    );

    if (scopes.length === 0)
      return Effect.succeed({ status: "rejected", code: "forbidden" });

    return this.admitBatch(socket, scopes).pipe(
      Effect.flatMap(
        (
          admission,
        ): Effect.Effect<AirTagObservationAck, RealtimeStoreError> => {
          if (!admission) return Effect.succeed(UNAVAILABLE);

          if (admission.status === "rate-limited")
            return Effect.succeed({
              status: "rejected",
              code: "rate-limited",
              retryAfterMs: admission.retryAfterMs,
            });

          const observations = [
            ...new Map(
              payload.observations.map((item) => [item.targetId, item]),
            ).values(),
          ];

          const observedIds = new Set(
            observations.map((item) => item.targetId),
          );

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

          // Scopes are independent: a failed merge does not stop the others.
          // Forking costs more than a merge, and most observers share one scope.
          return Effect.forEach(
            admission.enabledScopes,
            (scope) =>
              this.merge(scope, {
                observer: socket.data.connectionId,
                observations,
                departures,
                threatsAllowed,
                mapName: context.mapName,
              }).pipe(
                Effect.map((result) => ({ scope, result })),
                Effect.exit,
              ),
            {
              concurrency: admission.enabledScopes.length > 1 ? "unbounded" : 1,
            },
          ).pipe(
            Effect.flatMap((results) =>
              this.publishMerges(
                results,
                socket.data.connectionId,
                context.mapName,
              ),
            ),
          );
        },
      ),
    );
  }

  /** Publishes each merged scope's threat and changes, in scope order. */
  private publishMerges(
    results: ReadonlyArray<
      Exit.Exit<{ scope: AirTagScope; result: MergeResult }, RealtimeStoreError>
    >,
    observer: string,
    mapName: string,
  ): Effect.Effect<AirTagObservationAck, RealtimeStoreError> {
    const steps: Array<Effect.Effect<void, RealtimeStoreError>> = [];
    let acceptedScopes = 0;
    let acceptedTargets = 0;

    for (const merged of results) {
      if (Exit.isFailure(merged)) {
        steps.push(warn("Failed to merge air tag observations", merged.cause));
        continue;
      }

      const { scope, result } = merged.value;
      acceptedScopes += 1;
      acceptedTargets += result.acceptedTargets;

      if (result.threat) {
        const { revision, enemies } = result.threat;

        steps.push(
          this.publishThreat({
            guildId: scope.guildId,
            world: scope.world,
            mapId: scope.mapId,
            mapName,
            revision,
            enemies,
          }),
        );
      }

      const pendingMs = result.threatPendingMs;

      if (pendingMs !== undefined)
        steps.push(
          Effect.sync(() => this.scheduleThreatFlush(scope, pendingMs)),
        );

      if (result.targets.length > 0 || result.removed.length > 0)
        steps.push(
          this.publishScopeUpdate(scope, observer, result.remoteRecipients, {
            guildId: scope.guildId,
            world: scope.world,
            mapId: scope.mapId,
            epochId: result.epochId,
            epochStartedAt: result.epochStartedAt,
            revision: result.revision,
            targets: result.targets,
            removedTargetIds: result.removed,
          }),
        );
    }

    const outcome: AirTagObservationAck =
      acceptedScopes === 0
        ? UNAVAILABLE
        : { status: "accepted", acceptedScopes, acceptedTargets };

    return Effect.forEach(steps, (step) => step, { discard: true }).pipe(
      Effect.as(outcome),
    );
  }

  /** One publication per batch. */
  private publishScopeUpdate(
    scope: AirTagScope,
    excludeConnectionId: string,
    remoteRecipients: boolean,
    event: AirTagScopeUpdateEvent,
  ): Effect.Effect<void, RealtimeStoreError> {
    const localOnly = !remoteRecipients;

    return Metric.update(
      localOnly ? skippedFederatedUpdates : publishedFederatedUpdates,
      1,
    ).pipe(
      Effect.andThen(
        storeCall("air-tag.publish", () =>
          this.hub.publishToScopes(
            [scope.subscription],
            {
              v: 1,
              type: "air-tag.scope-updated",
              sequence: event.revision,
              data: event,
            },
            {
              excludeConnectionId,
              recipientPlatform: "game",
              recipientWorld: scope.world,
              recipientMapId: scope.mapId,
              localOnly,
            },
          ),
        ),
      ),
    );
  }

  /** Current map threats of one Organization and world, for a client that just connected. */
  fetchMapThreats(
    socket: GatewaySocket,
    organizationId: string,
    world: string,
  ): Effect.Effect<
    { threats: AirTagMapThreatEvent[] } | null,
    RealtimeStoreError
  > {
    if (
      !canSubscribe(socket.data, {
        topic: "organization.presence",
        organizationId,
      }) ||
      !canReadPreciseLocation(socket.data, organizationId) ||
      !WORLD_PATTERN.test(world)
    )
      return Effect.succeed(null);

    return storeCall("air-tag.threat-maps", () =>
      this.redis.command.smembers(this.threatMapsKey(organizationId, world)),
    ).pipe(
      Effect.flatMap((mapIds) =>
        Effect.forEach(
          mapIds,
          (value) => {
            const mapId = Number(value);

            if (!Number.isInteger(mapId)) return Effect.succeed([]);

            const hashTag = this.hashTag({
              guildId: organizationId,
              world,
              mapId,
            });

            return storeCall("air-tag.threat-snapshot", async () => {
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

              const snapshot =
                Schema.decodeUnknownSync(ThreatSnapshotJson)(result);

              return [
                {
                  guildId: organizationId,
                  world,
                  mapId,
                  ...snapshot,
                  enemies: [...snapshot.enemies],
                },
              ];
            });
          },
          { concurrency: "unbounded" },
        ),
      ),
      Effect.map((threats) => ({ threats: threats.flat() })),
    );
  }

  clearSubscription(socket: GatewaySocket): void {
    for (const scope of socket.data.airTagScopes)
      this.hub.unsubscribe(socket, scope.subscription);
    socket.data.airTagScopes = [];
  }

  private serialize<A, E>(
    socket: GatewaySocket,
    effect: Effect.Effect<A, E>,
  ): Effect.Effect<A, E> {
    let lock = this.subscriptionLocks.get(socket);

    if (!lock) {
      lock = Semaphore.makeUnsafe(1);
      this.subscriptionLocks.set(socket, lock);
    }

    return lock.withPermits(1)(effect);
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
    scope: ThreatScope,
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
          runLogEffect(this.flushThreat(scope, failedAttempts));
        },
        Math.max(0, delayMs),
      ),
    );
  }

  private flushThreat(
    scope: ThreatScope,
    failedAttempts: number,
  ): Effect.Effect<void> {
    const hashTag = this.hashTag(scope);

    return storeCall("air-tag.threat-flush", async () => {
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

      return result === ""
        ? undefined
        : Schema.decodeUnknownSync(ThreatFlushJson)(result);
    }).pipe(
      Effect.flatMap((flush) => {
        if (flush === undefined) return Effect.void;

        if ("retryInMs" in flush)
          return Effect.sync(() =>
            this.scheduleThreatFlush(scope, flush.retryInMs, failedAttempts),
          );

        return this.publishThreat(
          { ...scope, ...flush, enemies: [...flush.enemies] },
          failedAttempts,
        );
      }),
      Effect.catch((error) =>
        this.giveUpOrRetryThreat(scope, failedAttempts, error),
      ),
    );
  }

  /** Retries the list later, or logs once it has failed too often. */
  private giveUpOrRetryThreat(
    scope: ThreatScope,
    failedAttempts: number,
    error: RealtimeStoreError,
  ): Effect.Effect<void> {
    if (failedAttempts >= THREAT_PUBLISH_ATTEMPTS - 1)
      return warn("Gave up publishing map threat", error);

    return Effect.sync(() =>
      this.scheduleThreatFlush(
        scope,
        THREAT_BROADCAST_THROTTLE_MS * (failedAttempts + 1),
        failedAttempts + 1,
      ),
    );
  }

  private publishThreat(
    event: AirTagMapThreatEvent,
    failedAttempts = 0,
  ): Effect.Effect<void> {
    const threatMaps = this.threatMapsKey(event.guildId, event.world);

    return storeCall("air-tag.threat-publish", async () => {
      await this.redis.command.sadd(threatMaps, String(event.mapId));
      await this.redis.command.expire(
        threatMaps,
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
    }).pipe(
      // AirTag updates of the same batch must still go out; the list goes out again later.
      Effect.catch((error) =>
        this.giveUpOrRetryThreat(event, failedAttempts, error),
      ),
    );
  }

  /**
   * Registers this replica for a `map.air-tags` subscription made outside
   * `air-tag.subscription`, so later updates merged on other replicas reach it.
   */
  registerInterest(
    scope: SubscriptionScope,
  ): Effect.Effect<void, RealtimeStoreError> {
    return this.register([this.interestKeyFor(scope)]);
  }

  /** Keeps this replica registered for every air-tag scope a local socket follows. */
  runInterestRefresh() {
    return Effect.suspend(() => this.refreshInterest()).pipe(
      Effect.catchCause((cause) =>
        warn("Air tag interest refresh failed", cause),
      ),
      Effect.repeat(Schedule.spaced(INTEREST_REFRESH_MS)),
    );
  }

  private refreshInterest(): Effect.Effect<void, RealtimeStoreError> {
    const keys = new Set(
      this.hub
        .getLocalScopes("map.air-tags")
        .map((scope) => this.interestKeyFor(scope)),
    );

    return Effect.forEach(
      chunk([...keys], INTEREST_BATCH_SIZE),
      (batch) => this.register(batch),
      { concurrency: "unbounded", discard: true },
    );
  }

  private register(
    keys: ReadonlyArray<string>,
  ): Effect.Effect<void, RealtimeStoreError> {
    return storeCall("air-tag.interest", async () => {
      await this.redis.command.eval(
        REGISTER_INTEREST_SCRIPT,
        keys.length,
        ...keys,
        this.hub.instanceId,
        INTEREST_TTL_MS,
      );
    });
  }

  /** A scope without a world or map follows every map of its Organization. */
  private interestKeyFor(scope: SubscriptionScope): string {
    const organizationId = scope.organizationId ?? "";

    return scope.world === undefined || scope.mapId === undefined
      ? this.anyMapInterestKey(organizationId)
      : this.interestKey({
          guildId: organizationId,
          world: scope.world,
          mapId: scope.mapId,
        });
  }

  private anyMapInterestKey(organizationId: string): string {
    return `{air-tag:${organizationId}}:any-map:replicas`;
  }

  private interestKey(scope: ThreatScope): string {
    return `${this.hashTag(scope)}:replicas`;
  }

  private threatMapsKey(guildId: string, world: string): string {
    return `air-tag:threat-maps:${guildId}:${world}`;
  }

  /** The batch's rate-limit verdict and enabled scopes, or null when Redis cannot decide. */
  private admitBatch(
    socket: GatewaySocket,
    scopes: ReadonlyArray<AirTagScope>,
  ): Effect.Effect<
    | { status: "admitted"; enabledScopes: AirTagScope[] }
    | { status: "rate-limited"; retryAfterMs: number }
    | null
  > {
    return storeCall("air-tag.admission", async () => {
      const reply = await this.redis.command.eval(
        ADMISSION_SCRIPT,
        2 + scopes.length,
        `air-tag:rate:connection:${socket.data.connectionId}`,
        `air-tag:rate:${socket.data.userId}`,
        ...scopes.map((scope) => this.disabledKey(scope)),
        BATCH_RATE_WINDOW_MS,
        CONNECTION_BATCH_RATE_LIMIT,
        USER_BATCH_RATE_LIMIT,
        crypto.randomUUID(),
      );

      if (!Array.isArray(reply)) return null;

      const [admitted, retryAfterMs = 0, ...disabled] =
        Schema.decodeUnknownSync(AdmissionReply)(reply.map(Number));

      if (admitted !== 1)
        return { status: "rate-limited", retryAfterMs } as const;

      return {
        status: "admitted",
        enabledScopes: scopes.filter((_, index) => disabled[index] !== 1),
      } as const;
    }).pipe(
      Effect.catch((error) =>
        warn("Failed to admit air tag observations", error).pipe(
          Effect.as(null),
        ),
      ),
    );
  }

  private disabledKey(scope: Pick<AirTagScope, "guildId" | "world">): string {
    return `air-tag:disabled:${scope.guildId}:${scope.world}`;
  }

  private keys(scope: AirTagScope): [string, string, string] {
    const hashTag = this.hashTag(scope);

    return [
      `${hashTag}:targets`,
      `${hashTag}:expirations`,
      `${hashTag}:metadata`,
    ];
  }

  private hashTag(scope: ThreatScope): string {
    return `{air-tag:${scope.guildId}:${scope.world}:${scope.mapId}}`;
  }

  private merge(
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
  ): Effect.Effect<MergeResult, RealtimeStoreError> {
    const hashTag = this.hashTag(scope);

    return storeCall("air-tag.merge", async () => {
      const result = await this.redis.command.eval(
        MERGE_SCRIPT,
        7,
        ...this.keys(scope),
        `${hashTag}:threats`,
        `${hashTag}:threat-state`,
        this.interestKey(scope),
        this.anyMapInterestKey(scope.guildId),
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
        this.hub.instanceId,
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
    });
  }

  private loadSnapshot(
    scope: AirTagScope,
  ): Effect.Effect<AirTagScopeSnapshot, RealtimeStoreError> {
    return storeCall("air-tag.snapshot", async () => {
      const result = await this.redis.command.eval(
        SNAPSHOT_SCRIPT,
        4,
        ...this.keys(scope),
        this.interestKey(scope),
        crypto.randomUUID(),
        IDLE_TTL_SECONDS,
        this.hub.instanceId,
        INTEREST_TTL_MS,
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
    });
  }
}

/** AirTag observations, their scopes and map threats, with the interest refresh. */
export class AirTags extends Context.Service<AirTags, AirTagService>()(
  "@lootlog/gateway/realtime/AirTags",
) {
  static readonly layer = Layer.effect(
    AirTags,
    Effect.gen(function* () {
      const airTags = new AirTagService(yield* GatewayRedis, yield* Hub);

      yield* airTags.runInterestRefresh().pipe(Effect.forkScoped);

      return airTags;
    }),
  );
}

export const airTagRoutes = (
  airTags: Pick<
    AirTagService,
    "updateSubscription" | "publishObservations" | "fetchMapThreats"
  >,
  observationAdmission: Pick<CommandAdmission, "tryAcquire">,
) =>
  ({
    "air-tag.subscription": {
      joined: true,
      run: (socket, data) => airTags.updateSubscription(socket, data),
    },
    "air-tag.observation": {
      joined: true,
      run: (socket, data) =>
        Effect.suspend(() => {
          const admission = observationAdmission.tryAcquire();

          // A rejected batch loses nothing: the client merges it into its next one.
          if (!admission.admitted)
            return Effect.succeed<AirTagObservationAck>({
              status: "rejected",
              code: "rate-limited",
              retryAfterMs: admission.retryAfterMs,
            });

          return airTags
            .publishObservations(socket, data)
            .pipe(Effect.ensuring(Effect.sync(admission.release)));
        }),
    },
    "air-tag.map-threats.fetch": {
      joined: true,
      run: (socket, { organizationId, world }) =>
        orAccessDenied(airTags.fetchMapThreats(socket, organizationId, world)),
    },
  }) satisfies Pick<
    CommandRoutes,
    "air-tag.subscription" | "air-tag.observation" | "air-tag.map-threats.fetch"
  >;
