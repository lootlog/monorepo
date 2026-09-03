import { EVENT_SCORING_MODES } from "@lootlog/domain/scoring";
import { Schema } from "effect";
import {
  flexibleIsoDatetimeCodec,
  isoDatetimeCodec,
  jsonValueSchema,
  nullableFlexibleIsoDatetimeCodec,
} from "#src/shared/schema/response-codecs";

const EventKillHeroNpcResponse = Schema.Struct({
  id: Schema.String,
  npcId: Schema.NullOr(Schema.Number),
  npcName: Schema.String,
  npcIcon: Schema.NullOr(Schema.String),
  npcLvl: Schema.NullOr(Schema.Number),
});

const EventKillParticipantMemberResponse = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  avatar: Schema.NullOr(Schema.String),
  userId: Schema.String,
});

const EventKillParticipantRoleResponse = Schema.Struct({
  position: Schema.NullOr(Schema.Number),
  color: Schema.NullOr(Schema.Number),
});

const EventKillParticipantMapDataResponse = Schema.Struct({
  mapId: Schema.String,
  mapName: Schema.String,
  assignedAt: flexibleIsoDatetimeCodec,
  unassignedAt: nullableFlexibleIsoDatetimeCodec,
  assignmentDurationSeconds: Schema.Number,
  presenceTimeSeconds: Schema.Number,
  afkTimeSeconds: Schema.Number,
});

export const EventKillParticipantResponse = Schema.Struct({
  id: Schema.String,
  memberId: Schema.Number,
  points: Schema.Number,
  basePoints: Schema.Number,
  manualAdjustmentPoints: Schema.optionalKey(Schema.NullOr(Schema.Number)),
  trackingDurationSeconds: Schema.NullOr(Schema.Number),
  trackingDurationPercentage: Schema.NullOr(Schema.Number),
  timeOnMapSeconds: Schema.Number,
  afkPercentage: Schema.Number,
  wasPresent: Schema.Boolean,
  bonusBreakdown: Schema.optionalKey(Schema.NullOr(jsonValueSchema)),
  member: EventKillParticipantMemberResponse,
  mapData: Schema.optionalKey(
    Schema.Array(EventKillParticipantMapDataResponse),
  ),
});

const EventKillHistoryEntryResponse = Schema.Struct({
  id: Schema.String,
  heroNpcId: Schema.String,
  killedAt: isoDatetimeCodec,
  minSpawnTimeAtKill: isoDatetimeCodec,
  maxSpawnTimeAtKill: isoDatetimeCodec,
  isManualClose: Schema.Boolean,
  heroNpc: EventKillHeroNpcResponse,
  points: Schema.Array(EventKillParticipantResponse),
});

export const EventKillHistoryResponse = Schema.Struct({
  data: Schema.Array(EventKillHistoryEntryResponse),
  nextCursor: Schema.NullOr(Schema.String),
});

const EventMemberKillHistoryEntryResponse = Schema.Struct({
  id: Schema.String,
  heroNpcId: Schema.String,
  killedAt: isoDatetimeCodec,
  minSpawnTimeAtKill: isoDatetimeCodec,
  maxSpawnTimeAtKill: isoDatetimeCodec,
  isManualClose: Schema.Boolean,
  heroNpc: EventKillHeroNpcResponse,
  memberPoint: Schema.NullOr(EventKillParticipantResponse),
});

export const EventMemberKillHistoryResponse = Schema.Struct({
  member: EventKillParticipantMemberResponse,
  data: Schema.Array(EventMemberKillHistoryEntryResponse),
  nextCursor: Schema.NullOr(Schema.String),
});

const KillDetailParticipantMemberResponse = Schema.Struct({
  ...EventKillParticipantMemberResponse.fields,
  roles: Schema.Array(EventKillParticipantRoleResponse),
});

const KillDetailParticipantResponse = Schema.Struct({
  ...EventKillParticipantResponse.fields,
  member: KillDetailParticipantMemberResponse,
});

const KillDetailHeroNpcResponse = Schema.Struct({
  ...EventKillHeroNpcResponse.fields,
  event: Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    world: Schema.String,
  }),
});

export const KillDetailResponse = Schema.Struct({
  kill: Schema.Struct({
    id: Schema.String,
    heroNpcId: Schema.String,
    killedAt: isoDatetimeCodec,
    minSpawnTimeAtKill: isoDatetimeCodec,
    maxSpawnTimeAtKill: isoDatetimeCodec,
    timerCreatedById: Schema.NullOr(Schema.Number),
    isManualClose: Schema.Boolean,
    respawnDurationSeconds: Schema.NullOr(Schema.Number),
    windowDurationSeconds: Schema.NullOr(Schema.Number),
    resolvedAfterMaxSpawnTimeMs: Schema.NullOr(Schema.Number),
    heroNpc: KillDetailHeroNpcResponse,
    timerCreatedBy: Schema.NullOr(EventKillParticipantMemberResponse),
    points: Schema.Array(KillDetailParticipantResponse),
  }),
  eventConfig: Schema.Struct({
    scoringMode: Schema.Literals(EVENT_SCORING_MODES),
    scoringRules: Schema.NullOr(jsonValueSchema),
  }),
});

export const EventHeroStatsResponse = Schema.Struct({
  heroId: Schema.String,
  npcId: Schema.NullOr(Schema.Number),
  npcName: Schema.String,
  npcLvl: Schema.NullOr(Schema.Number),
  npcProf: Schema.NullOr(Schema.String),
  killCount: Schema.Number,
});
