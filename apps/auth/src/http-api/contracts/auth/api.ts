import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "effect/http-api";
import { ReauthenticationRequired } from "@lootlog/protocol/http/errors";
import { ServiceUnavailable, TooManyRequests, Unauthorized } from "./errors.js";
import {
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
) {}
