import { Layer } from "effect";
import { HttpApiMiddleware, HttpApiSecurity, OpenApi } from "effect/http-api";

export const BearerSecurity = HttpApiSecurity.bearer.pipe(
  HttpApiSecurity.annotate(OpenApi.Format, "JWT"),
);

export class BearerSecurityMiddleware extends HttpApiMiddleware.Service<BearerSecurityMiddleware>()(
  "bearer security",
  { security: { bearer: BearerSecurity } },
) {}

export const BearerSecurityPassthrough = Layer.succeed(
  BearerSecurityMiddleware,
  BearerSecurityMiddleware.of({ bearer: (httpEffect) => httpEffect }),
);
