import { Schema } from "effect";
import { JsonValue } from "@lootlog/schema/http-scalars";
import { ForwardAuthIdentity } from "#src/runtime/auth/forward-auth-identity";
import {
  HttpApiMiddleware,
  HttpApiSecurity,
  OpenApi,
} from "effect/unstable/httpapi";

export const BearerSecurity = HttpApiSecurity.bearer.pipe(
  HttpApiSecurity.annotate(OpenApi.Format, "JWT"),
);

export class BearerSecurityMiddleware extends HttpApiMiddleware.Service<
  BearerSecurityMiddleware,
  { provides: ForwardAuthIdentity }
>()("bearer security", { security: { bearer: BearerSecurity } }) {}

export const OrganizationWorkspaceErrorResponse = Schema.StructWithRest(
  Schema.Struct({ code: Schema.String }),
  [Schema.Record(Schema.String, JsonValue)],
).annotate({ identifier: "OrganizationWorkspaceErrorResponse" });

export const HttpErrorResponse = Schema.StructWithRest(
  Schema.Struct({
    code: Schema.optionalKey(Schema.String),
    message: Schema.optionalKey(JsonValue),
  }),
  [Schema.Record(Schema.String, JsonValue)],
).annotate({ identifier: "HttpErrorResponse" });
