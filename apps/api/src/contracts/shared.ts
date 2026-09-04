import * as Schema from "effect/Schema";
import { FiniteNumber } from "./scalars.js";

export type StatusOk = typeof StatusOk.Type;

export const StatusOk = Schema.Struct({
  status: Schema.Literal("OK"),
}).annotate({ identifier: "StatusOkResponseDto_Output" });

export type OrganizationSummary = typeof OrganizationSummary.Type;

export const OrganizationSummary = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  icon: Schema.optionalKey(Schema.Union([Schema.String, Schema.Null])),
  vanityUrl: Schema.optionalKey(Schema.Union([Schema.String, Schema.Null])),
  ownerId: Schema.String,
  publicStatsCardEnabled: Schema.Boolean,
  reservationMaxDurationMinutes: FiniteNumber,
  reservationMinDurationMinutes: FiniteNumber,
  reservationTimeGranularityMinutes: FiniteNumber,
  reservationMaxAdvanceDays: FiniteNumber,
  reservationActiveLimitPerSpot: FiniteNumber,
}).annotate({ identifier: "GuildResponseDto_Output" });

export type SuccessResponse = typeof SuccessResponse.Type;

export const SuccessResponse = Schema.Struct({
  success: Schema.Boolean,
}).annotate({ identifier: "SuccessResponseDto_Output" });
