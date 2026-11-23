import { Capability } from "@lootlog/schema/permissions";
import type { AccessPolicy } from "@lootlog/domain/access-policy";

export const canManageEvent = (accessPolicy: AccessPolicy | undefined) =>
  Boolean(
    accessPolicy?.allows(Capability.LOOTLOG_MANAGE) ||
    accessPolicy?.allows(Capability.LOOTLOG_EVENTS_MANAGE) ||
    accessPolicy?.allows(Capability.ADMIN) ||
    accessPolicy?.allows(Capability.OWNER),
  );
