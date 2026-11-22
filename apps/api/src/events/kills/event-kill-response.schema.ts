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
  npcId: Schema.NullOr(Schema.Finite),
  npcName: Schema.String,
  npcIcon: Schema.NullOr(Schema.String),
  npcLvl: Schema.NullOr(Schema.Finite),
});

const EventKillParticipantRoleResponse = Schema.Struct({
  position: Schema.NullOr(Schema.Finite),
  color: Schema.NullOr(Schema.Finite),
});

const EventKillParticipantMapDataResponse = Schema.Struct({
  mapId: Schema.String,
  mapName: Schema.String,
  assignedAt: flexibleIsoDatetimeCodec,
  unassignedAt: nullableFlexibleIsoDatetimeCodec,
  assignmentDurationSeconds: Schema.Finite,
  presenceTimeSeconds: Schema.Finite,
  afkTimeSeconds: Schema.Finite,
});

const EventKillParticipantResponse = Schema.Struct({
  id: Schema.String,
  memberId: Schema.Finite,
  points: Schema.Finite,
  basePoints: Schema.Finite,
  manualAdjustmentPoints: Schema.optionalKey(Schema.NullOr(Schema.Finite)),
  trackingDurationSeconds: Schema.NullOr(Schema.Finite),
  trackingDurationPercentage: Schema.NullOr(Schema.Finite),
  timeOnMapSeconds: Schema.Finite,
  afkPercentage: Schema.Finite,
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
    timerCreatedById: Schema.NullOr(Schema.Finite),
    isManualClose: Schema.Boolean,
    respawnDurationSeconds: Schema.NullOr(Schema.Finite),
    windowDurationSeconds: Schema.NullOr(Schema.Finite),
    resolvedAfterMaxSpawnTimeMs: Schema.NullOr(Schema.Finite),
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
  npcId: Schema.NullOr(Schema.Finite),
  npcName: Schema.String,
  npcLvl: Schema.NullOr(Schema.Finite),
  npcProf: Schema.NullOr(Schema.String),
  killCount: Schema.Finite,
});
