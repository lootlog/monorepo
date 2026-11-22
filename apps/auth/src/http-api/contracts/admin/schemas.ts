import {
  DateTimeString,
  NonNegativeSafeInteger,
  PageSize,
} from "@lootlog/schema/http-scalars";
import { PlatformRole } from "@lootlog/schema/platform-roles";
import { Schema } from "effect";
import { ADMIN_AUDIT_ACTIONS } from "#src/admin/audit";

export const AdminHeaders = Schema.Struct({
  authorization: Schema.optionalKey(Schema.String),
  cookie: Schema.optionalKey(Schema.String),
});

export const AdminOperator = Schema.Struct({
  userId: Schema.String,
  name: Schema.String,
}).annotate({ identifier: "AdminOperator" });

const AdminUserBan = Schema.Struct({
  reason: Schema.NullOr(Schema.String),
  expiresAt: Schema.NullOr(DateTimeString),
}).annotate({ identifier: "AdminUserBan" });

export const AdminUser = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  email: Schema.String,
  image: Schema.NullOr(Schema.String),
  discordId: Schema.String,
  createdAt: DateTimeString,
  roles: Schema.Array(PlatformRole),
  ban: Schema.NullOr(AdminUserBan),
  activeSessions: NonNegativeSafeInteger,
}).annotate({ identifier: "AdminUser" });

export type AdminUser = typeof AdminUser.Type;

const AdminSession = Schema.Struct({
  id: Schema.String,
  createdAt: DateTimeString,
  updatedAt: DateTimeString,
  expiresAt: DateTimeString,
  ipAddress: Schema.NullOr(Schema.String),
  userAgent: Schema.NullOr(Schema.String),
}).annotate({ identifier: "AdminSession" });

const AdminApiKey = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  start: Schema.NullOr(Schema.String),
  enabled: Schema.Boolean,
  createdAt: DateTimeString,
  expiresAt: Schema.NullOr(DateTimeString),
}).annotate({ identifier: "AdminApiKey" });

const AdminAuditAction = Schema.Literals(ADMIN_AUDIT_ACTIONS);

export const AdminAuditEntry = Schema.Struct({
  id: Schema.String,
  actor: Schema.String,
  action: AdminAuditAction,
  targetUserId: Schema.NullOr(Schema.String),
  targetName: Schema.NullOr(Schema.String),
  details: Schema.NullOr(Schema.Record(Schema.String, Schema.Json)),
  createdAt: DateTimeString,
}).annotate({ identifier: "AdminAuditEntry" });

export type AdminAuditEntry = typeof AdminAuditEntry.Type;

export const AdminUserParams = Schema.Struct({ id: Schema.NonEmptyString });

export const AdminUsersQuery = Schema.Struct({
  search: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(100))),
  role: Schema.optionalKey(PlatformRole),
  banned: Schema.optionalKey(Schema.Boolean),
  limit: Schema.optionalKey(PageSize.annotate({ default: 25 })),
  offset: Schema.optionalKey(NonNegativeSafeInteger.annotate({ default: 0 })),
});

export type AdminUsersQuery = typeof AdminUsersQuery.Type;

export const AdminUsersResponse = Schema.Struct({
  users: Schema.Array(AdminUser),
  total: NonNegativeSafeInteger,
}).annotate({ identifier: "AdminUsersResponse" });

export const AdminUserDetails = Schema.Struct({
  user: AdminUser,
  sessions: Schema.Array(AdminSession),
  apiKeys: Schema.Array(AdminApiKey),
  audit: Schema.Array(AdminAuditEntry),
}).annotate({ identifier: "AdminUserDetails" });

export const AdminUserResponse = Schema.Struct({ user: AdminUser }).annotate({
  identifier: "AdminUserResponse",
});

export const SetAdminUserRoles = Schema.Struct({
  roles: Schema.Array(PlatformRole),
}).annotate({ identifier: "SetAdminUserRoles" });

export const BanAdminUser = Schema.Struct({
  reason: Schema.Trim.check(Schema.isMinLength(1), Schema.isMaxLength(500)),
  expiresAt: Schema.NullOr(DateTimeString),
}).annotate({ identifier: "BanAdminUser" });

export type BanAdminUser = typeof BanAdminUser.Type;

export const AdminAuditQuery = Schema.Struct({
  limit: Schema.optionalKey(PageSize.annotate({ default: 50 })),
  offset: Schema.optionalKey(NonNegativeSafeInteger.annotate({ default: 0 })),
});

export const AdminAuditResponse = Schema.Struct({
  entries: Schema.Array(AdminAuditEntry),
  total: NonNegativeSafeInteger,
}).annotate({ identifier: "AdminAuditResponse" });

export const AdminOverview = Schema.Struct({
  users: NonNegativeSafeInteger,
  banned: NonNegativeSafeInteger,
  activeSessions: NonNegativeSafeInteger,
  roles: Schema.Array(
    Schema.Struct({ role: PlatformRole, users: NonNegativeSafeInteger }),
  ),
}).annotate({ identifier: "AdminOverview" });
