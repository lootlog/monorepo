import {
  FiniteNumber,
  JsonValue,
  NonNegativeSafeInteger,
  PositiveSafeInteger,
} from "@lootlog/schema/http-scalars";
import { IsoDateTime } from "@lootlog/schema/primitives";
import { Schema } from "effect";

export const KillHistoryQuery = Schema.Struct({
  limit: Schema.optionalKey(
    Schema.String.check(Schema.isPattern(/^(?:[1-9]\d?|100)$/u)).annotate({
      description: "Page size from 1 to 100. Defaults to 20.",
    }),
  ),
  cursor: Schema.optionalKey(
    Schema.String.check(
      Schema.isMinLength(1),
      Schema.isMaxLength(4096),
    ).annotate({
      description:
        "Opaque continuation token returned by this endpoint. Keep the Organization, event and filters unchanged.",
    }),
  ),
  heroId: Schema.optionalKey(Schema.String.check(Schema.isMinLength(1))),
  memberId: Schema.optionalKey(
    Schema.String.check(Schema.isPattern(/^[1-9]\d*$/u)),
  ),
}).annotate({ identifier: "KillHistoryQuery" });

export const KillHistoryMemberPoint = Schema.Struct({
  points: FiniteNumber,
  basePoints: FiniteNumber,
  manualAdjustmentPoints: Schema.NullOr(FiniteNumber),
  bonusBreakdown: JsonValue.annotate({
    identifier: "KillHistoryBonusBreakdown",
  }),
  trackingDurationSeconds: Schema.NullOr(FiniteNumber),
  trackingDurationPercentage: Schema.NullOr(FiniteNumber),
}).annotate({ identifier: "KillHistoryMemberPoint" });

export const KillHistoryEntry = Schema.Struct({
  id: Schema.String,
  heroNpcId: Schema.String,
  killedAt: IsoDateTime,
  minSpawnTimeAtKill: IsoDateTime,
  maxSpawnTimeAtKill: IsoDateTime,
  isManualClose: Schema.Boolean,
  heroNpc: Schema.Struct({
    id: Schema.String,
    npcId: Schema.NullOr(FiniteNumber),
    npcName: Schema.String,
    npcIcon: Schema.NullOr(Schema.String),
    npcLvl: Schema.NullOr(FiniteNumber),
  }),
  participantCount: NonNegativeSafeInteger.annotate({
    description:
      "Number of recorded participants with a point record, including participants marked absent.",
  }),
}).annotate({ identifier: "KillHistoryEntry" });

export const KillHistoryEventResponse = Schema.Struct({
  kind: Schema.Literal("event"),
  data: Schema.Array(KillHistoryEntry),
  nextCursor: Schema.NullOr(Schema.String),
}).annotate({ identifier: "KillHistoryEventResponse" });

export const KillHistoryMemberResponse = Schema.Struct({
  kind: Schema.Literal("member"),
  member: Schema.Struct({
    id: PositiveSafeInteger,
    name: Schema.String,
    avatar: Schema.NullOr(Schema.String),
    userId: Schema.String,
  }),
  data: Schema.Array(
    Schema.Struct({
      ...KillHistoryEntry.fields,
      memberPoint: KillHistoryMemberPoint,
    }).annotate({ identifier: "KillHistoryMemberEntry" }),
  ),
  nextCursor: Schema.NullOr(Schema.String),
}).annotate({ identifier: "KillHistoryMemberResponse" });

export const KillHistoryResponse = Schema.Union([
  KillHistoryEventResponse,
  KillHistoryMemberResponse,
]).annotate({ identifier: "KillHistoryResponse" });
