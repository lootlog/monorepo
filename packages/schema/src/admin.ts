import { Schema } from "effect";
import {
  DateTimeString,
  NonNegativeSafeInteger,
  PageSize,
} from "./http-scalars.js";
import { PlatformRole } from "./platform-roles.js";

export const AdminOperator = Schema.Struct({
  userId: Schema.String,
  name: Schema.String,
});

export type AdminOperator = typeof AdminOperator.Type;

export const AdminUser = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  email: Schema.String,
  image: Schema.NullOr(Schema.String),
  discordId: Schema.String,
  createdAt: DateTimeString,
  roles: Schema.Array(PlatformRole),
  ban: Schema.NullOr(
    Schema.Struct({
      reason: Schema.NullOr(Schema.String),
      expiresAt: Schema.NullOr(DateTimeString),
    }),
  ),
  activeSessions: NonNegativeSafeInteger,
});

export type AdminUser = typeof AdminUser.Type;

const AdminSession = Schema.Struct({
  id: Schema.String,
  createdAt: DateTimeString,
  updatedAt: DateTimeString,
  expiresAt: DateTimeString,
  ipAddress: Schema.NullOr(Schema.String),
  userAgent: Schema.NullOr(Schema.String),
});

export type AdminSession = typeof AdminSession.Type;

const AdminApiKey = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  start: Schema.NullOr(Schema.String),
  enabled: Schema.Boolean,
  createdAt: DateTimeString,
  expiresAt: Schema.NullOr(DateTimeString),
});

export type AdminApiKey = typeof AdminApiKey.Type;

const ADMIN_AUDIT_ACTIONS = [
  "roles.set",
  "ban.set",
  "ban.lift",
  "sessions.revoke",
  "session.revoke",
  "api-key.revoke",
] as const;

export type AdminAuditAction = (typeof ADMIN_AUDIT_ACTIONS)[number];

export type AdminAuditDetails = Readonly<Record<string, Schema.Json>>;

const AdminAuditEntry = Schema.Struct({
  id: Schema.String,
  actor: Schema.String,
  action: Schema.Literals(ADMIN_AUDIT_ACTIONS),
  targetUserId: Schema.NullOr(Schema.String),
  targetName: Schema.NullOr(Schema.String),
  details: Schema.NullOr(Schema.Record(Schema.String, Schema.Json)),
  createdAt: DateTimeString,
});

export type AdminAuditEntry = typeof AdminAuditEntry.Type;

const UserIds = Schema.Array(
  Schema.NonEmptyString.check(Schema.isMaxLength(100)),
).check(Schema.isMaxLength(20_000));

export const AdminUsersSearch = Schema.Struct({
  search: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(100))),
  role: Schema.optionalKey(PlatformRole),
  banned: Schema.optionalKey(Schema.Boolean),
  userIds: Schema.optionalKey(UserIds),
  excludedUserIds: Schema.optionalKey(UserIds),
  limit: Schema.optionalKey(PageSize),
  offset: Schema.optionalKey(NonNegativeSafeInteger),
});

export type AdminUsersSearch = typeof AdminUsersSearch.Type;

export const AdminUsersPage = Schema.Struct({
  users: Schema.Array(AdminUser),
  total: NonNegativeSafeInteger,
});

export type AdminUsersPage = typeof AdminUsersPage.Type;

export const AdminUserDetails = Schema.Struct({
  user: AdminUser,
  sessions: Schema.Array(AdminSession),
  apiKeys: Schema.Array(AdminApiKey),
  audit: Schema.Array(AdminAuditEntry),
});

export const AdminUserBan = Schema.Struct({
  reason: Schema.Trim.check(Schema.isMinLength(1), Schema.isMaxLength(500)),
  expiresAt: Schema.NullOr(DateTimeString),
});

export type AdminUserBan = typeof AdminUserBan.Type;

export const AdminAuditPageRequest = Schema.Struct({
  limit: Schema.optionalKey(PageSize),
  offset: Schema.optionalKey(NonNegativeSafeInteger),
});

export const AdminAuditPage = Schema.Struct({
  entries: Schema.Array(AdminAuditEntry),
  total: NonNegativeSafeInteger,
});

export const AdminOverview = Schema.Struct({
  users: NonNegativeSafeInteger,
  banned: NonNegativeSafeInteger,
  activeSessions: NonNegativeSafeInteger,
  roles: Schema.Array(
    Schema.Struct({ role: PlatformRole, users: NonNegativeSafeInteger }),
  ),
});

export type AdminOverview = typeof AdminOverview.Type;
