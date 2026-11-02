import {
  FiniteNumber,
  JsonValue,
  NonNegativeSafeInteger,
  Page,
  PageCursor,
  PageSize,
  PositiveSafeInteger,
} from "@lootlog/schema/http-scalars";
import { IsoDateTime } from "@lootlog/schema/primitives";
import { Schema } from "effect";
import { MemberIdParam, MemberSummary } from "#src/contracts/shared";
import { DEFAULT_PAGE_SIZE } from "#src/shared/keyset-page";

export const KillHistoryQuery = Schema.Struct({
  limit: Schema.optionalKey(PageSize.annotate({ default: DEFAULT_PAGE_SIZE })),
  cursor: Schema.optionalKey(
    PageCursor.annotate({
      description:
        "Opaque continuation token returned by this endpoint. Keep the Organization, event and filters unchanged.",
    }),
  ),
  heroId: Schema.optionalKey(Schema.String.check(Schema.isMinLength(1))),
  memberId: Schema.optionalKey(MemberIdParam),
}).annotate({ identifier: "KillHistoryQuery" });

export type KillHistoryQuery = typeof KillHistoryQuery.Type;

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
  killNumber: PositiveSafeInteger.annotate({
    description:
      "One-based position of this kill among all recorded kills of its hero in the event, ordered by kill time and ID. Manual window closes are counted; the hero and member filters do not change it.",
  }),
}).annotate({ identifier: "KillHistoryEntry" });

export const KillHistoryEventResponse = Schema.Struct({
  kind: Schema.Literal("event"),
  ...Page(KillHistoryEntry).fields,
}).annotate({ identifier: "KillHistoryEventResponse" });

export const KillHistoryMemberResponse = Schema.Struct({
  kind: Schema.Literal("member"),
  member: MemberSummary,
  ...Page(
    Schema.Struct({
      ...KillHistoryEntry.fields,
      memberPoint: KillHistoryMemberPoint,
    }).annotate({ identifier: "KillHistoryMemberEntry" }),
  ).fields,
}).annotate({ identifier: "KillHistoryMemberResponse" });

export const KillHistoryResponse = Schema.Union([
  KillHistoryEventResponse,
  KillHistoryMemberResponse,
]).annotate({ identifier: "KillHistoryResponse" });
