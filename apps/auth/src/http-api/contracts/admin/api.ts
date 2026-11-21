/**
 * The admin API. Its only caller is the admin panel, which presents the
 * `ADMIN_API_SECRET` bearer credential together with the session cookie of
 * its operator, who must be listed in `ADMIN_ACCOUNT_IDS`. Neither one alone
 * authorizes these operations, and the edge does not route them.
 */
import { Schema } from "effect";
import {
  HttpApi,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";
import {
  BadRequest,
  Forbidden,
  NotFound,
  ServiceUnavailable,
  Unauthorized,
} from "../auth/errors.js";
import {
  AdminAuditQuery,
  AdminAuditResponse,
  AdminHeaders,
  AdminOperator,
  AdminOverview,
  AdminUserDetails,
  AdminUserParams,
  AdminUserResponse,
  AdminUsersQuery,
  AdminUsersResponse,
  BanAdminUser,
  SetAdminUserRoles,
} from "./schemas.js";

const error = [BadRequest, Unauthorized, Forbidden, ServiceUnavailable];

const userError = [...error, NotFound];

const headers = AdminHeaders;

export class AdminGroup extends HttpApiGroup.make("admin")
  .add(
    HttpApiEndpoint.get("AdminSession", "/admin/session", {
      headers,
      error,
      success: AdminOperator,
    }).annotate(OpenApi.Identifier, "AdminController_session"),
    HttpApiEndpoint.get("AdminOverview", "/admin/overview", {
      headers,
      error,
      success: AdminOverview,
    }).annotate(OpenApi.Identifier, "AdminController_overview"),
    HttpApiEndpoint.get("AdminListUsers", "/admin/users", {
      headers,
      query: AdminUsersQuery,
      error,
      success: AdminUsersResponse,
    }).annotate(OpenApi.Identifier, "AdminController_listUsers"),
    HttpApiEndpoint.get("AdminGetUser", "/admin/users/:id", {
      headers,
      params: AdminUserParams,
      error: userError,
      success: AdminUserDetails,
    }).annotate(OpenApi.Identifier, "AdminController_getUser"),
    HttpApiEndpoint.put("AdminSetUserRoles", "/admin/users/:id/roles", {
      headers,
      params: AdminUserParams,
      payload: SetAdminUserRoles,
      error: userError,
      success: AdminUserResponse,
    }).annotate(OpenApi.Identifier, "AdminController_setUserRoles"),
    HttpApiEndpoint.put("AdminBanUser", "/admin/users/:id/ban", {
      headers,
      params: AdminUserParams,
      payload: BanAdminUser,
      error: userError,
      success: AdminUserResponse,
    }).annotate(OpenApi.Identifier, "AdminController_banUser"),
    HttpApiEndpoint.delete("AdminUnbanUser", "/admin/users/:id/ban", {
      headers,
      params: AdminUserParams,
      error: userError,
      success: AdminUserResponse,
    }).annotate(OpenApi.Identifier, "AdminController_unbanUser"),
    HttpApiEndpoint.delete(
      "AdminRevokeUserSessions",
      "/admin/users/:id/sessions",
      {
        headers,
        params: AdminUserParams,
        error: userError,
        success: HttpApiSchema.Empty(204),
      },
    ).annotate(OpenApi.Identifier, "AdminController_revokeUserSessions"),
    HttpApiEndpoint.delete(
      "AdminRevokeUserSession",
      "/admin/users/:id/sessions/:sessionId",
      {
        headers,
        params: Schema.Struct({
          ...AdminUserParams.fields,
          sessionId: Schema.NonEmptyString,
        }),
        error: userError,
        success: HttpApiSchema.Empty(204),
      },
    ).annotate(OpenApi.Identifier, "AdminController_revokeUserSession"),
    HttpApiEndpoint.delete(
      "AdminRevokeUserApiKey",
      "/admin/users/:id/api-keys/:keyId",
      {
        headers,
        params: Schema.Struct({
          ...AdminUserParams.fields,
          keyId: Schema.NonEmptyString,
        }),
        error: userError,
        success: HttpApiSchema.Empty(204),
      },
    ).annotate(OpenApi.Identifier, "AdminController_revokeUserApiKey"),
    HttpApiEndpoint.get("AdminListAudit", "/admin/audit", {
      headers,
      query: AdminAuditQuery,
      error,
      success: AdminAuditResponse,
    }).annotate(OpenApi.Identifier, "AdminController_listAudit"),
  )
  .annotate(HttpApi.PayloadParseOptions, { onExcessProperty: "error" }) {}
