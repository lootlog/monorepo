import * as Schema from "effect/Schema";
import { FiniteNumber } from "./scalars.js";

export type StatusOkResponseDto_Output = typeof StatusOkResponseDto_Output.Type;

export const StatusOkResponseDto_Output = Schema.Struct({
  status: Schema.Literal("OK"),
}).annotate({ identifier: "StatusOkResponseDto_Output" });

export type GuildResponseDto_Output = typeof GuildResponseDto_Output.Type;

export const GuildResponseDto_Output = Schema.Struct({
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

export type SuccessResponseDto_Output = typeof SuccessResponseDto_Output.Type;

export const SuccessResponseDto_Output = Schema.Struct({
  success: Schema.Boolean,
}).annotate({ identifier: "SuccessResponseDto_Output" });
