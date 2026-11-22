import * as Schema from "effect/Schema";
import { FiniteNumber } from "@lootlog/schema/http-scalars";
import {
  AUTH_DISCORD_ID_HEADER,
  AUTH_USER_ID_HEADER,
} from "@lootlog/schema/api-key-access";

export type AuthControllerVerifyHeaders =
  typeof AuthControllerVerifyHeaders.Type;

export const AuthControllerVerifyHeaders = Schema.Struct({
  [AUTH_USER_ID_HEADER]: Schema.optionalKey(Schema.String),
  [AUTH_DISCORD_ID_HEADER]: Schema.optionalKey(Schema.String),
  authorization: Schema.optionalKey(Schema.String),
});

export type AuthControllerVerify200 = typeof AuthControllerVerify200.Type;

export const AuthControllerVerify200 = Schema.Struct({
  status: Schema.Literal("OK"),
});

export type AuthControllerGetScopes200 = typeof AuthControllerGetScopes200.Type;

export const AuthControllerGetScopes200 = Schema.Array(Schema.String);

export type AuthControllerGetIdpTokenRequestJson =
  typeof AuthControllerGetIdpTokenRequestJson.Type;

const NonEmptyTrimmedString = Schema.Trim.check(Schema.isMinLength(1));

export const AuthControllerGetIdpTokenRequestJson = Schema.Struct({
  userId: NonEmptyTrimmedString,
  discordId: NonEmptyTrimmedString,
});

export type AuthControllerGetIdpToken200 =
  typeof AuthControllerGetIdpToken200.Type;

export const AuthControllerGetIdpToken200 = Schema.Struct({
  accessToken: Schema.String,
  expiresIn: FiniteNumber,
  scopes: Schema.Array(Schema.String),
});
