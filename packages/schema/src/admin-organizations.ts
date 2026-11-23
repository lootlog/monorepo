import { Schema } from "effect";
import { DiscordGuildSyncStatus } from "./discord.js";
import {
  DateTimeString,
  NonNegativeSafeInteger,
  PageSize,
} from "./http-scalars.js";
import { CapabilitySchema } from "./permissions.js";
import { AdminOrganizationEntitlement } from "./plans.js";

export const ADMIN_ORGANIZATION_STATUSES = [
  "active",
  "suspended",
  "inactive",
] as const;

export const AdminOrganizationStatus = Schema.Literals(
  ADMIN_ORGANIZATION_STATUSES,
);

export type AdminOrganizationStatus = typeof AdminOrganizationStatus.Type;

export const ADMIN_ORGANIZATION_SORTS = [
  "created",
  "members",
  "activity",
] as const;

export const AdminOrganizationSort = Schema.Literals(ADMIN_ORGANIZATION_SORTS);

export type AdminOrganizationSort = typeof AdminOrganizationSort.Type;

export const SuspensionReason = Schema.Trim.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(500),
);

export const AdminOrganizationsSearch = Schema.Struct({
  search: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(100))),
  status: Schema.optionalKey(AdminOrganizationStatus),
  syncStatus: Schema.optionalKey(DiscordGuildSyncStatus),
  missingPermissions: Schema.optionalKey(Schema.Boolean),
  sort: Schema.optionalKey(AdminOrganizationSort),
  limit: PageSize,
  offset: NonNegativeSafeInteger,
});

export type AdminOrganizationsSearch = typeof AdminOrganizationsSearch.Type;

const AdminOrganizationOwner = Schema.Struct({
  discordId: Schema.String,
  name: Schema.NullOr(Schema.String),
  userId: Schema.NullOr(Schema.String),
});

export const AdminOrganization = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  icon: Schema.NullOr(Schema.String),
  vanityUrl: Schema.NullOr(Schema.String),
  owner: AdminOrganizationOwner,
  status: AdminOrganizationStatus,
  activeMembers: NonNegativeSafeInteger,
  lastLootAt: Schema.NullOr(DateTimeString),
  syncStatus: Schema.NullOr(DiscordGuildSyncStatus),
  hasRequiredPermissions: Schema.Boolean,
  createdAt: DateTimeString,
});

export type AdminOrganization = typeof AdminOrganization.Type;

export const AdminOrganizationsPage = Schema.Struct({
  organizations: Schema.Array(AdminOrganization),
  total: NonNegativeSafeInteger,
});

export type AdminOrganizationsPage = typeof AdminOrganizationsPage.Type;

export const AdminOrganizationsOverview = Schema.Struct({
  total: NonNegativeSafeInteger,
  active: NonNegativeSafeInteger,
  suspended: NonNegativeSafeInteger,
  activeLastWeek: NonNegativeSafeInteger,
  syncFailing: NonNegativeSafeInteger,
});

export type AdminOrganizationsOverview = typeof AdminOrganizationsOverview.Type;

const AdminOrganizationRole = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  color: Schema.NullOr(Schema.Int),
  position: Schema.NullOr(Schema.Int),
  permissions: Schema.Array(CapabilitySchema),
  levelFrom: Schema.NullOr(Schema.Int),
  levelTo: Schema.NullOr(Schema.Int),
  members: NonNegativeSafeInteger,
});

const AdminOrganizationDiscord = Schema.Struct({
  status: DiscordGuildSyncStatus,
  hasRequiredPermissions: Schema.Boolean,
  missingPermissions: Schema.Array(Schema.String),
  channelCount: NonNegativeSafeInteger,
  selectableChannelCount: NonNegativeSafeInteger,
  lastAttemptAt: Schema.NullOr(DateTimeString),
  lastSuccessAt: Schema.NullOr(DateTimeString),
  lastError: Schema.NullOr(Schema.String),
});

