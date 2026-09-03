/** Transport schemas owned by the auth HTTP module. */
import * as Schema from "effect/Schema";
import { FiniteNumber } from "../scalars.js";

export type AuthControllerVerifyHeaders =
  typeof AuthControllerVerifyHeaders.Type;

export const AuthControllerVerifyHeaders = Schema.Struct({
  "x-auth-user-id": Schema.optionalKey(Schema.String),
  "x-auth-discord-id": Schema.optionalKey(Schema.String),
  authorization: Schema.optionalKey(Schema.String),
  "x-lootlog-credential-purpose": Schema.optionalKey(
    Schema.Literal("websocket-ticket"),
  ),
  "x-lootlog-websocket-origin": Schema.optionalKey(Schema.String),
});

export type AuthControllerVerify200 = typeof AuthControllerVerify200.Type;

export const AuthControllerVerify200 = Schema.Struct({
  status: Schema.Literal("OK"),
});

export type AuthControllerIssueRealtimeTicket201 =
  typeof AuthControllerIssueRealtimeTicket201.Type;

export const AuthControllerIssueRealtimeTicket201 = Schema.Struct({
  ticket: Schema.String,
  expiresAt: FiniteNumber,
});

export type AuthControllerGetScopes200 = typeof AuthControllerGetScopes200.Type;

export const AuthControllerGetScopes200 = Schema.Array(Schema.String);

export type AuthControllerGetIdpTokenRequestJson =
  typeof AuthControllerGetIdpTokenRequestJson.Type;

export const AuthControllerGetIdpTokenRequestJson = Schema.Struct({
  userId: Schema.String,
  discordId: Schema.String,
});

export type AuthControllerGetIdpToken200 =
  typeof AuthControllerGetIdpToken200.Type;

export const AuthControllerGetIdpToken200 = Schema.Struct({
  accessToken: Schema.String,
  expiresIn: FiniteNumber,
  scopes: Schema.Array(Schema.String),
});
