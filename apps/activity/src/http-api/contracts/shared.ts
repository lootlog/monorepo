/** Shared transport definitions for the activity HTTP contract. */
import {
  HttpApiMiddleware,
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
