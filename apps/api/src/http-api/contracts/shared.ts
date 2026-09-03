/** HTTP contract definitions owned by the shared module. */
import * as Schema from "effect/Schema";
import { ForwardAuthIdentity } from "../runtime/forward-auth-identity.js";
import {
  HttpApiMiddleware,
  HttpApiSecurity,
  OpenApi,
} from "effect/unstable/httpapi";

export type StatusOkResponseDto_Output = { readonly status: "OK" };

export const StatusOkResponseDto_Output = Schema.Struct({
  status: Schema.Literal("OK"),
}).annotate({ identifier: "StatusOkResponseDto_Output" });

export type GuildResponseDto_Output = {
  readonly id: string;
  readonly name: string;
  readonly icon?: string | null;
  readonly vanityUrl?: string | null;
  readonly ownerId: string;
  readonly publicStatsCardEnabled: boolean;
  readonly reservationMaxDurationMinutes: number;
  readonly reservationMinDurationMinutes: number;
  readonly reservationTimeGranularityMinutes: number;
  readonly reservationMaxAdvanceDays: number;
  readonly reservationActiveLimitPerSpot: number;
};

export const GuildResponseDto_Output = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  icon: Schema.optionalKey(Schema.Union([Schema.String, Schema.Null])),
  vanityUrl: Schema.optionalKey(Schema.Union([Schema.String, Schema.Null])),
  ownerId: Schema.String,
  publicStatsCardEnabled: Schema.Boolean,
  reservationMaxDurationMinutes: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  reservationMinDurationMinutes: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  reservationTimeGranularityMinutes: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  reservationMaxAdvanceDays: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  reservationActiveLimitPerSpot: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
}).annotate({ identifier: "GuildResponseDto_Output" });

export type SuccessResponseDto_Output = { readonly success: boolean };

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
