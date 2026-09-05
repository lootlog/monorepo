/** Shared transport definitions for the activity HTTP contract. */
import { Schema } from "effect";
import {
  HttpApiMiddleware,
  HttpApiSchema,
  HttpApiSecurity,
  OpenApi,
} from "effect/unstable/httpapi";

export const BearerSecurity = HttpApiSecurity.bearer.pipe(
  HttpApiSecurity.annotate(OpenApi.Format, "JWT"),
);

export class BearerSecurityMiddleware extends HttpApiMiddleware.Service<BearerSecurityMiddleware>()(
  "bearer security",
  { security: { bearer: BearerSecurity } },
) {}

export const AuthorizationUnavailable = Schema.Struct({
  message: Schema.String,
  statusCode: Schema.Literal(503),
}).pipe(HttpApiSchema.status(503));
