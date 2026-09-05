import { Permission } from "@lootlog/schema/permissions";
import type { AccessPolicy } from "@lootlog/domain/access-policy";

export const canManageEvent = (accessPolicy: AccessPolicy | undefined) =>
  Boolean(
    accessPolicy?.allows(Permission.LOOTLOG_MANAGE) ||
    accessPolicy?.allows(Permission.LOOTLOG_EVENTS_MANAGE) ||
    accessPolicy?.allows(Permission.ADMIN) ||
    accessPolicy?.allows(Permission.OWNER),
  );
