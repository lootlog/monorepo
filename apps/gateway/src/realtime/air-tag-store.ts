import { slidingWindowRateLimitScript } from "@lootlog/database/sliding-window-rate-limit";
import {
  AIR_TAG_CLAN_ENEMY_RELATION,
  AIR_TAG_ENEMY_RELATION,
  AIR_TAG_MAP_THREAT_TTL_MS,
  AirTagMapThreatEventSchema,
  AirTagTargetSchema,
  type AirTagDeparture,
  type AirTagMapThreatEnemy,
  type AirTagMapThreatEvent,
  type AirTagObservation,
  type AirTagScopeSnapshot,
  type AirTagScopeUpdateEvent,
} from "@lootlog/schema/air-tag";
import type { SubscriptionScope } from "@lootlog/protocol/realtime";
import { Effect, Schema } from "effect";
import { RealtimeStoreError, storeCall } from "#src/realtime/realtime-errors";
import type {
  RedisGatewayStore,
  RedisScriptReply,
} from "#src/platform/redis-store";
import type { AirTagScope, SessionData } from "#src/realtime/session";

const TARGET_TTL_MS = 10_000;

const IDLE_TTL_SECONDS = 20;

const MAX_TARGETS = 100;

const BROADCAST_INTERVAL_MS = 1_000;

// Outlives two missed refreshes of the interest a replica re-registers.
const INTEREST_TTL_MS = 90_000;

// Registrations expire on Redis time, the clock the merge script compares them with.
const REGISTER_INTEREST_SCRIPT = `
local time=redis.call("TIME")
local expiresAt=(tonumber(time[1])*1000)+math.floor(tonumber(time[2])/1000)+tonumber(ARGV[2])
for _,key in ipairs(KEYS) do redis.call("ZADD",key,expiresAt,ARGV[1]); redis.call("PEXPIRE",key,ARGV[2]) end
return #KEYS
`;

// A still enemy is sighted at most 6.5 s apart; re-reporting a sighting this old keeps its
// age under `AIR_TAG_MAP_THREAT_FRESH_MS` on recipients.
const THREAT_REFRESH_MS = 4_000;

// Caps full-list fan-out per map; a change inside the window is sent with the next sighting.
export const THREAT_BROADCAST_THROTTLE_MS = 1_000;

// One game tab sends at most two batches a second.
const CONNECTION_BATCH_RATE_LIMIT = 15;

// Several characters of one user may each observe a busy map.
const USER_BATCH_RATE_LIMIT = 45;

const BATCH_RATE_WINDOW_MS = 3_000;

// One round trip admits a batch: the user limit, then each scope's disabled
// flag. The shared limiter reads KEYS and ARGV, so it runs as a function whose
// parameters shadow them. The connection limit is enforced in process by
// {@link admitConnectionBatch}.
const ADMISSION_SCRIPT = `
local function consume(KEYS, ARGV)
${slidingWindowRateLimitScript({ refreshExpiryOnReject: true, includeTimestamp: false })}
end
local user=consume({KEYS[1]},{ARGV[1],ARGV[2],ARGV[3]})
if user[1] ~= 1 then return user end
local result={1,0}
for i=2,#KEYS do
  if redis.call("GET",KEYS[i]) == "1" then result[i+1]=1 else result[i+1]=0 end
end
return result
`;

export type ConnectionBatchAdmission =
  | { readonly admitted: true }
  | { readonly admitted: false; readonly retryAfterMs: number };

/**
 * The connection limit over the same window the shared limiter used. A
 * connection only ever reports through the replica that holds its socket, so
 * this needs no shared state, and a flooding connection no longer reaches
 * Dragonfly at all.
 */
