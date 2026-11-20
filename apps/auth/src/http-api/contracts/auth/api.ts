import { Schema } from "effect";
/** Endpoints owned by the auth HTTP module. */
import {
  HttpApi,
  HttpApiEndpoint,
  HttpApiGroup,
  OpenApi,
} from "effect/http-api";
import { ReauthenticationRequired } from "@lootlog/protocol/http/errors";
import {
  BadRequest,
  ServiceUnavailable,
  TooManyRequests,
  Unauthorized,
} from "./errors.js";
import {
  AuthControllerGetIdpToken200,
  AuthControllerGetIdpTokenRequestJson,
  AuthControllerGetScopes200,
  AuthControllerVerify200,
  AuthControllerVerifyHeaders,
} from "./schemas.js";

export class AuthGroup extends HttpApiGroup.make("auth").add(
  HttpApiEndpoint.get("AuthControllerVerify", "/auth/verify", {
    headers: AuthControllerVerifyHeaders,
    error: [Unauthorized, TooManyRequests, ServiceUnavailable],
    success: AuthControllerVerify200,
  })
    .annotate(OpenApi.Identifier, "AuthController_verify")
    .annotate(OpenApi.Summary, "Verify request identity"),
  HttpApiEndpoint.get("AuthControllerGetScopes", "/auth/@me/scopes", {
    error: [Unauthorized, ReauthenticationRequired],
    success: AuthControllerGetScopes200,
  })
    .annotate(OpenApi.Identifier, "AuthController_getScopes")
    .annotate(OpenApi.Summary, "Get scopes for the current user"),
  HttpApiEndpoint.post("AuthControllerGetIdpToken", "/auth/idp-token", {
    headers: Schema.Struct({ authorization: Schema.optional(Schema.String) }),
    error: [BadRequest, Unauthorized],
    payload: AuthControllerGetIdpTokenRequestJson,
    success: AuthControllerGetIdpToken200,
  })
    .annotate(HttpApi.PayloadParseOptions, { onExcessProperty: "error" })
    .annotate(OpenApi.Identifier, "AuthController_getIdpToken")
    .annotate(OpenApi.Summary, "Issue an IDP token for a user account")
    .annotate(
      OpenApi.Description,
      "Internal API caller only. Requires the AUTH_IDP_TOKEN_SECRET bearer credential; user sessions and forwarded identity headers do not authorize this operation.",
    ),
) {}