const AdminOrganizationNotifications = Schema.Struct({
  pending: NonNegativeSafeInteger,
  failed: NonNegativeSafeInteger,
  blocked: NonNegativeSafeInteger,
  lastError: Schema.NullOr(Schema.String),
});

const ORGANIZATION_OPERATOR_ACTIONS = [
  "limits.set",
  "vanity-url.clear",
  "discord-sync.refresh",
  "suspend",
  "resume",
] as const;

export const OrganizationOperatorAction = Schema.Literals(
  ORGANIZATION_OPERATOR_ACTIONS,
);

export type OrganizationOperatorAction = typeof OrganizationOperatorAction.Type;

export const OrganizationAuditDetails = Schema.Record(
  Schema.String,
  Schema.Json,
);

export type OrganizationAuditDetails = typeof OrganizationAuditDetails.Type;

export const OrganizationAuditEntry = Schema.Struct({
  id: Schema.String,
  organizationId: Schema.String,
  organizationName: Schema.String,
  actor: Schema.String,
  action: OrganizationOperatorAction,
  details: Schema.NullOr(OrganizationAuditDetails),
  createdAt: DateTimeString,
});

export type OrganizationAuditEntry = typeof OrganizationAuditEntry.Type;

export const OrganizationAuditPage = Schema.Struct({
  entries: Schema.Array(OrganizationAuditEntry),
  total: NonNegativeSafeInteger,
});

export const AdminOrganizationDetails = Schema.Struct({
  organization: AdminOrganization,
  banner: Schema.NullOr(Schema.String),
  suspension: Schema.NullOr(
    Schema.Struct({
      at: DateTimeString,
      reason: Schema.String,
      by: Schema.NullOr(Schema.String),
    }),
  ),
  entitlement: AdminOrganizationEntitlement,
  publicStatsCardEnabled: Schema.Boolean,
  usage: Schema.Struct({
    inactiveMembers: NonNegativeSafeInteger,
    documents: NonNegativeSafeInteger,
    notificationRules: NonNegativeSafeInteger,
    lootsLastMonth: NonNegativeSafeInteger,
  }),
  discord: Schema.NullOr(AdminOrganizationDiscord),
  notifications: AdminOrganizationNotifications,
  roles: Schema.Array(AdminOrganizationRole),
  audit: Schema.Array(OrganizationAuditEntry),
});

export type AdminOrganizationDetails = typeof AdminOrganizationDetails.Type;

const ORGANIZATION_MEMBER_TYPES = ["OWNER", "ADMIN", "USER", "BOT"] as const;

export const AdminOrganizationMembersSearch = Schema.Struct({
  guildId: Schema.NonEmptyString,
  search: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(100))),
  limit: PageSize,
  offset: NonNegativeSafeInteger,
});

export type AdminOrganizationMembersSearch =
  typeof AdminOrganizationMembersSearch.Type;

const AdminOrganizationMember = Schema.Struct({
  id: NonNegativeSafeInteger,
  name: Schema.String,
  username: Schema.NullOr(Schema.String),
  discordId: Schema.String,
  userId: Schema.NullOr(Schema.String),
  type: Schema.Literals(ORGANIZATION_MEMBER_TYPES),
  active: Schema.Boolean,
  joinedAt: Schema.NullOr(DateTimeString),
  lastDiscordSyncAt: Schema.NullOr(DateTimeString),
});

export const AdminOrganizationMembersPage = Schema.Struct({
  members: Schema.Array(AdminOrganizationMember),
  total: NonNegativeSafeInteger,
});

export type AdminOrganizationMembersPage =
  typeof AdminOrganizationMembersPage.Type;

export const AdminUserOrganization = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  icon: Schema.NullOr(Schema.String),
  status: AdminOrganizationStatus,
  memberType: Schema.Literals(ORGANIZATION_MEMBER_TYPES),
  memberActive: Schema.Boolean,
});

export type AdminUserOrganization = typeof AdminUserOrganization.Type;
