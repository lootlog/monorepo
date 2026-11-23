import {
  AdminAuditPage,
  AdminAuditPageRequest,
  AdminOperator,
  AdminOverview,
  AdminUser,
  AdminUserBan,
  AdminUserDetails,
  AdminUsersPage,
  AdminUsersSearch,
} from "@lootlog/schema/admin";
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
  RpcForbiddenError,
  RpcNotFoundError,
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

const OperatorSession = {
  sessionCookie: Schema.RedactedFromValue(Schema.String),
};

const OperatorOnUser = {
  ...OperatorSession,
  userId: NonEmptyTrimmedString,
};

const OperatorError = Schema.Union([
  RpcBadRequestError,
  RpcUnauthorizedError,
  RpcForbiddenError,
  RpcUnavailableError,
]);

const OperatorOnUserError = Schema.Union([
  RpcBadRequestError,
  RpcUnauthorizedError,
  RpcForbiddenError,
  RpcNotFoundError,
  RpcUnavailableError,
]);

const ChangedUser = Schema.Struct({ user: AdminUser });

export class AuthOperatorRpcGroup extends RpcGroup.make(
  Rpc.make("getOperator", {
    payload: OperatorSession,
    success: AdminOperator,
    error: OperatorError,
  }).annotate(RpcCallers, ["admin"]),
  Rpc.make("getUsersOverview", {
    payload: OperatorSession,
    success: AdminOverview,
    error: OperatorError,
  }).annotate(RpcCallers, ["admin"]),
  Rpc.make("searchUsers", {
    payload: { ...OperatorSession, ...AdminUsersSearch.fields },
    success: AdminUsersPage,
    error: OperatorError,
  }).annotate(RpcCallers, ["admin"]),
  Rpc.make("getUserDetails", {
    payload: OperatorOnUser,
    success: AdminUserDetails,
    error: OperatorOnUserError,
  }).annotate(RpcCallers, ["admin"]),
  Rpc.make("setUserRoles", {
    payload: { ...OperatorOnUser, roles: Schema.Array(PlatformRole) },
    success: ChangedUser,
    error: OperatorOnUserError,
  }).annotate(RpcCallers, ["admin"]),
  Rpc.make("banUser", {
    payload: { ...OperatorOnUser, ...AdminUserBan.fields },
    success: ChangedUser,
    error: OperatorOnUserError,
  }).annotate(RpcCallers, ["admin"]),
  Rpc.make("unbanUser", {
    payload: OperatorOnUser,
    success: ChangedUser,
    error: OperatorOnUserError,
  }).annotate(RpcCallers, ["admin"]),
  Rpc.make("revokeUserSessions", {
    payload: OperatorOnUser,
    error: OperatorOnUserError,
  }).annotate(RpcCallers, ["admin"]),
  Rpc.make("revokeUserSession", {
    payload: { ...OperatorOnUser, sessionId: NonEmptyTrimmedString },
    error: OperatorOnUserError,
  }).annotate(RpcCallers, ["admin"]),
  Rpc.make("revokeUserApiKey", {
    payload: { ...OperatorOnUser, keyId: NonEmptyTrimmedString },
    error: OperatorOnUserError,
  }).annotate(RpcCallers, ["admin"]),
  Rpc.make("listAuditLog", {
    payload: { ...OperatorSession, ...AdminAuditPageRequest.fields },
    success: AdminAuditPage,
    error: OperatorError,
  }).annotate(RpcCallers, ["admin"]),
).middleware(CallerAuth) {}

export const AuthServedRpcGroup = AuthRpcGroup.merge(AuthOperatorRpcGroup);
