import { Schema } from "effect";
import {
  flexibleIsoDatetimeCodec,
  isoDatetimeCodec,
  nullableFlexibleIsoDatetimeCodec,
  nullableIsoDatetimeCodec,
} from "#src/shared/schema/response-codecs";

export const CoverageGapResponse = Schema.Struct({
  id: Schema.String,
  mapId: Schema.String,
  heroNpcId: Schema.String,
  gapType: Schema.Literals(["UNASSIGNED", "UNCOVERED"]),
  startedAt: isoDatetimeCodec,
  endedAt: nullableIsoDatetimeCodec,
  durationSeconds: Schema.NullOr(Schema.Number),
});

export const NullableCoverageGapResponse = Schema.NullOr(CoverageGapResponse);

export const HeroCoverageGapResponse = Schema.Struct({
  ...CoverageGapResponse.fields,
  map: Schema.Struct({ mapName: Schema.String, mapId: Schema.Number }),
});

const KillTimelineAssignmentResponse = Schema.Struct({
  memberId: Schema.Number,
  memberName: Schema.String,
  memberAvatar: Schema.NullOr(Schema.String),
  memberUserId: Schema.String,
  assignedAt: flexibleIsoDatetimeCodec,
  unassignedAt: nullableFlexibleIsoDatetimeCodec,
});

const KillTimelineGapResponse = Schema.Struct({
  id: Schema.String,
  gapType: Schema.Literals(["UNASSIGNED", "UNCOVERED"]),
  startedAt: flexibleIsoDatetimeCodec,
  endedAt: nullableFlexibleIsoDatetimeCodec,
  durationSeconds: Schema.NullOr(Schema.Number),
});

export const KillTimelineMapResponse = Schema.Struct({
  mapId: Schema.String,
  mapName: Schema.String,
  numericMapId: Schema.Number,
  assignments: Schema.Array(KillTimelineAssignmentResponse),
  gaps: Schema.Array(KillTimelineGapResponse),
});

export const HeroPresenceStatsResponse = Schema.Struct({
  totalCoverageSeconds: Schema.Number,
  totalEventSeconds: Schema.Number,
  presencePercentage: Schema.Number,
  memberStats: Schema.Array(
    Schema.Struct({
      memberId: Schema.Number,
      memberName: Schema.String,
      memberAvatar: Schema.NullOr(Schema.String),
      totalTimeSeconds: Schema.Number,
      afkTimeSeconds: Schema.Number,
      afkPercentage: Schema.Number,
    }),
  ),
});

export const HeroRespawnConfigResponse = Schema.Struct({
  hasTimer: Schema.Boolean,
  windowStatus: Schema.Literals(["OPEN", "WAITING", "OVERDUE", "NONE"]),
  minSpawnTime: nullableIsoDatetimeCodec,
  maxSpawnTime: nullableIsoDatetimeCodec,
  overdueMs: Schema.NullOr(Schema.Number),
});
