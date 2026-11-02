import { IsoDateTime } from "@lootlog/schema/primitives";
import { EVENT_SCORING_MODES } from "@lootlog/domain/scoring";
import { Schema } from "effect";
import { MemberSummary } from "#src/contracts/shared";
import {
  flexibleIsoDatetimeCodec,
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

const EventKillParticipantResponse = Schema.Struct({
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
  member: MemberSummary,
  mapData: Schema.optionalKey(
    Schema.Array(EventKillParticipantMapDataResponse),
  ),
});

const KillDetailParticipantMemberResponse = Schema.Struct({
  ...MemberSummary.fields,
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
    killedAt: IsoDateTime,
    minSpawnTimeAtKill: IsoDateTime,
    maxSpawnTimeAtKill: IsoDateTime,
    timerCreatedById: Schema.NullOr(Schema.Number),
    isManualClose: Schema.Boolean,
    respawnDurationSeconds: Schema.NullOr(Schema.Number),
    windowDurationSeconds: Schema.NullOr(Schema.Number),
    resolvedAfterMaxSpawnTimeMs: Schema.NullOr(Schema.Number),
    heroNpc: KillDetailHeroNpcResponse,
    timerCreatedBy: Schema.NullOr(MemberSummary),
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
