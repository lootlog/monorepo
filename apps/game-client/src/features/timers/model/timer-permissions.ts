import type { AccessPolicy } from "@lootlog/domain/access-policy";
import { Permission } from "@lootlog/schema/permissions";

export const REQUIRED_DELETE_PERMISSIONS = [
  Permission.LOOTLOG_MANAGE,
  Permission.OWNER,
  Permission.ADMIN,
  Permission.LOOTLOG_TIMERS_DELETE,
];

export const REQUIRED_RESET_PERMISSIONS = [
  Permission.LOOTLOG_MANAGE,
  Permission.OWNER,
  Permission.ADMIN,
  Permission.LOOTLOG_TIMERS_RESET,
];

export const canDeleteTimer = (policy: AccessPolicy | undefined) =>
  policy?.allowsAny(REQUIRED_DELETE_PERMISSIONS) ?? false;

export const canResetTimer = (policy: AccessPolicy | undefined) =>
  policy?.allowsAny(REQUIRED_RESET_PERMISSIONS) ?? false;