export const admitConnectionBatch = (
  session: Pick<SessionData, "airTagBatchesSentAt">,
  now: number,
): ConnectionBatchAdmission => {
  const sentAt = (session.airTagBatchesSentAt ??= []);

  let kept = 0;

  for (const at of sentAt) {
    if (now - at < BATCH_RATE_WINDOW_MS) sentAt[kept++] = at;
  }

  sentAt.length = kept;

  const oldest = sentAt[0];

  if (oldest !== undefined && sentAt.length >= CONNECTION_BATCH_RATE_LIMIT) {
    return {
      admitted: false,
      retryAfterMs: Math.max(1, oldest + BATCH_RATE_WINDOW_MS - now),
    };
  }

  sentAt.push(now);

  return { admitted: true };
};

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
  local stale={}
  local raw=redis.call("HGETALL",key)
  for i=1,#raw,2 do
    local record=cjson.decode(raw[i+1])
    if now-tonumber(record.observedAt) >= threatTtl then stale[#stale+1]=raw[i] else records[raw[i]]=record; count=count+1 end
  end
  if #stale > 0 then redis.call("HDEL",key,unpack(stale)) end
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
-- An observation omits level, profession and stasis when they did not change; keep the last reported value.
local function carry(target, observation, existing, field)
  if observation[field] ~= nil then target[field]=observation[field] elseif existing ~= nil then target[field]=existing[field] end
end
-- Connections that reported the target within the TTL; a live observer reports it at least every 6.5 s.
local function liveObservers(target, now, ttl)
  local observers={}
  if target.seenBy ~= nil then
    for id,seenAt in pairs(target.seenBy) do
      if now-tonumber(seenAt) < ttl then observers[id]=seenAt end
    end
  end
  return observers
end
-- Dragonfly charges a Lua redis.call about what it charges a client command, so
-- this script costs what its call count costs. Reads and writes are staged and
-- issued once per key instead of once per target.
local writes={}
local writeAt={}
local scores={}
local drops={}
local function stage(id, encoded, score)
  local at=writeAt[id]
  if at ~= nil then writes[at]=encoded else
    writes[#writes+1]=id; writes[#writes+1]=encoded; writeAt[id]=#writes
  end
  if score ~= nil then scores[#scores+1]=score; scores[#scores+1]=id end
end
local function flush()
  if #drops > 0 then redis.call("HDEL",KEYS[1],unpack(drops)); redis.call("ZREM",KEYS[2],unpack(drops)); drops={} end
  if #writes > 0 then redis.call("HSET",KEYS[1],unpack(writes)); writes={}; writeAt={} end
  if #scores > 0 then redis.call("ZADD",KEYS[2],unpack(scores)); scores={} end
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
-- Caller-deduplicated ids, and a departure never shares a target with a
-- sighting, so one read covers both loops.
local touched={}
for _,departure in ipairs(departures) do touched[#touched+1]=departure.targetId end
for _,observation in ipairs(observations) do touched[#touched+1]=observation.targetId end
local stored={}
if #touched > 0 then
  local rows=redis.call("HMGET",KEYS[1],unpack(touched))
  for index,id in ipairs(touched) do
    if rows[index] ~= false then stored[id]=cjson.decode(rows[index]) end
  end
end
local threatDrops={}
-- A target leaves once no observer still sees it and one of them saw it leave the map;
-- a target only out of sight stays until its TTL.
for _,departure in ipairs(departures) do
  local target=stored[departure.targetId]
  if target ~= nil then
    local observers=liveObservers(target,now,ttl)
    if observers[observer] ~= nil then
      observers[observer]=nil
      if departure.reason == "left-map" then target.departed=true end
      if target.departed == true and next(observers) == nil then
        drops[#drops+1]=departure.targetId
        stored[departure.targetId]=nil
        count=count-1
        metadata.revision=tonumber(metadata.revision)+1
        table.insert(removed,departure.targetId)
        if threatsAllowed then threatDrops[#threatDrops+1]=departure.targetId end
      else
        target.seenBy=observers
        stage(departure.targetId,cjson.encode(target))
      end
    end
  end
end
if #threatDrops > 0 and redis.call("HDEL",KEYS[4],unpack(threatDrops)) > 0 then threatRemoved=true end
for _,observation in ipairs(observations) do
  local existing=stored[observation.targetId]
  local shouldAccept=true
  if existing == nil and count >= maxTargets then
    shouldAccept=false
    if isThreat(tonumber(observation.relation),enemy,clanEnemy) then
      -- A full map evicting a non-threat is rare, and it scans committed state,
      -- so the staged writes go out first.
      flush()
      local candidates=redis.call("ZRANGE",KEYS[2],0,-1)
      for _,candidateId in ipairs(candidates) do
        local candidateRaw=redis.call("HGET",KEYS[1],candidateId)
        if candidateRaw ~= false then
          local candidate=cjson.decode(candidateRaw)
          if not isThreat(effective(candidate,now,ttl,enemy,clanEnemy),enemy,clanEnemy) then
            redis.call("HDEL",KEYS[1],candidateId); redis.call("ZREM",KEYS[2],candidateId)
            stored[candidateId]=nil
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
    stage(target.targetId,cjson.encode(target),now+ttl)
    if existing == nil then count=count+1 end
    accepted=accepted+1
  end
end
flush()
redis.call("SET",KEYS[3],cjson.encode(metadata),"EX",idle)
-- EXPIRE on a missing key does nothing, so it needs no EXISTS guard.
redis.call("EXPIRE",KEYS[1],idle)
redis.call("EXPIRE",KEYS[2],idle)
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
local threatWrites={}
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
      threatWrites[#threatWrites+1]=observation.targetId
      threatWrites[#threatWrites+1]=cjson.encode(record)
    end
  end
  state.pending=false
  -- An empty list tells recipients the last enemy left.
  if due then
    if now-tonumber(state.broadcastAt) >= threatThrottle then
      -- A broadcast stamps every record, so it supersedes the staged sightings.
      threatWrites={}
      for id,record in pairs(records) do
        record.reportedAt=record.observedAt
        threatWrites[#threatWrites+1]=id
        threatWrites[#threatWrites+1]=cjson.encode(record)
      end
      state.broadcastAt=now
      threatResult={revision=now,enemies=threatEnemies(records,now)}
    else
      state.pending=true
      threatPendingMs=threatThrottle-(now-tonumber(state.broadcastAt))
    end
  end
  if #threatWrites > 0 then redis.call("HSET",KEYS[4],unpack(threatWrites)) end
  state.mapName=mapName
  redis.call("SET",KEYS[5],cjson.encode(state),"PX",threatTtl)
  if next(records) ~= nil then redis.call("PEXPIRE",KEYS[4],threatTtl) end
end
-- Another replica follows this map, or every map of the Organization, so its sockets need the update through federation.
-- A registration expires with its key and only a handful of replicas ever hold
-- one, so counting the live scores beats sweeping the stale ones on every merge.
local function othersInterested(key)
  local live=redis.call("ZCOUNT",key,"("..now,"+inf")
  if live == 0 then return false end
  if live > 1 then return true end
  local mine=redis.call("ZSCORE",key,instance)
  return mine == false or tonumber(mine) <= now
end
local remoteRecipients=(#updates > 0 or #removed > 0) and (othersInterested(KEYS[6]) or othersInterested(KEYS[7]))
return withArrays(cjson.encode({epochId=metadata.epochId,epochStartedAt=metadata.epochStartedAt,revision=metadata.revision,acceptedTargets=accepted,targets=updates,removed=removed,threat=threatResult,threatPendingMs=threatPendingMs,remoteRecipients=remoteRecipients}),{"targets","removed","enemies"})
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

export interface MergeResult {
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

export type ScriptStore = {
  command: Pick<
    RedisGatewayStore["command"],
    "mget" | "sadd" | "smembers" | "expire"
  > & {
    eval(
      ...args: Parameters<RedisGatewayStore["command"]["eval"]>
    ): Promise<RedisScriptReply>;
  };
};

/** A Redis call whose reply is decoded inside it, failing as a store error. */

export type ThreatScope = Pick<AirTagScope, "guildId" | "world" | "mapId">;

/** Keeps every key of one map on one cluster slot. */
export const hashTag = (scope: ThreatScope): string =>
  `{air-tag:${scope.guildId}:${scope.world}:${scope.mapId}}`;

const scopeKeys = (scope: AirTagScope): [string, string, string] => {
  const tag = hashTag(scope);

  return [`${tag}:targets`, `${tag}:expirations`, `${tag}:metadata`];
};

const disabledKey = (scope: Pick<AirTagScope, "guildId" | "world">): string =>
  `air-tag:disabled:${scope.guildId}:${scope.world}`;

const anyMapInterestKey = (organizationId: string): string =>
  `{air-tag:${organizationId}}:any-map:replicas`;

const interestKey = (scope: ThreatScope): string =>
  `${hashTag(scope)}:replicas`;

export const threatMapsKey = (guildId: string, world: string): string =>
  `air-tag:threat-maps:${guildId}:${world}`;

/** A scope without a world or map follows every map of its Organization. */
export const interestKeyFor = (scope: SubscriptionScope): string => {
  const organizationId = scope.organizationId ?? "";

  return scope.world === undefined || scope.mapId === undefined
    ? anyMapInterestKey(organizationId)
    : interestKey({
        guildId: organizationId,
        world: scope.world,
        mapId: scope.mapId,
      });
};

/** Each scope's disabled flag, in scope order. */
export const readDisabledFlags = (
  redis: ScriptStore,
  scopes: ReadonlyArray<AirTagScope>,
) =>
  storeCall("air-tag.disabled", () =>
    redis.command.mget(scopes.map((scope) => disabledKey(scope))),
  );

export type BatchAdmission =
  | { status: "admitted"; enabledScopes: AirTagScope[] }
  | { status: "rate-limited"; retryAfterMs: number };

/** The batch's rate-limit verdict and enabled scopes, or null for an unexpected reply. */
export const admitBatch = (
  redis: ScriptStore,
  userId: string,
  scopes: ReadonlyArray<AirTagScope>,
): Effect.Effect<BatchAdmission | null, RealtimeStoreError> =>
  storeCall("air-tag.admission", async () => {
    const reply = await redis.command.eval(
      ADMISSION_SCRIPT,
      1 + scopes.length,
      `air-tag:rate:${userId}`,
      ...scopes.map((scope) => disabledKey(scope)),
      BATCH_RATE_WINDOW_MS,
      USER_BATCH_RATE_LIMIT,
      crypto.randomUUID(),
    );

    if (!Array.isArray(reply)) return null;

    const [admitted, retryAfterMs = 0, ...disabled] = Schema.decodeUnknownSync(
      AdmissionReply,
    )(reply.map(Number));

    if (admitted !== 1)
      return { status: "rate-limited", retryAfterMs } as const;

    return {
      status: "admitted",
      enabledScopes: scopes.filter((_, index) => disabled[index] !== 1),
    } as const;
  });

export const mergeObservations = (
  redis: ScriptStore,
  instanceId: string,
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
): Effect.Effect<MergeResult, RealtimeStoreError> => {
  const tag = hashTag(scope);

  return storeCall("air-tag.merge", async () => {
    const result = await redis.command.eval(
      MERGE_SCRIPT,
      7,
      ...scopeKeys(scope),
      `${tag}:threats`,
      `${tag}:threat-state`,
      interestKey(scope),
      anyMapInterestKey(scope.guildId),
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
      instanceId,
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
};

/** The scope's targets, registering this replica for its later updates. */
export const loadScopeSnapshot = (
  redis: ScriptStore,
  instanceId: string,
  scope: AirTagScope,
): Effect.Effect<AirTagScopeSnapshot, RealtimeStoreError> =>
  storeCall("air-tag.snapshot", async () => {
    const result = await redis.command.eval(
      SNAPSHOT_SCRIPT,
      4,
      ...scopeKeys(scope),
      interestKey(scope),
      crypto.randomUUID(),
      IDLE_TTL_SECONDS,
      instanceId,
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

/** Maps of one Organization and world that published a threat within its TTL. */
export const readThreatMapIds = (
  redis: ScriptStore,
  organizationId: string,
  world: string,
) =>
  storeCall("air-tag.threat-maps", () =>
    redis.command.smembers(threatMapsKey(organizationId, world)),
  );

/** One map's live threat list, empty when it has none. */
export const loadMapThreat = (redis: ScriptStore, scope: ThreatScope) => {
  const tag = hashTag(scope);

  return storeCall(
    "air-tag.threat-snapshot",
    async (): Promise<AirTagMapThreatEvent[]> => {
      const result = String(
        await redis.command.eval(
          THREAT_SNAPSHOT_SCRIPT,
          2,
          `${tag}:threats`,
          `${tag}:threat-state`,
          AIR_TAG_MAP_THREAT_TTL_MS,
        ),
      );

      if (result === "") return [];

      const snapshot = Schema.decodeUnknownSync(ThreatSnapshotJson)(result);

      return [{ ...scope, ...snapshot, enemies: [...snapshot.enemies] }];
    },
  );
};

/**
 * The map's held-back list once its throttle window passed, or a wait; `retry`
 * also takes a list that was not held back, to resend one that failed to go out.
 */
export const takeThreatFlush = (
  redis: ScriptStore,
  scope: ThreatScope,
  retry: boolean,
) => {
  const tag = hashTag(scope);

  return storeCall("air-tag.threat-flush", async () => {
    const result = String(
      await redis.command.eval(
        THREAT_FLUSH_SCRIPT,
        2,
        `${tag}:threats`,
        `${tag}:threat-state`,
        AIR_TAG_MAP_THREAT_TTL_MS,
        THREAT_BROADCAST_THROTTLE_MS,
        retry ? "1" : "0",
      ),
    );

    return result === ""
      ? undefined
      : Schema.decodeUnknownSync(ThreatFlushJson)(result);
  });
};

export const registerReplicaInterest = (
  redis: ScriptStore,
  instanceId: string,
  keys: ReadonlyArray<string>,
): Effect.Effect<void, RealtimeStoreError> =>
  storeCall("air-tag.interest", async () => {
    await redis.command.eval(
      REGISTER_INTEREST_SCRIPT,
      keys.length,
      ...keys,
      instanceId,
      INTEREST_TTL_MS,
    );
  });
