import { Layer } from "effect";
import { HttpApiMiddleware, HttpApiSecurity, OpenApi } from "effect/http-api";

/** The OpenAPI scheme of routes the edge authenticates before forwarding them. */
export const BearerSecurity = HttpApiSecurity.bearer.pipe(
  HttpApiSecurity.annotate(OpenApi.Format, "JWT"),
);

/** Documents forward authentication on routes whose handlers read the identity themselves. */
export class BearerSecurityMiddleware extends HttpApiMiddleware.Service<BearerSecurityMiddleware>()(
  "bearer security",
  { security: { bearer: BearerSecurity } },
) {}

/** The edge already verified the credential; the service only reads its identity headers. */
export const BearerSecurityPassthrough = Layer.succeed(
  BearerSecurityMiddleware,
  BearerSecurityMiddleware.of({ bearer: (httpEffect) => httpEffect }),
);
