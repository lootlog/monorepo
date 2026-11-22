import * as Schema from "effect/Schema";
import {
  FiniteNumber,
  PositiveSafeInteger,
} from "@lootlog/schema/http-scalars";
import { NpcTypeSchema } from "@lootlog/schema/npc-type";

export type StatusOk = typeof StatusOk.Type;

export const StatusOk = Schema.Struct({
  status: Schema.Literal("OK"),
}).annotate({ identifier: "StatusOkResponseDto_Output" });

export const organizationSummaryFields = {
  id: Schema.String,
  name: Schema.String,
  icon: Schema.optionalKey(Schema.Union([Schema.String, Schema.Null])),
  vanityUrl: Schema.optionalKey(Schema.Union([Schema.String, Schema.Null])),
  ownerId: Schema.String,
  publicStatsCardEnabled: Schema.Boolean,
};

export type OrganizationSummary = typeof OrganizationSummary.Type;

export const OrganizationSummary = Schema.Struct({
  ...organizationSummaryFields,
  banner: Schema.optionalKey(Schema.Union([Schema.String, Schema.Null])),
  reservationMaxDurationMinutes: FiniteNumber,
  reservationMinDurationMinutes: FiniteNumber,
  reservationTimeGranularityMinutes: FiniteNumber,
  reservationMaxAdvanceDays: FiniteNumber,
  reservationActiveLimitPerSpot: FiniteNumber,
  lootDrawExcludedNpcTypes: Schema.Array(NpcTypeSchema),
}).annotate({ identifier: "GuildResponseDto_Output" });

export type SuccessResponse = typeof SuccessResponse.Type;

export const SuccessResponse = Schema.Struct({
  success: Schema.Boolean,
}).annotate({ identifier: "SuccessResponseDto_Output" });

export const MemberSummary = Schema.Struct({
  id: FiniteNumber,
  name: Schema.String,
  avatar: Schema.NullOr(Schema.String),
  userId: Schema.String,
}).annotate({ identifier: "MemberSummary" });

export type MemberSummary = typeof MemberSummary.Type;

const MAX_MEMBER_ID = 2_147_483_647;

export const MemberIdParam = PositiveSafeInteger.check(
  Schema.isLessThanOrEqualTo(MAX_MEMBER_ID).annotate({
    expected: `a value less than or equal to ${MAX_MEMBER_ID}`,
  }),
);
