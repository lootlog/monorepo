/** HTTP contract definitions owned by the shared module. */
import * as Schema from "effect/Schema";
import { ForwardAuthIdentity } from "../runtime/forward-auth-identity.js";
import {
  HttpApiMiddleware,
  HttpApiSecurity,
  OpenApi,
} from "effect/unstable/httpapi";
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

export const BearerSecurity = HttpApiSecurity.bearer.pipe(
  HttpApiSecurity.annotate(OpenApi.Format, "JWT"),
);

export class BearerSecurityMiddleware extends HttpApiMiddleware.Service<
  BearerSecurityMiddleware,
  { provides: ForwardAuthIdentity }
>()("bearer security", { security: { bearer: BearerSecurity } }) {}
