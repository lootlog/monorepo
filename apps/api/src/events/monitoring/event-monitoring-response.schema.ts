import { IsoDateTime } from "@lootlog/schema/primitives";
import { Schema } from "effect";
import { MemberSummary } from "#src/contracts/shared";
import {
  flexibleIsoDatetimeCodec,
  nullableFlexibleIsoDatetimeCodec,
  nullableIsoDatetimeCodec,
} from "#src/shared/schema/response-codecs";

export const CoverageGapResponse = Schema.Struct({
  id: Schema.String,
  mapId: Schema.String,
  heroNpcId: Schema.String,
  gapType: Schema.Literals(["UNASSIGNED", "UNCOVERED"]),
  startedAt: IsoDateTime,
  endedAt: nullableIsoDatetimeCodec,
  durationSeconds: Schema.NullOr(Schema.Finite),
});

export const NullableCoverageGapResponse = Schema.NullOr(CoverageGapResponse);

export const HeroCoverageGapResponse = Schema.Struct({
  ...CoverageGapResponse.fields,
  map: Schema.Struct({ mapName: Schema.String, mapId: Schema.Finite }),
});

const KillTimelineAssignmentResponse = Schema.Struct({
  member: MemberSummary,
  assignedAt: flexibleIsoDatetimeCodec,
  unassignedAt: nullableFlexibleIsoDatetimeCodec,
});

const KillTimelineGapResponse = Schema.Struct({
  id: Schema.String,
  gapType: Schema.Literals(["UNASSIGNED", "UNCOVERED"]),
  startedAt: flexibleIsoDatetimeCodec,
  endedAt: nullableFlexibleIsoDatetimeCodec,
  durationSeconds: Schema.NullOr(Schema.Finite),
});

export const KillTimelineMapResponse = Schema.Struct({
  mapId: Schema.String,
  mapName: Schema.String,
  numericMapId: Schema.Finite,
  assignments: Schema.Array(KillTimelineAssignmentResponse),
  gaps: Schema.Array(KillTimelineGapResponse),
});

export const HeroPresenceStatsResponse = Schema.Struct({
  totalCoverageSeconds: Schema.Finite,
  totalEventSeconds: Schema.Finite,
  presencePercentage: Schema.Finite,
  memberStats: Schema.Array(
    Schema.Struct({
      member: MemberSummary,
      totalTimeSeconds: Schema.Finite,
      afkTimeSeconds: Schema.Finite,
      afkPercentage: Schema.Finite,
    }),
  ),
});

export const HeroRespawnConfigResponse = Schema.Struct({
  hasTimer: Schema.Boolean,
  windowStatus: Schema.Literals(["OPEN", "WAITING", "OVERDUE", "NONE"]),
  minSpawnTime: nullableIsoDatetimeCodec,
  maxSpawnTime: nullableIsoDatetimeCodec,
  overdueMs: Schema.NullOr(Schema.Finite),
});
