/** Transport schemas owned by the auth HTTP module. */
import * as Schema from "effect/Schema";

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
