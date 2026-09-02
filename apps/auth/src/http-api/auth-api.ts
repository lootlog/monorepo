import * as Schema from "effect/Schema";
import {
  HttpApi,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/unstable/httpapi";
// schemas
export type AuthControllerVerifyParams = {
  readonly "x-auth-user-id"?: string;
  readonly "x-auth-discord-id"?: string;
  readonly authorization?: string;
  readonly "x-lootlog-credential-purpose"?: "websocket-ticket";
  readonly "x-lootlog-websocket-origin"?: string;
};
export const AuthControllerVerifyParams = Schema.Struct({
  "x-auth-user-id": Schema.optionalKey(Schema.String),
  "x-auth-discord-id": Schema.optionalKey(Schema.String),
  authorization: Schema.optionalKey(Schema.String),
  "x-lootlog-credential-purpose": Schema.optionalKey(
    Schema.Literal("websocket-ticket"),
  ),
  "x-lootlog-websocket-origin": Schema.optionalKey(Schema.String),
});
export type AuthControllerVerifyHeaders = {
  readonly "x-auth-user-id"?: string;
  readonly "x-auth-discord-id"?: string;
  readonly authorization?: string;
  readonly "x-lootlog-credential-purpose"?: "websocket-ticket";
  readonly "x-lootlog-websocket-origin"?: string;
};
export const AuthControllerVerifyHeaders = Schema.Struct({
  "x-auth-user-id": Schema.optionalKey(Schema.String),
  "x-auth-discord-id": Schema.optionalKey(Schema.String),
  authorization: Schema.optionalKey(Schema.String),
  "x-lootlog-credential-purpose": Schema.optionalKey(
    Schema.Literal("websocket-ticket"),
  ),
  "x-lootlog-websocket-origin": Schema.optionalKey(Schema.String),
});
export type AuthControllerVerify200 = { readonly status: "OK" };
export const AuthControllerVerify200 = Schema.Struct({
  status: Schema.Literal("OK"),
});
export type AuthControllerIssueRealtimeTicket201 = {
  readonly ticket: string;
  readonly expiresAt: number;
};
export const AuthControllerIssueRealtimeTicket201 = Schema.Struct({
  ticket: Schema.String,
  expiresAt: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
});
export type AuthControllerGetScopes200 = ReadonlyArray<string>;
export const AuthControllerGetScopes200 = Schema.Array(Schema.String);
export type AuthControllerGetIdpTokenRequestJson = {
  readonly userId: string;
  readonly discordId: string;
};
export const AuthControllerGetIdpTokenRequestJson = Schema.Struct({
  userId: Schema.String,
  discordId: Schema.String,
});
export type AuthControllerGetIdpToken200 = {
  readonly accessToken: string;
  readonly expiresIn: number;
  readonly scopes: ReadonlyArray<string>;
};
export const AuthControllerGetIdpToken200 = Schema.Struct({
  accessToken: Schema.String,
  expiresIn: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  scopes: Schema.Array(Schema.String),
});

class HealthGroup extends HttpApiGroup.make("health").add(
  HttpApiEndpoint.get("HealthzControllerHealthCheck", "/healthz", {
    success: HttpApiSchema.Empty(200),
  })
    .annotate(OpenApi.Identifier, "HealthzController_healthCheck")
    .annotate(OpenApi.Summary, "Health check"),
) {}

class AuthGroup extends HttpApiGroup.make("auth").add(
  HttpApiEndpoint.get("AuthControllerVerify", "/auth/verify", {
    headers: AuthControllerVerifyHeaders,
    success: AuthControllerVerify200,
  })
    .annotate(OpenApi.Identifier, "AuthController_verify")
    .annotate(OpenApi.Summary, "Verify request identity"),
  HttpApiEndpoint.post(
    "AuthControllerIssueRealtimeTicket",
    "/auth/realtime-ticket",
    {
      success: AuthControllerIssueRealtimeTicket201.pipe(
        HttpApiSchema.status(201),
      ),
    },
  )
    .annotate(OpenApi.Identifier, "AuthController_issueRealtimeTicket")
    .annotate(OpenApi.Summary, "Issue a single-use realtime ticket"),
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

export class AuthApi extends HttpApi.make("AuthApi")
  .annotate(OpenApi.Title, "Auth API")
  .annotate(OpenApi.Version, "1.0")
  .annotate(
    OpenApi.Description,
    "Authentication and identity service documentation",
  )
  .annotate(OpenApi.Servers, [])
  .add(HealthGroup, AuthGroup) {}
