import {
  ApiKeyStatusRequest,
  ApiKeyStatusResponse,
} from "@lootlog/schema/api-key-access";
import { FiniteNumber } from "@lootlog/schema/http-scalars";
import {
  PlatformRole,
  PlatformRoleHolders,
} from "@lootlog/schema/platform-roles";
import { Schema } from "effect";
import { Rpc, RpcGroup } from "effect/rpc";
import { CallerAuth, RpcCallers } from "./callers.js";
import {
  RpcBadRequestError,
  RpcUnauthorizedError,
  RpcUnavailableError,
} from "./errors.js";

const NonEmptyTrimmedString = Schema.Trim.check(Schema.isMinLength(1));

export const AuthIdpTokenResult = Schema.Struct({
  accessToken: Schema.String,
  expiresIn: FiniteNumber,
  scopes: Schema.Array(Schema.String),
});

export type AuthIdpTokenResult = typeof AuthIdpTokenResult.Type;

export class AuthRpcGroup extends RpcGroup.make(
  Rpc.make("getIdpToken", {
    payload: {
      userId: NonEmptyTrimmedString,
      discordId: NonEmptyTrimmedString,
    },
    success: AuthIdpTokenResult,
    error: Schema.Union([
      RpcBadRequestError,
      RpcUnauthorizedError,
      RpcUnavailableError,
    ]),
  }).annotate(RpcCallers, ["api"]),
  Rpc.make("listPlatformRoleHolders", {
    payload: {
      role: PlatformRole,
    },
    success: PlatformRoleHolders,
    error: Schema.Union([RpcBadRequestError, RpcUnavailableError]),
  }).annotate(RpcCallers, ["api"]),
  Rpc.make("getApiKeyStatuses", {
    payload: ApiKeyStatusRequest,
    success: ApiKeyStatusResponse,
    error: RpcUnavailableError,
  }).annotate(RpcCallers, ["gateway"]),
).middleware(CallerAuth) {}
