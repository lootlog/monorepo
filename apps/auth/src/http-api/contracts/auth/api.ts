import { Schema } from "effect";
/** Endpoints owned by the auth HTTP module. */
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/unstable/httpapi";
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
    error: [401, 429, 503].map((status) =>
      Schema.Struct({ message: Schema.String }).pipe(
        HttpApiSchema.status(status),
      ),
    ),
    success: AuthControllerVerify200,
  })
    .annotate(OpenApi.Identifier, "AuthController_verify")
    .annotate(OpenApi.Summary, "Verify request identity"),
  HttpApiEndpoint.get("AuthControllerGetScopes", "/auth/@me/scopes", {
    success: AuthControllerGetScopes200,
  })
    .annotate(OpenApi.Identifier, "AuthController_getScopes")
    .annotate(OpenApi.Summary, "Get scopes for the current user"),
  HttpApiEndpoint.post("AuthControllerGetIdpToken", "/auth/idp-token", {
    payload: AuthControllerGetIdpTokenRequestJson,
    success: AuthControllerGetIdpToken200,
  })
    .annotate(OpenApi.Identifier, "AuthController_getIdpToken")
    .annotate(OpenApi.Summary, "Issue an IDP token for a user account"),
) {}
